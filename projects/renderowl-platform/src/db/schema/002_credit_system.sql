-- ============================================================================
-- Credit System Database Schema
-- ============================================================================
-- Phase 2: Credit Deduction + Automation Features
-- 
-- This migration adds:
-- - credit_transactions table for audit trail
-- - Credits columns to users table
-- - Indexes for efficient queries
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Credit Transactions Table
-- ----------------------------------------------------------------------------

CREATE TABLE credit_transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Transaction details
    type VARCHAR(32) NOT NULL CHECK (type IN (
        'purchase',
        'deduction',
        'refund',
        'bonus',
        'adjustment',
        'subscription_grant'
    )),
    amount INTEGER NOT NULL, -- Positive for credits added, negative for deducted
    balance_after INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'completed',
        'failed',
        'reversed'
    )),
    
    -- Related entities (nullable depending on transaction type)
    job_id UUID REFERENCES render_jobs(id) ON DELETE SET NULL,
    automation_id UUID REFERENCES automations(id) ON DELETE SET NULL,
    original_transaction_id VARCHAR(64) REFERENCES credit_transactions(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT positive_amount_for_refund_bonus 
        CHECK (
            (type IN ('refund', 'bonus', 'purchase', 'subscription_grant') AND amount >= 0) OR
            (type IN ('deduction') AND amount <= 0) OR
            (type = 'adjustment')
        )
);

-- Indexes for efficient queries
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_org_id ON credit_transactions(organization_id);
CREATE INDEX idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX idx_credit_transactions_status ON credit_transactions(status);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_job_id ON credit_transactions(job_id);
CREATE INDEX idx_credit_transactions_original_id ON credit_transactions(original_transaction_id);

-- Composite index for common query: user's transactions by type
CREATE INDEX idx_credit_transactions_user_type_created 
    ON credit_transactions(user_id, type, created_at DESC);

-- ----------------------------------------------------------------------------
-- Add Credit Columns to Users Table
-- ----------------------------------------------------------------------------

ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(32) NOT NULL DEFAULT 'trial' 
        CHECK (plan_tier IN ('trial', 'starter', 'creator', 'pro', 'enterprise')),
    ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(32) NOT NULL DEFAULT 'inactive'
        CHECK (subscription_status IN ('inactive', 'active', 'past_due', 'canceled'));

-- Index for credit balance lookups
CREATE INDEX idx_users_credits_balance ON users(credits_balance) WHERE credits_balance > 0;
CREATE INDEX idx_users_trial_expires ON users(trial_expires_at) WHERE trial_expires_at IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Add Credit Tracking to Render Jobs
-- ----------------------------------------------------------------------------

ALTER TABLE render_jobs
    ADD COLUMN IF NOT EXISTS credits_deducted INTEGER,
    ADD COLUMN IF NOT EXISTS credit_transaction_id VARCHAR(64) REFERENCES credit_transactions(id);

CREATE INDEX idx_render_jobs_credit_txn ON render_jobs(credit_transaction_id);

-- ----------------------------------------------------------------------------
-- Add Credit Tracking to Automation Runs
-- ----------------------------------------------------------------------------

ALTER TABLE automation_runs
    ADD COLUMN IF NOT EXISTS credits_deducted INTEGER,
    ADD COLUMN IF NOT EXISTS credit_transaction_id VARCHAR(64) REFERENCES credit_transactions(id);

-- ----------------------------------------------------------------------------
-- Views for Common Queries
-- ----------------------------------------------------------------------------

-- User credit summary view
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT 
    u.id AS user_id,
    u.organization_id,
    u.credits_balance AS available,
    COALESCE(SUM(CASE WHEN ct.status = 'pending' THEN ABS(ct.amount) ELSE 0 END), 0) AS pending_deductions,
    COALESCE(SUM(CASE WHEN ct.type IN ('purchase', 'bonus', 'subscription_grant') AND ct.status = 'completed' THEN ct.amount ELSE 0 END), 0) AS total_purchased,
    COALESCE(SUM(CASE WHEN ct.type = 'deduction' AND ct.status = 'completed' THEN ABS(ct.amount) ELSE 0 END), 0) AS total_spent,
    COALESCE(SUM(CASE WHEN ct.type = 'refund' AND ct.status = 'completed' THEN ct.amount ELSE 0 END), 0) AS total_refunded
FROM users u
LEFT JOIN credit_transactions ct ON u.id = ct.user_id
GROUP BY u.id, u.organization_id, u.credits_balance;

-- Monthly credit usage view (for reporting)
CREATE OR REPLACE VIEW monthly_credit_usage AS
SELECT 
    organization_id,
    DATE_TRUNC('month', created_at) AS month,
    type,
    COUNT(*) AS transaction_count,
    SUM(ABS(amount)) AS total_amount
FROM credit_transactions
WHERE status = 'completed'
GROUP BY organization_id, DATE_TRUNC('month', created_at), type;

-- ----------------------------------------------------------------------------
-- Functions for Atomic Operations
-- ----------------------------------------------------------------------------

-- Function to get user balance with locking (for atomic operations)
CREATE OR REPLACE FUNCTION get_user_balance_for_update(user_uuid UUID)
RETURNS TABLE (
    user_id UUID,
    organization_id UUID,
    credits_balance INTEGER,
    plan_tier VARCHAR(32)
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.organization_id, u.credits_balance, u.plan_tier
    FROM users u
    WHERE u.id = user_uuid
    FOR UPDATE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a transaction exists and is refundable
CREATE OR REPLACE FUNCTION is_transaction_refundable(txn_id VARCHAR(64))
RETURNS BOOLEAN AS $$
DECLARE
    txn_type VARCHAR(32);
    existing_refund INTEGER;
BEGIN
    -- Get transaction type
    SELECT type INTO txn_type
    FROM credit_transactions
    WHERE id = txn_id;
    
    IF txn_type IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Must be a deduction to refund
    IF txn_type != 'deduction' THEN
        RETURN FALSE;
    END IF;
    
    -- Check if already refunded
    SELECT COUNT(*) INTO existing_refund
    FROM credit_transactions
    WHERE original_transaction_id = txn_id AND type = 'refund';
    
    RETURN existing_refund = 0;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Triggers for Audit Logging
-- ----------------------------------------------------------------------------

-- Trigger to update completed_at timestamp
CREATE OR REPLACE FUNCTION update_transaction_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transaction_completed
    BEFORE UPDATE ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_transaction_completed_at();

-- ----------------------------------------------------------------------------
-- Row Level Security (if enabled)
-- ----------------------------------------------------------------------------

-- Enable RLS on credit_transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own transactions
CREATE POLICY credit_transactions_user_isolation ON credit_transactions
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id')::UUID);

-- Policy: Organizations can see all their users' transactions
CREATE POLICY credit_transactions_org_isolation ON credit_transactions
    FOR SELECT
    USING (organization_id = current_setting('app.current_org_id')::UUID);

-- ----------------------------------------------------------------------------
-- Comments for Documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE credit_transactions IS 'Audit trail of all credit operations';
COMMENT ON COLUMN credit_transactions.amount IS 'Positive for credits added, negative for deducted';
COMMENT ON COLUMN credit_transactions.balance_after IS 'User balance after this transaction';
COMMENT ON COLUMN credit_transactions.original_transaction_id IS 'For refunds: references the original deduction';

COMMENT ON COLUMN users.credits_balance IS 'Current available credit balance';
COMMENT ON COLUMN users.plan_tier IS 'Subscription tier: trial, starter, creator, pro, enterprise';

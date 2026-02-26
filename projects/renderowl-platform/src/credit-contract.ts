import {z} from 'zod';

// ============================================================================
// Credit System Schemas — Renderowl Platform
// ============================================================================
// Extension to platform-contract.ts for credit-related types
//
// Phase 2: Credit Deduction + Automation Features
// ============================================================================

// ----------------------------------------------------------------------------
// Credit Balance & Transactions
// ----------------------------------------------------------------------------

export const CreditTransactionTypeSchema = z.enum([
  'purchase',           // Bought credits via Stripe
  'deduction',          // Deducted for render job
  'refund',             // Refunded due to failure
  'bonus',              // Promotional credits
  'adjustment',         // Manual admin adjustment
  'subscription_grant', // Monthly credit grant from subscription
]);

export const CreditTransactionStatusSchema = z.enum([
  'pending',    // Awaiting confirmation (e.g., Stripe webhook)
  'completed',  // Successfully processed
  'failed',     // Processing failed
  'reversed',   // Transaction reversed (e.g., chargeback)
]);

export const CreditTransactionSchema = z.object({
  id: z.string().regex(/^ctx_[a-zA-Z0-9]+$/),
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  type: CreditTransactionTypeSchema,
  amount: z.number().int(), // Positive for credits added, negative for deducted
  balanceAfter: z.number().int(),
  status: CreditTransactionStatusSchema,
  
  // Related entities
  jobId: z.string().uuid().optional(),      // For deductions/refunds
  automationId: z.string().uuid().optional(), // For scheduled jobs
  stripePaymentIntentId: z.string().optional(), // For purchases
  
  // Metadata
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export const CreditBalanceSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  available: z.number().int().min(0),
  pendingDeductions: z.number().int().min(0).default(0),
  totalLifetime: z.number().int().min(0), // Total credits ever purchased/granted
  
  // Tier info
  planTier: z.enum(['trial', 'starter', 'creator', 'pro', 'enterprise']),
  trialExpiresAt: z.string().datetime().optional(),
  
  updatedAt: z.string().datetime(),
});

// ----------------------------------------------------------------------------
// Credit Cost Calculation
// ----------------------------------------------------------------------------

export const RenderCostSchema = z.object({
  baseCost: z.number().int().min(0),
  sceneCount: z.number().int().min(0),
  perSceneCost: z.number().int().min(0),
  qualityMultiplier: z.number().min(0.5).max(3),
  
  // Breakdown
  computeSeconds: z.number().min(0).optional(),
  estimatedDuration: z.number().min(0).optional(), // seconds
  
  // Total
  totalCost: z.number().int().min(0),
});

// Cost configuration by tier
export const CREDIT_COSTS = {
  // Scene counts and base costs
  perScene: 1, // 1 credit per scene
  baseRender: 5, // Base cost for any render
  
  // Quality multipliers
  quality: {
    low: 0.8,
    medium: 1.0,
    high: 1.3,
    ultra: 2.0,
  },
  
  // Duration estimates (for display purposes)
  durationEstimate: {
    perSceneSeconds: 5, // Average 5 seconds per scene
  },
} as const;

// ----------------------------------------------------------------------------
// Credit API Request/Response Schemas
// ----------------------------------------------------------------------------

export const GetCreditBalanceResponseSchema = z.object({
  balance: CreditBalanceSchema,
});

export const GetCreditTransactionsQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(), // Pagination cursor
  type: CreditTransactionTypeSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const GetCreditTransactionsResponseSchema = z.object({
  transactions: z.array(CreditTransactionSchema),
  pagination: z.object({
    hasMore: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});

export const PurchaseCreditsRequestSchema = z.object({
  amount: z.number().int().min(100).max(100000), // Min 100 credits
  paymentMethodId: z.string().optional(), // Stripe payment method
  returnUrl: z.string().url().optional(), // For redirect-based flows
});

export const PurchaseCreditsResponseSchema = z.object({
  transactionId: z.string(),
  clientSecret: z.string().optional(), // Stripe client secret for 3DS
  status: z.enum(['requires_action', 'processing', 'completed']),
  amount: z.number().int(),
});

// ----------------------------------------------------------------------------
// Internal Credit Operations (for Automations/Queue)
// ----------------------------------------------------------------------------

export const DeductCreditsRequestSchema = z.object({
  userId: z.string().uuid(),
  organizationId: z.string().uuid(),
  amount: z.number().int().positive(),
  jobId: z.string().uuid(),
  jobType: z.enum(['render', 'automation']),
  description: z.string().optional(),
});

export const DeductCreditsResponseSchema = z.object({
  success: z.boolean(),
  transactionId: z.string().optional(),
  newBalance: z.number().int().optional(),
  error: z.object({
    code: z.enum(['insufficient_credits', 'user_not_found', 'transaction_error']),
    message: z.string(),
  }).optional(),
});

export const RefundCreditsRequestSchema = z.object({
  originalTransactionId: z.string(),
  reason: z.enum(['job_failed', 'job_cancelled', 'dispute', 'admin_adjustment']),
  description: z.string().optional(),
});

export const RefundCreditsResponseSchema = z.object({
  success: z.boolean(),
  refundTransactionId: z.string().optional(),
  newBalance: z.number().int().optional(),
  error: z.object({
    code: z.enum(['transaction_not_found', 'already_refunded', 'refund_error']),
    message: z.string(),
  }).optional(),
});

// ----------------------------------------------------------------------------
// Type Exports
// ----------------------------------------------------------------------------

export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;
export type CreditTransactionType = z.infer<typeof CreditTransactionTypeSchema>;
export type CreditTransactionStatus = z.infer<typeof CreditTransactionStatusSchema>;
export type CreditBalance = z.infer<typeof CreditBalanceSchema>;
export type RenderCost = z.infer<typeof RenderCostSchema>;

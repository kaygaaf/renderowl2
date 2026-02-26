/**
 * Credit API Routes
 * 
 * Phase 2: Credit Deduction + Automation Features
 * 
 * Endpoints for credit management:
 * - GET /v1/credits/balance — Get current balance
 * - GET /v1/credits/transactions — List transaction history
 * - POST /v1/credits/purchase — Purchase credits (initiates Stripe flow)
 * - POST /v1/internal/credits/refund — Admin/Internal refund endpoint
 * 
 * These endpoints should be mounted by the Product/API team.
 * They depend on the CreditService from ../services/credit.ts
 */

import {Router, Request, Response} from 'express';
import {Pool} from 'pg';
import {z} from 'zod';
import {CreditService} from '../services/credit';
import {
  GetCreditTransactionsQuerySchema,
  PurchaseCreditsRequestSchema,
} from '../credit-contract';

// ============================================================================
// Request Schemas
// ============================================================================

const RefundCreditsRequestSchema = z.object({
  originalTransactionId: z.string(),
  reason: z.enum(['job_failed', 'job_cancelled', 'dispute', 'admin_adjustment']),
  description: z.string().optional(),
});

// ============================================================================
// Route Factory
// ============================================================================

export interface CreditRoutesConfig {
  pool: Pool;
  creditService: CreditService;
  stripeClient?: any; // Stripe client for purchases
}

export function createCreditRoutes(config: CreditRoutesConfig): Router {
  const router = Router();

  // ============================================================================
  // Public Endpoints (require authentication)
  // ============================================================================

  /**
   * GET /v1/credits/balance
   * 
   * Returns the current credit balance for the authenticated user.
   * Includes available balance, pending deductions, and plan tier info.
   */
  router.get('/balance', async (req: Request, res: Response) => {
    try {
      // These should be set by auth middleware
      const userId = req.user?.id;
      const organizationId = req.user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          error: {
            code: 'authentication_error',
            message: 'Authentication required',
          },
        });
      }

      const balance = await config.creditService.getBalance(userId, organizationId);

      return res.json({
        balance: {
          available: balance.available,
          pendingDeductions: balance.pendingDeductions,
          totalLifetime: balance.totalLifetime,
          planTier: balance.planTier,
          trialExpiresAt: balance.trialExpiresAt,
        },
      });
    } catch (error) {
      console.error('[CreditRoutes] Error getting balance:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve credit balance',
        },
      });
    }
  });

  /**
   * GET /v1/credits/transactions
   * 
   * Returns paginated transaction history for the authenticated user.
   * Supports filtering by type and date range.
   */
  router.get('/transactions', async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      const organizationId = req.user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          error: {
            code: 'authentication_error',
            message: 'Authentication required',
          },
        });
      }

      // Parse and validate query params
      const queryResult = GetCreditTransactionsQuerySchema.safeParse({
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        cursor: req.query.cursor,
        type: req.query.type,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      });

      if (!queryResult.success) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Invalid query parameters',
            details: queryResult.error.errors,
          },
        });
      }

      const {transactions, hasMore, nextCursor} = await config.creditService.getTransactions({
        userId,
        organizationId,
        ...queryResult.data,
      });

      return res.json({
        transactions: transactions.map((t) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          balanceAfter: t.balanceAfter,
          status: t.status,
          description: t.description,
          metadata: t.metadata,
          createdAt: t.createdAt,
        })),
        pagination: {
          hasMore,
          nextCursor,
        },
      });
    } catch (error) {
      console.error('[CreditRoutes] Error getting transactions:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to retrieve transactions',
        },
      });
    }
  });

  /**
   * POST /v1/credits/purchase
   * 
   * Initiates a credit purchase via Stripe.
   * Returns a client secret for the frontend to complete the payment.
   * 
   * NOTE: This requires Stripe configuration. If Stripe is not configured,
   * this endpoint returns a 503 Service Unavailable.
   */
  router.post('/purchase', async (req: Request, res: Response) => {
    try {
      if (!config.stripeClient) {
        return res.status(503).json({
          error: {
            code: 'service_unavailable',
            message: 'Credit purchasing is not configured',
          },
        });
      }

      const userId = req.user?.id;
      const organizationId = req.user?.organizationId;

      if (!userId || !organizationId) {
        return res.status(401).json({
          error: {
            code: 'authentication_error',
            message: 'Authentication required',
          },
        });
      }

      const bodyResult = PurchaseCreditsRequestSchema.safeParse(req.body);

      if (!bodyResult.success) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Invalid request body',
            details: bodyResult.error.errors,
          },
        });
      }

      const {amount, paymentMethodId, returnUrl} = bodyResult.data;

      // TODO: Implement Stripe payment intent creation
      // This is a placeholder that Product/API team should implement
      
      // Example implementation:
      // const paymentIntent = await config.stripeClient.paymentIntents.create({
      //   amount: calculatePriceInCents(amount),
      //   currency: 'eur',
      //   customer: await getOrCreateStripeCustomer(userId),
      //   payment_method: paymentMethodId,
      //   confirm: !!paymentMethodId,
      //   return_url: returnUrl,
      // });

      // await createPendingCreditTransaction(userId, amount, paymentIntent.id);

      return res.status(501).json({
        error: {
          code: 'not_implemented',
          message: 'Stripe integration pending. Contact Product/API team.',
        },
      });
    } catch (error) {
      console.error('[CreditRoutes] Error processing purchase:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to process purchase',
        },
      });
    }
  });

  // ============================================================================
  // Internal/Admin Endpoints
  // ============================================================================

  /**
   * POST /v1/internal/credits/refund
   * 
   * Internal endpoint for refunding credits.
   * Used by:
   * - Queue workers when jobs fail
   * - Admin panel for dispute resolution
   * - Automation system when runs fail
   * 
   * Requires internal API key or admin role.
   */
  router.post('/internal/refund', async (req: Request, res: Response) => {
    try {
      // TODO: Add internal API key validation
      // const apiKey = req.headers['x-internal-api-key'];
      // if (!validateInternalApiKey(apiKey)) {
      //   return res.status(401).json({ error: { code: 'unauthorized', message: 'Invalid API key' } });
      // }

      const bodyResult = RefundCreditsRequestSchema.safeParse(req.body);

      if (!bodyResult.success) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Invalid request body',
            details: bodyResult.error.errors,
          },
        });
      }

      const {originalTransactionId, reason, description} = bodyResult.data;

      const result = await config.creditService.refundCredits({
        originalTransactionId,
        reason,
        description,
      });

      if (!result.success) {
        return res.status(400).json({
          error: {
            code: result.error?.code || 'refund_failed',
            message: result.error?.message || 'Refund failed',
          },
        });
      }

      return res.json({
        success: true,
        refundTransactionId: result.refundTransactionId,
        newBalance: result.newBalance,
      });
    } catch (error) {
      console.error('[CreditRoutes] Error processing refund:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to process refund',
        },
      });
    }
  });

  /**
   * POST /v1/internal/credits/grant
   * 
   * Admin endpoint to grant credits to a user.
   * For promotional credits, support adjustments, etc.
   * 
   * Requires admin role.
   */
  router.post('/internal/grant', async (req: Request, res: Response) => {
    try {
      // TODO: Add admin role validation

      const schema = z.object({
        userId: z.string().uuid(),
        amount: z.number().int().positive(),
        description: z.string().optional(),
      });

      const bodyResult = schema.safeParse(req.body);

      if (!bodyResult.success) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Invalid request body',
            details: bodyResult.error.errors,
          },
        });
      }

      // TODO: Implement credit granting
      // This would create a 'bonus' or 'adjustment' transaction

      return res.status(501).json({
        error: {
          code: 'not_implemented',
          message: 'Credit granting not yet implemented',
        },
      });
    } catch (error) {
      console.error('[CreditRoutes] Error granting credits:', error);
      return res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Failed to grant credits',
        },
      });
    }
  });

  return router;
}

// ============================================================================
// Type Augmentation for Express Request
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        organizationId: string;
        email?: string;
        role?: string;
      };
    }
  }
}

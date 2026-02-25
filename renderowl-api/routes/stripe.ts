import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import {
  BuyCreditsRequestSchema,
  BuyCreditsResponseSchema,
} from '../schemas.js';
import { getUserById, updateUserStripeInfo } from './user.js';

// ============================================================================
// Stripe Initialization
// ============================================================================

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripe: Stripe | null = null;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover',
  });
} else {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set. Stripe features will be disabled.');
}

// ============================================================================
// Price Configuration
// ============================================================================

// Price IDs from environment or fallback to test mode
const PRICE_IDS = {
  trial: process.env.STRIPE_PRICE_TRIAL,
  starter: process.env.STRIPE_PRICE_STARTER,
  creator: process.env.STRIPE_PRICE_CREATOR,
  pro: process.env.STRIPE_PRICE_PRO,
};

// Credit amounts per tier
const TIER_CREDITS = {
  trial: 60,
  starter: 350,
  creator: 1200,
  pro: 3500,
};

// Tier prices (for reference)
const TIER_PRICES = {
  trial: 100, // €1.00 in cents
  starter: 700, // €7.00 in cents
  creator: 1900, // €19.00 in cents
  pro: 4900, // €49.00 in cents
};

// ============================================================================
// Route Handlers
// ============================================================================

interface BuyCreditsBody {
  tier: 'trial' | 'starter' | 'creator' | 'pro';
  success_url: string;
  cancel_url: string;
}

const buyCredits = async (
  request: FastifyRequest<{ Body: BuyCreditsBody }>,
  reply: FastifyReply
) => {
  // Check if Stripe is configured
  if (!stripe) {
    return reply.status(503).send({
      type: 'https://api.renderowl.com/errors/service-unavailable',
      title: 'Service Unavailable',
      status: 503,
      detail: 'Stripe integration is not configured. Please contact support.',
      instance: '/stripe/buy-credits',
    });
  }

  // Validate request body
  const validation = BuyCreditsRequestSchema.safeParse(request.body);
  if (!validation.success) {
    const errors = validation.error.errors.map((e) => ({
      field: e.path.join('.'),
      code: e.code,
      message: e.message,
    }));

    return reply.status(400).send({
      type: 'https://api.renderowl.com/errors/validation-failed',
      title: 'Validation Failed',
      status: 400,
      detail: 'The request contains invalid data',
      instance: '/stripe/buy-credits',
      errors,
    });
  }

  const data = validation.data;
  const userId = (request.user as any)?.id;
  const userEmail = (request.user as any)?.email;

  if (!userId || !userEmail) {
    return reply.status(401).send({
      type: 'https://api.renderowl.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'User not authenticated',
      instance: '/stripe/buy-credits',
    });
  }

  // Get or create Stripe customer
  let user = getUserById(userId);
  let customerId = user?.stripe_customer_id;

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          user_id: userId,
        },
      });
      customerId = customer.id;
      updateUserStripeInfo(userId, customerId);
    }

    // Get price ID for the tier
    const priceId = PRICE_IDS[data.tier];
    
    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: data.tier === 'trial' ? 'payment' : 'subscription',
      success_url: data.success_url,
      cancel_url: data.cancel_url,
      metadata: {
        user_id: userId,
        tier: data.tier,
        credits: String(TIER_CREDITS[data.tier]),
      },
      line_items: [
        {
          quantity: 1,
          price: priceId || undefined,
        },
      ],
    };

    // If no price ID is set, use custom amount (for testing)
    if (!priceId) {
      console.warn(`[Stripe] No price ID for tier ${data.tier}, using custom amount`);
      
      if (data.tier === 'trial') {
        // One-time payment for trial
        sessionConfig.line_items = [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: 'Renderowl Trial',
                description: `60 credits - 7 day trial`,
              },
              unit_amount: TIER_PRICES.trial,
            },
            quantity: 1,
          },
        ];
      } else {
        // Subscription for other tiers
        sessionConfig.line_items = [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Renderowl ${data.tier.charAt(0).toUpperCase() + data.tier.slice(1)}`,
                description: `${TIER_CREDITS[data.tier]} credits per month`,
              },
              unit_amount: TIER_PRICES[data.tier],
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    const response = {
      checkout_url: session.url!,
      session_id: session.id,
    };

    // Validate response
    const validated = BuyCreditsResponseSchema.safeParse(response);
    if (!validated.success) {
      request.log.error(validated.error, 'Response validation failed');
      return reply.status(500).send({
        type: 'https://api.renderowl.com/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to generate valid response',
        instance: '/stripe/buy-credits',
      });
    }

    return reply.send(validated.data);
  } catch (error) {
    request.log.error(error, 'Stripe checkout session creation failed');
    return reply.status(500).send({
      type: 'https://api.renderowl.com/errors/stripe-error',
      title: 'Stripe Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to create checkout session',
      instance: '/stripe/buy-credits',
    });
  }
};

// ============================================================================
// Plugin Definition
// ============================================================================

export default async function stripeRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // POST /stripe/buy-credits - Create Stripe checkout session (requires auth)
  fastify.post('/buy-credits', buyCredits);
}

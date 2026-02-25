import Stripe from 'stripe';
import { getUserById, addCredits, updateUserStripeInfo, updateUserPlan } from './user.js';
// ============================================================================
// Stripe Initialization
// ============================================================================
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
let stripe = null;
if (stripeSecretKey) {
    stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2026-01-28.clover',
    });
}
else {
    console.warn('[Stripe Webhook] STRIPE_SECRET_KEY not set. Webhook handling is disabled.');
}
// ============================================================================
// Credit amounts per tier (must match stripe.ts)
// ============================================================================
const TIER_CREDITS = {
    trial: 60,
    starter: 350,
    creator: 1200,
    pro: 3500,
};
// ============================================================================
// Webhook Handler
// ============================================================================
export default async function stripeWebhookHandler(request, reply) {
    // Check if Stripe is configured
    if (!stripe || !stripeWebhookSecret) {
        return reply.status(503).send({
            type: 'https://api.renderowl.com/errors/service-unavailable',
            title: 'Service Unavailable',
            status: 503,
            detail: 'Stripe webhooks are not configured.',
            instance: '/stripe/webhook',
        });
    }
    const signature = request.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
        return reply.status(400).send({
            type: 'https://api.renderowl.com/errors/invalid-signature',
            title: 'Invalid Signature',
            status: 400,
            detail: 'Missing Stripe signature header',
            instance: '/stripe/webhook',
        });
    }
    let event;
    try {
        // Verify webhook signature using raw body
        // @ts-ignore - rawBody is attached by preParsing hook
        const rawBody = request.rawBody?.toString() || request.body;
        event = stripe.webhooks.constructEvent(rawBody, signature, stripeWebhookSecret);
    }
    catch (error) {
        console.error('[Stripe Webhook] Signature verification failed:', error);
        return reply.status(400).send({
            type: 'https://api.renderowl.com/errors/invalid-signature',
            title: 'Invalid Signature',
            status: 400,
            detail: 'Webhook signature verification failed',
            instance: '/stripe/webhook',
        });
    }
    console.log(`[Stripe Webhook] Received event: ${event.type}`);
    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                await handleCheckoutCompleted(session);
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                await handleInvoicePaymentSucceeded(invoice);
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                await handleInvoicePaymentFailed(invoice);
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                await handleSubscriptionUpdated(subscription);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await handleSubscriptionDeleted(subscription);
                break;
            }
            default:
                console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
        return reply.send({ received: true });
    }
    catch (error) {
        console.error('[Stripe Webhook] Error processing event:', error);
        return reply.status(500).send({
            type: 'https://api.renderowl.com/errors/webhook-processing-error',
            title: 'Webhook Processing Error',
            status: 500,
            detail: error instanceof Error ? error.message : 'Failed to process webhook',
            instance: '/stripe/webhook',
        });
    }
}
// ============================================================================
// Webhook Event Handlers
// ============================================================================
async function handleCheckoutCompleted(session) {
    console.log(`[Stripe] Checkout completed: ${session.id}`);
    const userId = session.metadata?.user_id;
    const tier = session.metadata?.tier;
    const creditsStr = session.metadata?.credits;
    if (!userId || !tier || !creditsStr) {
        console.error('[Stripe] Missing metadata in checkout session:', session.metadata);
        return;
    }
    const credits = parseInt(creditsStr, 10);
    const user = getUserById(userId);
    if (!user) {
        console.error(`[Stripe] User not found: ${userId}`);
        return;
    }
    // Add credits to user
    addCredits(userId, credits, `Purchase: ${tier} plan (${credits} credits)`, {
        stripe_session_id: session.id,
        tier,
        amount_paid: session.amount_total,
        currency: session.currency,
    });
    // Update user plan
    const isTrial = tier === 'trial';
    const subscriptionStatus = isTrial ? 'none' : 'active';
    const subscriptionExpiresAt = isTrial
        ? null
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    updateUserPlan(userId, tier, subscriptionStatus, subscriptionExpiresAt || undefined);
    // Update Stripe subscription ID if present
    if (session.subscription) {
        updateUserStripeInfo(userId, undefined, session.subscription);
    }
    console.log(`[Stripe] Added ${credits} credits to user ${userId}, tier: ${tier}`);
}
async function handleInvoicePaymentSucceeded(invoice) {
    console.log(`[Stripe] Invoice payment succeeded: ${invoice.id}`);
    // Only handle subscription renewals (not initial payment which is handled by checkout)
    if (!invoice.billing_reason || invoice.billing_reason !== 'subscription_cycle') {
        return;
    }
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    // Import usersStore from user.ts to search by subscription ID
    const { usersStore } = await import('./user.js');
    // Find user by subscription ID
    for (const user of usersStore.values()) {
        if (user.stripe_subscription_id === subscriptionId) {
            const tier = user.plan_tier;
            const credits = TIER_CREDITS[tier];
            if (credits) {
                addCredits(user.id, credits, `Monthly renewal: ${tier} plan (${credits} credits)`, {
                    stripe_invoice_id: invoice.id,
                    stripe_subscription_id: subscriptionId,
                    tier,
                });
                // Update subscription expiration
                const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                updateUserPlan(user.id, tier, 'active', newExpiresAt);
                console.log(`[Stripe] Renewed ${credits} credits for user ${user.id}`);
            }
            break;
        }
    }
}
async function handleInvoicePaymentFailed(invoice) {
    console.log(`[Stripe] Invoice payment failed: ${invoice.id}`);
    const subscriptionId = invoice.subscription;
    if (!subscriptionId)
        return;
    // Import usersStore from user.ts
    const { usersStore } = await import('./user.js');
    // Find user and mark subscription as past_due
    for (const user of usersStore.values()) {
        if (user.stripe_subscription_id === subscriptionId) {
            updateUserPlan(user.id, user.plan_tier, 'past_due');
            console.log(`[Stripe] Marked subscription as past_due for user ${user.id}`);
            break;
        }
    }
}
async function handleSubscriptionUpdated(subscription) {
    console.log(`[Stripe] Subscription updated: ${subscription.id}`);
    // Import usersStore from user.ts
    const { usersStore } = await import('./user.js');
    // Find user by subscription ID
    for (const user of usersStore.values()) {
        if (user.stripe_subscription_id === subscription.id) {
            const status = subscription.status;
            // Map Stripe status to our status
            let subscriptionStatus;
            switch (status) {
                case 'active':
                case 'trialing':
                    subscriptionStatus = 'active';
                    break;
                case 'past_due':
                case 'unpaid':
                    subscriptionStatus = 'past_due';
                    break;
                case 'canceled':
                case 'incomplete_expired':
                    subscriptionStatus = 'cancelled';
                    break;
                default:
                    subscriptionStatus = 'none';
            }
            const currentPeriodEnd = subscription.current_period_end;
            const expiresAt = currentPeriodEnd
                ? new Date(currentPeriodEnd * 1000).toISOString()
                : undefined;
            updateUserPlan(user.id, user.plan_tier, subscriptionStatus, expiresAt);
            console.log(`[Stripe] Updated subscription status for user ${user.id}: ${subscriptionStatus}`);
            break;
        }
    }
}
async function handleSubscriptionDeleted(subscription) {
    console.log(`[Stripe] Subscription deleted: ${subscription.id}`);
    // Import usersStore from user.ts
    const { usersStore } = await import('./user.js');
    // Find user by subscription ID
    for (const user of usersStore.values()) {
        if (user.stripe_subscription_id === subscription.id) {
            updateUserPlan(user.id, 'starter', 'cancelled');
            console.log(`[Stripe] Subscription cancelled for user ${user.id}`);
            break;
        }
    }
}
//# sourceMappingURL=stripe-webhook.js.map
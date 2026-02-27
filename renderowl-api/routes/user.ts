import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import {
  UserMeResponseSchema,
} from '../schemas.js';

// ============================================================================
// In-memory stores (replace with actual database)
// ============================================================================

export const usersStore = new Map<string, any>();
const transactionsStore = new Map<string, any[]>(); // user_id -> transactions

// Initialize a demo user for development
const now = (): string => new Date().toISOString();
const sevenDaysFromNow = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
};

// Demo user for development
usersStore.set('user_dev123', {
  id: 'user_dev123',
  email: 'dev@renderowl.com',
  name: 'Demo User',
  credits_balance: 60,
  plan_tier: 'trial',
  trial_expires_at: sevenDaysFromNow(),
  subscription_status: 'none',
  subscription_expires_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: now(),
  updated_at: now(),
});

// ============================================================================
// Helper Functions
// ============================================================================

export const generateUserId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'user_';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const generateTransactionId = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'ctx_';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ============================================================================
// Credit System Functions
// ============================================================================

// Credit costs per operation
export const CREDIT_COSTS = {
  IMAGE: 2,
  VOICEOVER: 0, // Free with edge-tts
  SFX: 3,
  VIDEO_BASE: 5,
  PER_SCENE: 2,
};

// Predefined video packages
export const VIDEO_PACKAGES = {
  short: { scenes: 10, credits: 25, cost_eur: 0.50 },
  medium: { scenes: 30, credits: 70, cost_eur: 1.40 },
  long: { scenes: 100, credits: 220, cost_eur: 4.40 },
};

export function calculateVideoCost(
  videoType: 'short' | 'medium' | 'long' | 'custom',
  sceneCount?: number,
  includeImages = true,
  includeVoiceover = true,
  includeSfx = false
): { credits: number; cost_eur: number; breakdown: any } {
  if (videoType === 'custom' && sceneCount) {
    // Calculate custom cost
    const baseCost = CREDIT_COSTS.VIDEO_BASE;
    const sceneCost = sceneCount * CREDIT_COSTS.PER_SCENE;
    const imageCost = includeImages ? sceneCount * CREDIT_COSTS.IMAGE : 0;
    const voiceoverCost = includeVoiceover ? 0 : 0; // Free
    const sfxCost = includeSfx ? sceneCount * CREDIT_COSTS.SFX : 0;

    const totalCredits = baseCost + sceneCost + imageCost + voiceoverCost + sfxCost;
    // €0.02 per credit
    const costEur = Math.round(totalCredits * 0.02 * 100) / 100;

    return {
      credits: totalCredits,
      cost_eur: costEur,
      breakdown: {
        base_cost: baseCost,
        scene_cost: sceneCost,
        image_cost: imageCost,
        voiceover_cost: voiceoverCost,
        sfx_cost: sfxCost,
      },
    };
  }

  // Use predefined packages
  const pkg = VIDEO_PACKAGES[videoType as keyof typeof VIDEO_PACKAGES];
  if (!pkg) {
    throw new Error(`Invalid video type: ${videoType}`);
  }

  return {
    credits: pkg.credits,
    cost_eur: pkg.cost_eur,
    breakdown: {
      base_cost: CREDIT_COSTS.VIDEO_BASE,
      scene_cost: (pkg.scenes - 1) * CREDIT_COSTS.PER_SCENE,
      image_cost: pkg.scenes * CREDIT_COSTS.IMAGE,
      voiceover_cost: 0,
      sfx_cost: 0,
    },
  };
}

export function getUserById(userId: string): any | null {
  return usersStore.get(userId) || null;
}

export function getOrCreateUser(email: string, name?: string): any {
  // Find existing user by email
  for (const user of usersStore.values()) {
    if (user.email === email) {
      return user;
    }
  }

  // Create new user
  const userId = generateUserId();
  const timestamp = now();
  const trialExpires = sevenDaysFromNow();

  const user = {
    id: userId,
    email,
    name: name || null,
    credits_balance: 60, // Trial starts with 60 credits
    plan_tier: 'trial',
    trial_expires_at: trialExpires,
    subscription_status: 'none',
    subscription_expires_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    created_at: timestamp,
    updated_at: timestamp,
  };

  usersStore.set(userId, user);
  transactionsStore.set(userId, []);

  // Create initial credit transaction
  addCreditTransaction(userId, 'bonus', 60, 'Trial bonus credits');

  return user;
}

export function addCredits(userId: string, amount: number, description: string, metadata?: any): boolean {
  const user = usersStore.get(userId);
  if (!user) return false;

  const newBalance = user.credits_balance + amount;
  user.credits_balance = newBalance;
  user.updated_at = now();

  addCreditTransaction(userId, amount > 0 ? 'purchase' : 'refund', amount, description, metadata);
  return true;
}

// Simple in-memory lock for credit operations per user
const creditLocks = new Map<string, boolean>();

function acquireLock(userId: string): boolean {
  if (creditLocks.get(userId)) return false;
  creditLocks.set(userId, true);
  return true;
}

function releaseLock(userId: string): void {
  creditLocks.delete(userId);
}

export function deductCredits(
  userId: string, 
  amount: number, 
  description: string, 
  metadata?: any
): { success: boolean; error?: string } {
  // Acquire lock for atomic operation
  if (!acquireLock(userId)) {
    return { success: false, error: 'Credit operation in progress, please retry' };
  }

  try {
    const user = usersStore.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Double-check balance inside lock
    if (user.credits_balance < amount) {
      return { success: false, error: 'Insufficient credits' };
    }

    const newBalance = user.credits_balance - amount;
    user.credits_balance = newBalance;
    user.updated_at = now();

    addCreditTransaction(userId, 'usage', -amount, description, metadata);
    return { success: true };
  } finally {
    releaseLock(userId);
  }
}

export function addCreditTransaction(
  userId: string,
  type: 'purchase' | 'usage' | 'refund' | 'bonus',
  amount: number,
  description: string,
  metadata?: any
): void {
  const user = usersStore.get(userId);
  if (!user) return;

  const transaction = {
    id: generateTransactionId(),
    user_id: userId,
    type,
    amount,
    balance_after: user.credits_balance,
    description,
    metadata: metadata || null,
    created_at: now(),
  };

  const userTransactions = transactionsStore.get(userId) || [];
  userTransactions.push(transaction);
  transactionsStore.set(userId, userTransactions);
}

export function getUserTransactions(userId: string, limit = 50): any[] {
  const transactions = transactionsStore.get(userId) || [];
  return transactions.slice(-limit).reverse();
}

export function updateUserStripeInfo(
  userId: string,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
): boolean {
  const user = usersStore.get(userId);
  if (!user) return false;

  if (stripeCustomerId) user.stripe_customer_id = stripeCustomerId;
  if (stripeSubscriptionId) user.stripe_subscription_id = stripeSubscriptionId;
  user.updated_at = now();

  return true;
}

export function updateUserPlan(
  userId: string,
  planTier: 'trial' | 'starter' | 'creator' | 'pro',
  subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'none',
  subscriptionExpiresAt?: string
): boolean {
  const user = usersStore.get(userId);
  if (!user) return false;

  user.plan_tier = planTier;
  user.subscription_status = subscriptionStatus;
  if (subscriptionExpiresAt) user.subscription_expires_at = subscriptionExpiresAt;
  user.updated_at = now();

  return true;
}

// ============================================================================
// Route Handlers
// ============================================================================

const getCurrentUser = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Get user from request context (set by auth hook)
  const userId = (request.user as any)?.id;
  if (!userId) {
    return reply.status(401).send({
      type: 'https://api.renderowl.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'User not authenticated',
      instance: '/user/me',
    });
  }

  const user = usersStore.get(userId);
  if (!user) {
    return reply.status(404).send({
      type: 'https://api.renderowl.com/errors/not-found',
      title: 'User Not Found',
      status: 404,
      detail: `User with ID "${userId}" does not exist`,
      instance: '/user/me',
    });
  }

  // Calculate days until trial expires
  let daysUntilTrialExpires: number | null = null;
  if (user.trial_expires_at) {
    const trialEnd = new Date(user.trial_expires_at);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    daysUntilTrialExpires = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysUntilTrialExpires < 0) daysUntilTrialExpires = 0;
  }

  const response = {
    id: user.id,
    email: user.email,
    name: user.name,
    credits_balance: user.credits_balance,
    plan_tier: user.plan_tier,
    trial_expires_at: user.trial_expires_at,
    subscription_status: user.subscription_status,
    subscription_expires_at: user.subscription_expires_at,
    days_until_trial_expires: daysUntilTrialExpires,
  };

  // Validate response
  const validated = UserMeResponseSchema.safeParse(response);
  if (!validated.success) {
    request.log.error(validated.error, 'Response validation failed');
    return reply.status(500).send({
      type: 'https://api.renderowl.com/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to generate valid response',
      instance: '/user/me',
    });
  }

  return reply.send(validated.data);
};

interface GetTransactionsQuery {
  limit?: number;
}

const getUserTransactionsHandler = async (
  request: FastifyRequest<{ Querystring: GetTransactionsQuery }>,
  reply: FastifyReply
) => {
  const userId = (request.user as any)?.id;
  if (!userId) {
    return reply.status(401).send({
      type: 'https://api.renderowl.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'User not authenticated',
      instance: '/user/transactions',
    });
  }

  const limit = Math.min(request.query.limit ?? 50, 100);
  const transactions = getUserTransactions(userId, limit);

  return reply.send({
    data: transactions,
    count: transactions.length,
  });
};

// ============================================================================
// Plugin Definition
// ============================================================================

export default async function userRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // GET /user/me - Get current user
  fastify.get('/me', getCurrentUser);

  // GET /user/transactions - Get credit transaction history
  fastify.get('/transactions', getUserTransactionsHandler);
}

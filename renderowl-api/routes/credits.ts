import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import {
  CalculateCostRequestSchema,
  CalculateCostResponseSchema,
} from '../schemas.js';
import { calculateVideoCost, deductCredits, addCredits, getUserById } from './user.js';
import { ZodError } from 'zod';

// ============================================================================
// Helper Functions
// ============================================================================

const handleZodError = (error: ZodError, reply: FastifyReply, instance: string) => {
  const errors = error.errors.map((e) => ({
    field: e.path.join('.'),
    code: e.code,
    message: e.message,
  }));

  return reply.status(400).send({
    type: 'https://api.renderowl.com/errors/validation-failed',
    title: 'Validation Failed',
    status: 400,
    detail: 'The request contains invalid data',
    instance,
    errors,
  });
};

// ============================================================================
// Route Handlers
// ============================================================================

interface CalculateCostBody {
  video_type: 'short' | 'medium' | 'long' | 'custom';
  scene_count?: number;
  duration_seconds?: number;
  include_images?: boolean;
  include_voiceover?: boolean;
  include_sfx?: boolean;
}

const calculateCost = async (
  request: FastifyRequest<{ Body: CalculateCostBody }>,
  reply: FastifyReply
) => {
  // Validate request body
  const validation = CalculateCostRequestSchema.safeParse(request.body);
  if (!validation.success) {
    return handleZodError(validation.error, reply, '/credits/calculate-cost');
  }

  const data = validation.data;

  try {
    const cost = calculateVideoCost(
      data.video_type,
      data.scene_count,
      data.include_images,
      data.include_voiceover,
      data.include_sfx
    );

    // Validate response
    const response = {
      credits: cost.credits,
      cost_eur: cost.cost_eur,
      breakdown: {
        base_cost: cost.breakdown.base_cost,
        image_cost: cost.breakdown.image_cost,
        voiceover_cost: cost.breakdown.voiceover_cost,
        sfx_cost: cost.breakdown.sfx_cost,
      },
    };

    const validated = CalculateCostResponseSchema.safeParse(response);
    if (!validated.success) {
      request.log.error(validated.error, 'Response validation failed');
      return reply.status(500).send({
        type: 'https://api.renderowl.com/errors/internal-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Failed to generate valid response',
        instance: '/credits/calculate-cost',
      });
    }

    return reply.send(validated.data);
  } catch (error) {
    request.log.error(error, 'Failed to calculate cost');
    return reply.status(400).send({
      type: 'https://api.renderowl.com/errors/invalid-request',
      title: 'Invalid Request',
      status: 400,
      detail: error instanceof Error ? error.message : 'Failed to calculate cost',
      instance: '/credits/calculate-cost',
    });
  }
};

// ============================================================================
// Internal Credit Operations (for Automations team)
// ============================================================================

interface DeductCreditsBody {
  user_id: string;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
}

const deductCreditsHandler = async (
  request: FastifyRequest<{ Body: DeductCreditsBody }>,
  reply: FastifyReply
) => {
  const { user_id, amount, description, metadata } = request.body;

  // Validate amount
  if (!Number.isInteger(amount) || amount <= 0) {
    return reply.status(400).send({
      type: 'https://api.renderowl.com/errors/invalid-request',
      title: 'Invalid Request',
      status: 400,
      detail: 'Amount must be a positive integer',
      instance: '/credits/deduct',
    });
  }

  const result = deductCredits(user_id, amount, description, metadata);

  if (!result.success) {
    return reply.status(402).send({
      type: 'https://api.renderowl.com/errors/insufficient-credits',
      title: 'Insufficient Credits',
      status: 402,
      detail: result.error || 'Not enough credits for this operation',
      instance: '/credits/deduct',
      user_id,
      required: amount,
    });
  }

  // Get updated balance
  const user = getUserById(user_id);

  return reply.send({
    success: true,
    user_id,
    deducted: amount,
    balance_after: user?.credits_balance ?? 0,
  });
};

interface AddCreditsBody {
  user_id: string;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
}

const addCreditsHandler = async (
  request: FastifyRequest<{ Body: AddCreditsBody }>,
  reply: FastifyReply
) => {
  const { user_id, amount, description, metadata } = request.body;

  // Validate amount
  if (!Number.isInteger(amount) || amount <= 0) {
    return reply.status(400).send({
      type: 'https://api.renderowl.com/errors/invalid-request',
      title: 'Invalid Request',
      status: 400,
      detail: 'Amount must be a positive integer',
      instance: '/credits/add',
    });
  }

  const success = addCredits(user_id, amount, description, metadata);

  if (!success) {
    return reply.status(404).send({
      type: 'https://api.renderowl.com/errors/not-found',
      title: 'User Not Found',
      status: 404,
      detail: `User with ID "${user_id}" does not exist`,
      instance: '/credits/add',
    });
  }

  // Get updated balance
  const user = getUserById(user_id);

  return reply.send({
    success: true,
    user_id,
    added: amount,
    balance_after: user?.credits_balance ?? 0,
  });
};

interface CheckCreditsParams {
  user_id: string;
}

interface CheckCreditsQuery {
  required?: number;
}

const checkCreditsHandler = async (
  request: FastifyRequest<{ Params: CheckCreditsParams; Querystring: CheckCreditsQuery }>,
  reply: FastifyReply
) => {
  const { user_id } = request.params;
  const required = request.query.required ?? 0;

  const user = getUserById(user_id);

  if (!user) {
    return reply.status(404).send({
      type: 'https://api.renderowl.com/errors/not-found',
      title: 'User Not Found',
      status: 404,
      detail: `User with ID "${user_id}" does not exist`,
      instance: `/credits/check/${user_id}`,
    });
  }

  const hasEnough = user.credits_balance >= required;

  return reply.send({
    user_id,
    balance: user.credits_balance,
    required,
    has_enough: hasEnough,
    deficit: hasEnough ? 0 : required - user.credits_balance,
  });
};

// ============================================================================
// Get Current User's Credit Balance (for Frontend)
// ============================================================================

const getBalanceHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const userId = (request.user as any)?.id;
  if (!userId) {
    return reply.status(401).send({
      type: 'https://api.renderowl.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'User not authenticated',
      instance: '/credits/balance',
    });
  }

  const user = getUserById(userId);

  if (!user) {
    return reply.status(404).send({
      type: 'https://api.renderowl.com/errors/not-found',
      title: 'User Not Found',
      status: 404,
      detail: `User with ID "${userId}" does not exist`,
      instance: '/credits/balance',
    });
  }

  return reply.send({
    user_id: userId,
    credits_balance: user.credits_balance,
    plan_tier: user.plan_tier,
    trial_expires_at: user.trial_expires_at,
    subscription_status: user.subscription_status,
    subscription_expires_at: user.subscription_expires_at,
  });
};

// ============================================================================
// Plugin Definition
// ============================================================================

export default async function creditsRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // GET /credits/balance - Get current user's credit balance (Frontend)
  fastify.get('/balance', getBalanceHandler);

  // POST /credits/calculate-cost - Calculate credit cost for video
  fastify.post('/calculate-cost', calculateCost);

  // POST /credits/deduct - Deduct credits (for Automations team)
  fastify.post('/deduct', deductCreditsHandler);

  // POST /credits/add - Add credits (for internal use)
  fastify.post('/add', addCreditsHandler);

  // GET /credits/check/:user_id - Check user credits
  fastify.get('/check/:user_id', checkCreditsHandler);
}

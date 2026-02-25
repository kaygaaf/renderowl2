import { FastifyInstance, FastifyPluginOptions } from 'fastify';
export declare const usersStore: Map<string, any>;
export declare const generateUserId: () => string;
export declare const generateTransactionId: () => string;
export declare const CREDIT_COSTS: {
    IMAGE: number;
    VOICEOVER: number;
    SFX: number;
    VIDEO_BASE: number;
    PER_SCENE: number;
};
export declare const VIDEO_PACKAGES: {
    short: {
        scenes: number;
        credits: number;
        cost_eur: number;
    };
    medium: {
        scenes: number;
        credits: number;
        cost_eur: number;
    };
    long: {
        scenes: number;
        credits: number;
        cost_eur: number;
    };
};
export declare function calculateVideoCost(videoType: 'short' | 'medium' | 'long' | 'custom', sceneCount?: number, includeImages?: boolean, includeVoiceover?: boolean, includeSfx?: boolean): {
    credits: number;
    cost_eur: number;
    breakdown: any;
};
export declare function getUserById(userId: string): any | null;
export declare function getOrCreateUser(email: string, name?: string): any;
export declare function addCredits(userId: string, amount: number, description: string, metadata?: any): boolean;
export declare function deductCredits(userId: string, amount: number, description: string, metadata?: any): {
    success: boolean;
    error?: string;
};
export declare function addCreditTransaction(userId: string, type: 'purchase' | 'usage' | 'refund' | 'bonus', amount: number, description: string, metadata?: any): void;
export declare function getUserTransactions(userId: string, limit?: number): any[];
export declare function updateUserStripeInfo(userId: string, stripeCustomerId?: string, stripeSubscriptionId?: string): boolean;
export declare function updateUserPlan(userId: string, planTier: 'trial' | 'starter' | 'creator' | 'pro', subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'none', subscriptionExpiresAt?: string): boolean;
export default function userRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void>;
//# sourceMappingURL=user.d.ts.map
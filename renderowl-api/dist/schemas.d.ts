import { z } from 'zod';
export declare const ProjectIdSchema: z.ZodString;
export declare const AssetIdSchema: z.ZodString;
export declare const RenderIdSchema: z.ZodString;
export declare const AutomationIdSchema: z.ZodString;
export declare const UserIdSchema: z.ZodString;
export declare const ISO8601Schema: z.ZodString;
export declare const PlanTierSchema: z.ZodEnum<["trial", "starter", "creator", "pro"]>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    credits_balance: z.ZodNumber;
    plan_tier: z.ZodEnum<["trial", "starter", "creator", "pro"]>;
    trial_expires_at: z.ZodNullable<z.ZodString>;
    subscription_status: z.ZodDefault<z.ZodEnum<["active", "cancelled", "past_due", "none"]>>;
    subscription_expires_at: z.ZodNullable<z.ZodString>;
    stripe_customer_id: z.ZodNullable<z.ZodString>;
    stripe_subscription_id: z.ZodNullable<z.ZodString>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string | null;
    credits_balance: number;
    plan_tier: "trial" | "starter" | "creator" | "pro";
    trial_expires_at: string | null;
    subscription_status: "active" | "cancelled" | "past_due" | "none";
    subscription_expires_at: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    created_at: string;
    updated_at: string;
}, {
    id: string;
    email: string;
    name: string | null;
    credits_balance: number;
    plan_tier: "trial" | "starter" | "creator" | "pro";
    trial_expires_at: string | null;
    subscription_expires_at: string | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    created_at: string;
    updated_at: string;
    subscription_status?: "active" | "cancelled" | "past_due" | "none" | undefined;
}>;
export declare const UserMeResponseSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodNullable<z.ZodString>;
    credits_balance: z.ZodNumber;
    plan_tier: z.ZodEnum<["trial", "starter", "creator", "pro"]>;
    trial_expires_at: z.ZodNullable<z.ZodString>;
    subscription_status: z.ZodEnum<["active", "cancelled", "past_due", "none"]>;
    subscription_expires_at: z.ZodNullable<z.ZodString>;
    days_until_trial_expires: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string | null;
    credits_balance: number;
    plan_tier: "trial" | "starter" | "creator" | "pro";
    trial_expires_at: string | null;
    subscription_status: "active" | "cancelled" | "past_due" | "none";
    subscription_expires_at: string | null;
    days_until_trial_expires: number | null;
}, {
    id: string;
    email: string;
    name: string | null;
    credits_balance: number;
    plan_tier: "trial" | "starter" | "creator" | "pro";
    trial_expires_at: string | null;
    subscription_status: "active" | "cancelled" | "past_due" | "none";
    subscription_expires_at: string | null;
    days_until_trial_expires: number | null;
}>;
export declare const VideoTypeSchema: z.ZodEnum<["short", "medium", "long", "custom"]>;
export declare const CalculateCostRequestSchema: z.ZodObject<{
    video_type: z.ZodEnum<["short", "medium", "long", "custom"]>;
    scene_count: z.ZodOptional<z.ZodNumber>;
    duration_seconds: z.ZodOptional<z.ZodNumber>;
    include_images: z.ZodDefault<z.ZodBoolean>;
    include_voiceover: z.ZodDefault<z.ZodBoolean>;
    include_sfx: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    video_type: "custom" | "short" | "medium" | "long";
    include_images: boolean;
    include_voiceover: boolean;
    include_sfx: boolean;
    scene_count?: number | undefined;
    duration_seconds?: number | undefined;
}, {
    video_type: "custom" | "short" | "medium" | "long";
    scene_count?: number | undefined;
    duration_seconds?: number | undefined;
    include_images?: boolean | undefined;
    include_voiceover?: boolean | undefined;
    include_sfx?: boolean | undefined;
}>;
export declare const CalculateCostResponseSchema: z.ZodObject<{
    credits: z.ZodNumber;
    cost_eur: z.ZodNumber;
    breakdown: z.ZodObject<{
        base_cost: z.ZodNumber;
        image_cost: z.ZodNumber;
        voiceover_cost: z.ZodNumber;
        sfx_cost: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        base_cost: number;
        image_cost: number;
        voiceover_cost: number;
        sfx_cost: number;
    }, {
        base_cost: number;
        image_cost: number;
        voiceover_cost: number;
        sfx_cost: number;
    }>;
}, "strip", z.ZodTypeAny, {
    credits: number;
    cost_eur: number;
    breakdown: {
        base_cost: number;
        image_cost: number;
        voiceover_cost: number;
        sfx_cost: number;
    };
}, {
    credits: number;
    cost_eur: number;
    breakdown: {
        base_cost: number;
        image_cost: number;
        voiceover_cost: number;
        sfx_cost: number;
    };
}>;
export declare const BuyCreditsRequestSchema: z.ZodObject<{
    tier: z.ZodEnum<["trial", "starter", "creator", "pro"]>;
    success_url: z.ZodString;
    cancel_url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tier: "trial" | "starter" | "creator" | "pro";
    success_url: string;
    cancel_url: string;
}, {
    tier: "trial" | "starter" | "creator" | "pro";
    success_url: string;
    cancel_url: string;
}>;
export declare const BuyCreditsResponseSchema: z.ZodObject<{
    checkout_url: z.ZodString;
    session_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    checkout_url: string;
    session_id: string;
}, {
    checkout_url: string;
    session_id: string;
}>;
export declare const CreditTransactionSchema: z.ZodObject<{
    id: z.ZodString;
    user_id: z.ZodString;
    type: z.ZodEnum<["purchase", "usage", "refund", "bonus"]>;
    amount: z.ZodNumber;
    balance_after: z.ZodNumber;
    description: z.ZodString;
    metadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    type: "purchase" | "usage" | "refund" | "bonus";
    user_id: string;
    amount: number;
    balance_after: number;
    description: string;
    metadata: Record<string, unknown> | null;
}, {
    id: string;
    created_at: string;
    type: "purchase" | "usage" | "refund" | "bonus";
    user_id: string;
    amount: number;
    balance_after: number;
    description: string;
    metadata: Record<string, unknown> | null;
}>;
export declare const WordTimestampSchema: z.ZodObject<{
    startMs: z.ZodNumber;
    endMs: z.ZodNumber;
    word: z.ZodString;
}, "strip", z.ZodTypeAny, {
    startMs: number;
    endMs: number;
    word: string;
}, {
    startMs: number;
    endMs: number;
    word: string;
}>;
export declare const CaptionSegmentSchema: z.ZodObject<{
    startMs: z.ZodNumber;
    endMs: z.ZodNumber;
    text: z.ZodString;
    words: z.ZodOptional<z.ZodArray<z.ZodObject<{
        startMs: z.ZodNumber;
        endMs: z.ZodNumber;
        word: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        startMs: number;
        endMs: number;
        word: string;
    }, {
        startMs: number;
        endMs: number;
        word: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    startMs: number;
    endMs: number;
    text: string;
    words?: {
        startMs: number;
        endMs: number;
        word: string;
    }[] | undefined;
}, {
    startMs: number;
    endMs: number;
    text: string;
    words?: {
        startMs: number;
        endMs: number;
        word: string;
    }[] | undefined;
}>;
export declare const CaptionStyleSchema: z.ZodObject<{
    maxCharsPerLine: z.ZodOptional<z.ZodNumber>;
    maxLines: z.ZodOptional<z.ZodNumber>;
    fontFamily: z.ZodOptional<z.ZodString>;
    fontSize: z.ZodOptional<z.ZodNumber>;
    lineHeight: z.ZodOptional<z.ZodNumber>;
    textColor: z.ZodOptional<z.ZodString>;
    highlightColor: z.ZodOptional<z.ZodString>;
    strokeColor: z.ZodOptional<z.ZodString>;
    strokeWidth: z.ZodOptional<z.ZodNumber>;
    backgroundColor: z.ZodOptional<z.ZodString>;
    backgroundOpacity: z.ZodOptional<z.ZodNumber>;
    paddingX: z.ZodOptional<z.ZodNumber>;
    paddingY: z.ZodOptional<z.ZodNumber>;
    borderRadius: z.ZodOptional<z.ZodNumber>;
    bottomOffset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    maxCharsPerLine?: number | undefined;
    maxLines?: number | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    lineHeight?: number | undefined;
    textColor?: string | undefined;
    highlightColor?: string | undefined;
    strokeColor?: string | undefined;
    strokeWidth?: number | undefined;
    backgroundColor?: string | undefined;
    backgroundOpacity?: number | undefined;
    paddingX?: number | undefined;
    paddingY?: number | undefined;
    borderRadius?: number | undefined;
    bottomOffset?: number | undefined;
}, {
    maxCharsPerLine?: number | undefined;
    maxLines?: number | undefined;
    fontFamily?: string | undefined;
    fontSize?: number | undefined;
    lineHeight?: number | undefined;
    textColor?: string | undefined;
    highlightColor?: string | undefined;
    strokeColor?: string | undefined;
    strokeWidth?: number | undefined;
    backgroundColor?: string | undefined;
    backgroundOpacity?: number | undefined;
    paddingX?: number | undefined;
    paddingY?: number | undefined;
    borderRadius?: number | undefined;
    bottomOffset?: number | undefined;
}>;
export declare const ProjectSettingsSchema: z.ZodObject<{
    default_width: z.ZodDefault<z.ZodNumber>;
    default_height: z.ZodDefault<z.ZodNumber>;
    default_fps: z.ZodDefault<z.ZodNumber>;
    default_duration_sec: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    default_width: number;
    default_height: number;
    default_fps: number;
    default_duration_sec: number;
}, {
    default_width?: number | undefined;
    default_height?: number | undefined;
    default_fps?: number | undefined;
    default_duration_sec?: number | undefined;
}>;
export declare const ProjectSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<["active", "archived"]>;
    settings: z.ZodObject<{
        default_width: z.ZodDefault<z.ZodNumber>;
        default_height: z.ZodDefault<z.ZodNumber>;
        default_fps: z.ZodDefault<z.ZodNumber>;
        default_duration_sec: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        default_width: number;
        default_height: number;
        default_fps: number;
        default_duration_sec: number;
    }, {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    }>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    created_by: z.ZodString;
    asset_count: z.ZodNumber;
    render_count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    status: "active" | "archived";
    description: string | null;
    settings: {
        default_width: number;
        default_height: number;
        default_fps: number;
        default_duration_sec: number;
    };
    created_by: string;
    asset_count: number;
    render_count: number;
}, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    status: "active" | "archived";
    description: string | null;
    settings: {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    };
    created_by: string;
    asset_count: number;
    render_count: number;
}>;
export declare const CreateProjectRequestSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        default_width: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        default_height: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        default_fps: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        default_duration_sec: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    }, {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | undefined;
    settings?: {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    } | undefined;
}, {
    name: string;
    description?: string | undefined;
    settings?: {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    } | undefined;
}>;
export declare const UpdateProjectRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    settings: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        default_width: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        default_height: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        default_fps: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        default_duration_sec: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    }, {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    settings?: {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    settings?: {
        default_width?: number | undefined;
        default_height?: number | undefined;
        default_fps?: number | undefined;
        default_duration_sec?: number | undefined;
    } | undefined;
}>;
export declare const ProjectListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        status: z.ZodEnum<["active", "archived"]>;
        settings: z.ZodObject<{
            default_width: z.ZodDefault<z.ZodNumber>;
            default_height: z.ZodDefault<z.ZodNumber>;
            default_fps: z.ZodDefault<z.ZodNumber>;
            default_duration_sec: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            default_width: number;
            default_height: number;
            default_fps: number;
            default_duration_sec: number;
        }, {
            default_width?: number | undefined;
            default_height?: number | undefined;
            default_fps?: number | undefined;
            default_duration_sec?: number | undefined;
        }>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        created_by: z.ZodString;
        asset_count: z.ZodNumber;
        render_count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        status: "active" | "archived";
        description: string | null;
        settings: {
            default_width: number;
            default_height: number;
            default_fps: number;
            default_duration_sec: number;
        };
        created_by: string;
        asset_count: number;
        render_count: number;
    }, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        status: "active" | "archived";
        description: string | null;
        settings: {
            default_width?: number | undefined;
            default_height?: number | undefined;
            default_fps?: number | undefined;
            default_duration_sec?: number | undefined;
        };
        created_by: string;
        asset_count: number;
        render_count: number;
    }>, "many">;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        per_page: z.ZodNumber;
        total: z.ZodNumber;
        total_pages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    }, {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    }>;
}, "strip", z.ZodTypeAny, {
    data: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        status: "active" | "archived";
        description: string | null;
        settings: {
            default_width: number;
            default_height: number;
            default_fps: number;
            default_duration_sec: number;
        };
        created_by: string;
        asset_count: number;
        render_count: number;
    }[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
}, {
    data: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        status: "active" | "archived";
        description: string | null;
        settings: {
            default_width?: number | undefined;
            default_height?: number | undefined;
            default_fps?: number | undefined;
            default_duration_sec?: number | undefined;
        };
        created_by: string;
        asset_count: number;
        render_count: number;
    }[];
    pagination: {
        page: number;
        per_page: number;
        total: number;
        total_pages: number;
    };
}>;
export declare const AssetTypeSchema: z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>;
export declare const AssetStatusSchema: z.ZodEnum<["pending", "processing", "ready", "error"]>;
export declare const AssetMetadataSchema: z.ZodObject<{
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    duration_ms: z.ZodOptional<z.ZodNumber>;
    codec: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    width?: number | undefined;
    height?: number | undefined;
    duration_ms?: number | undefined;
    codec?: string | undefined;
}, {
    width?: number | undefined;
    height?: number | undefined;
    duration_ms?: number | undefined;
    codec?: string | undefined;
}>;
export declare const AssetSchema: z.ZodObject<{
    id: z.ZodString;
    project_id: z.ZodString;
    name: z.ZodString;
    type: z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>;
    status: z.ZodEnum<["pending", "processing", "ready", "error"]>;
    content_type: z.ZodString;
    size_bytes: z.ZodNullable<z.ZodNumber>;
    url: z.ZodNullable<z.ZodString>;
    metadata: z.ZodNullable<z.ZodObject<{
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        duration_ms: z.ZodOptional<z.ZodNumber>;
        codec: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        codec?: string | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        codec?: string | undefined;
    }>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
    status: "pending" | "processing" | "ready" | "error";
    metadata: {
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        codec?: string | undefined;
    } | null;
    project_id: string;
    content_type: string;
    size_bytes: number | null;
    url: string | null;
}, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
    status: "pending" | "processing" | "ready" | "error";
    metadata: {
        width?: number | undefined;
        height?: number | undefined;
        duration_ms?: number | undefined;
        codec?: string | undefined;
    } | null;
    project_id: string;
    content_type: string;
    size_bytes: number | null;
    url: string | null;
}>;
export declare const CreateAssetUploadRequestSchema: z.ZodObject<{
    filename: z.ZodString;
    content_type: z.ZodString;
    size_bytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    content_type: string;
    size_bytes: number;
    filename: string;
}, {
    content_type: string;
    size_bytes: number;
    filename: string;
}>;
export declare const CreateAssetUploadResponseSchema: z.ZodObject<{
    asset: z.ZodObject<{
        id: z.ZodString;
        project_id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>;
        status: z.ZodEnum<["pending", "processing", "ready", "error"]>;
        content_type: z.ZodString;
        size_bytes: z.ZodNullable<z.ZodNumber>;
        url: z.ZodNullable<z.ZodString>;
        metadata: z.ZodNullable<z.ZodObject<{
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
            codec: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        }, {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        }>>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    }, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    }>;
    upload_url: z.ZodString;
    expires_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    asset: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    };
    upload_url: string;
    expires_at: string;
}, {
    asset: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    };
    upload_url: string;
    expires_at: string;
}>;
export declare const AssetListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        project_id: z.ZodString;
        name: z.ZodString;
        type: z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>;
        status: z.ZodEnum<["pending", "processing", "ready", "error"]>;
        content_type: z.ZodString;
        size_bytes: z.ZodNullable<z.ZodNumber>;
        url: z.ZodNullable<z.ZodString>;
        metadata: z.ZodNullable<z.ZodObject<{
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            duration_ms: z.ZodOptional<z.ZodNumber>;
            codec: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        }, {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        }>>;
        created_at: z.ZodString;
        updated_at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    }, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    data: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    }[];
}, {
    data: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        type: "video" | "audio" | "image" | "subtitle" | "font" | "other";
        status: "pending" | "processing" | "ready" | "error";
        metadata: {
            width?: number | undefined;
            height?: number | undefined;
            duration_ms?: number | undefined;
            codec?: string | undefined;
        } | null;
        project_id: string;
        content_type: string;
        size_bytes: number | null;
        url: string | null;
    }[];
}>;
export declare const RenderStatusSchema: z.ZodEnum<["pending", "queued", "rendering", "completed", "failed", "cancelled"]>;
export declare const OutputFormatSchema: z.ZodEnum<["mp4", "webm", "mov", "gif"]>;
export declare const VideoCodecSchema: z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>;
export declare const PrioritySchema: z.ZodEnum<["low", "normal", "high", "urgent"]>;
export declare const OutputSettingsSchema: z.ZodObject<{
    format: z.ZodEnum<["mp4", "webm", "mov", "gif"]>;
    codec: z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fps: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
    codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
    format: "mp4" | "webm" | "mov" | "gif";
    fps: number;
}, {
    width: number;
    height: number;
    codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
    format: "mp4" | "webm" | "mov" | "gif";
    fps: number;
}>;
export declare const RenderProgressSchema: z.ZodObject<{
    percent: z.ZodNumber;
    current_frame: z.ZodNumber;
    total_frames: z.ZodNumber;
    estimated_remaining_sec: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    percent: number;
    current_frame: number;
    total_frames: number;
    estimated_remaining_sec: number | null;
}, {
    percent: number;
    current_frame: number;
    total_frames: number;
    estimated_remaining_sec: number | null;
}>;
export declare const RenderOutputSchema: z.ZodObject<{
    url: z.ZodNullable<z.ZodString>;
    size_bytes: z.ZodNullable<z.ZodNumber>;
    duration_ms: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    duration_ms: number | null;
    size_bytes: number | null;
    url: string | null;
}, {
    duration_ms: number | null;
    size_bytes: number | null;
    url: string | null;
}>;
export declare const RenderErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodNullable<z.ZodUnknown>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    details?: unknown;
}, {
    code: string;
    message: string;
    details?: unknown;
}>;
export declare const RenderSchema: z.ZodObject<{
    id: z.ZodString;
    project_id: z.ZodString;
    composition_id: z.ZodString;
    status: z.ZodEnum<["pending", "queued", "rendering", "completed", "failed", "cancelled"]>;
    input_props: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    output_settings: z.ZodObject<{
        format: z.ZodEnum<["mp4", "webm", "mov", "gif"]>;
        codec: z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>;
        width: z.ZodNumber;
        height: z.ZodNumber;
        fps: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    }, {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    }>;
    priority: z.ZodEnum<["low", "normal", "high", "urgent"]>;
    progress: z.ZodObject<{
        percent: z.ZodNumber;
        current_frame: z.ZodNumber;
        total_frames: z.ZodNumber;
        estimated_remaining_sec: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        percent: number;
        current_frame: number;
        total_frames: number;
        estimated_remaining_sec: number | null;
    }, {
        percent: number;
        current_frame: number;
        total_frames: number;
        estimated_remaining_sec: number | null;
    }>;
    output: z.ZodNullable<z.ZodObject<{
        url: z.ZodNullable<z.ZodString>;
        size_bytes: z.ZodNullable<z.ZodNumber>;
        duration_ms: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        duration_ms: number | null;
        size_bytes: number | null;
        url: string | null;
    }, {
        duration_ms: number | null;
        size_bytes: number | null;
        url: string | null;
    }>>;
    error: z.ZodNullable<z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodNullable<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
    }, {
        code: string;
        message: string;
        details?: unknown;
    }>>;
    created_at: z.ZodString;
    started_at: z.ZodNullable<z.ZodString>;
    completed_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    created_at: string;
    status: "cancelled" | "pending" | "queued" | "rendering" | "completed" | "failed";
    error: {
        code: string;
        message: string;
        details?: unknown;
    } | null;
    project_id: string;
    composition_id: string;
    input_props: Record<string, unknown>;
    output_settings: {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    };
    priority: "low" | "normal" | "high" | "urgent";
    progress: {
        percent: number;
        current_frame: number;
        total_frames: number;
        estimated_remaining_sec: number | null;
    };
    output: {
        duration_ms: number | null;
        size_bytes: number | null;
        url: string | null;
    } | null;
    started_at: string | null;
    completed_at: string | null;
}, {
    id: string;
    created_at: string;
    status: "cancelled" | "pending" | "queued" | "rendering" | "completed" | "failed";
    error: {
        code: string;
        message: string;
        details?: unknown;
    } | null;
    project_id: string;
    composition_id: string;
    input_props: Record<string, unknown>;
    output_settings: {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    };
    priority: "low" | "normal" | "high" | "urgent";
    progress: {
        percent: number;
        current_frame: number;
        total_frames: number;
        estimated_remaining_sec: number | null;
    };
    output: {
        duration_ms: number | null;
        size_bytes: number | null;
        url: string | null;
    } | null;
    started_at: string | null;
    completed_at: string | null;
}>;
export declare const CaptionedVideoInputPropsSchema: z.ZodObject<{
    videoSrc: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodString]>>;
    captions: z.ZodUnion<[z.ZodString, z.ZodString, z.ZodArray<z.ZodObject<{
        startMs: z.ZodNumber;
        endMs: z.ZodNumber;
        text: z.ZodString;
        words: z.ZodOptional<z.ZodArray<z.ZodObject<{
            startMs: z.ZodNumber;
            endMs: z.ZodNumber;
            word: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            startMs: number;
            endMs: number;
            word: string;
        }, {
            startMs: number;
            endMs: number;
            word: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        startMs: number;
        endMs: number;
        text: string;
        words?: {
            startMs: number;
            endMs: number;
            word: string;
        }[] | undefined;
    }, {
        startMs: number;
        endMs: number;
        text: string;
        words?: {
            startMs: number;
            endMs: number;
            word: string;
        }[] | undefined;
    }>, "many">]>;
    captionStyle: z.ZodOptional<z.ZodObject<{
        maxCharsPerLine: z.ZodOptional<z.ZodNumber>;
        maxLines: z.ZodOptional<z.ZodNumber>;
        fontFamily: z.ZodOptional<z.ZodString>;
        fontSize: z.ZodOptional<z.ZodNumber>;
        lineHeight: z.ZodOptional<z.ZodNumber>;
        textColor: z.ZodOptional<z.ZodString>;
        highlightColor: z.ZodOptional<z.ZodString>;
        strokeColor: z.ZodOptional<z.ZodString>;
        strokeWidth: z.ZodOptional<z.ZodNumber>;
        backgroundColor: z.ZodOptional<z.ZodString>;
        backgroundOpacity: z.ZodOptional<z.ZodNumber>;
        paddingX: z.ZodOptional<z.ZodNumber>;
        paddingY: z.ZodOptional<z.ZodNumber>;
        borderRadius: z.ZodOptional<z.ZodNumber>;
        bottomOffset: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxCharsPerLine?: number | undefined;
        maxLines?: number | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        lineHeight?: number | undefined;
        textColor?: string | undefined;
        highlightColor?: string | undefined;
        strokeColor?: string | undefined;
        strokeWidth?: number | undefined;
        backgroundColor?: string | undefined;
        backgroundOpacity?: number | undefined;
        paddingX?: number | undefined;
        paddingY?: number | undefined;
        borderRadius?: number | undefined;
        bottomOffset?: number | undefined;
    }, {
        maxCharsPerLine?: number | undefined;
        maxLines?: number | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        lineHeight?: number | undefined;
        textColor?: string | undefined;
        highlightColor?: string | undefined;
        strokeColor?: string | undefined;
        strokeWidth?: number | undefined;
        backgroundColor?: string | undefined;
        backgroundOpacity?: number | undefined;
        paddingX?: number | undefined;
        paddingY?: number | undefined;
        borderRadius?: number | undefined;
        bottomOffset?: number | undefined;
    }>>;
    backgroundColor: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    captions: string | {
        startMs: number;
        endMs: number;
        text: string;
        words?: {
            startMs: number;
            endMs: number;
            word: string;
        }[] | undefined;
    }[];
    backgroundColor?: string | undefined;
    videoSrc?: string | undefined;
    captionStyle?: {
        maxCharsPerLine?: number | undefined;
        maxLines?: number | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        lineHeight?: number | undefined;
        textColor?: string | undefined;
        highlightColor?: string | undefined;
        strokeColor?: string | undefined;
        strokeWidth?: number | undefined;
        backgroundColor?: string | undefined;
        backgroundOpacity?: number | undefined;
        paddingX?: number | undefined;
        paddingY?: number | undefined;
        borderRadius?: number | undefined;
        bottomOffset?: number | undefined;
    } | undefined;
}, {
    captions: string | {
        startMs: number;
        endMs: number;
        text: string;
        words?: {
            startMs: number;
            endMs: number;
            word: string;
        }[] | undefined;
    }[];
    backgroundColor?: string | undefined;
    videoSrc?: string | undefined;
    captionStyle?: {
        maxCharsPerLine?: number | undefined;
        maxLines?: number | undefined;
        fontFamily?: string | undefined;
        fontSize?: number | undefined;
        lineHeight?: number | undefined;
        textColor?: string | undefined;
        highlightColor?: string | undefined;
        strokeColor?: string | undefined;
        strokeWidth?: number | undefined;
        backgroundColor?: string | undefined;
        backgroundOpacity?: number | undefined;
        paddingX?: number | undefined;
        paddingY?: number | undefined;
        borderRadius?: number | undefined;
        bottomOffset?: number | undefined;
    } | undefined;
}>;
export declare const CreateRenderRequestSchema: z.ZodObject<{
    composition_id: z.ZodString;
    input_props: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    output_settings: z.ZodObject<{
        format: z.ZodEnum<["mp4", "webm", "mov", "gif"]>;
        codec: z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>;
        width: z.ZodNumber;
        height: z.ZodNumber;
        fps: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    }, {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    }>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high", "urgent"]>>;
}, "strip", z.ZodTypeAny, {
    composition_id: string;
    input_props: Record<string, unknown>;
    output_settings: {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    };
    priority: "low" | "normal" | "high" | "urgent";
}, {
    composition_id: string;
    input_props: Record<string, unknown>;
    output_settings: {
        width: number;
        height: number;
        codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
        format: "mp4" | "webm" | "mov" | "gif";
        fps: number;
    };
    priority?: "low" | "normal" | "high" | "urgent" | undefined;
}>;
export declare const RenderListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        project_id: z.ZodString;
        composition_id: z.ZodString;
        status: z.ZodEnum<["pending", "queued", "rendering", "completed", "failed", "cancelled"]>;
        input_props: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        output_settings: z.ZodObject<{
            format: z.ZodEnum<["mp4", "webm", "mov", "gif"]>;
            codec: z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>;
            width: z.ZodNumber;
            height: z.ZodNumber;
            fps: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
            codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
            format: "mp4" | "webm" | "mov" | "gif";
            fps: number;
        }, {
            width: number;
            height: number;
            codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
            format: "mp4" | "webm" | "mov" | "gif";
            fps: number;
        }>;
        priority: z.ZodEnum<["low", "normal", "high", "urgent"]>;
        progress: z.ZodObject<{
            percent: z.ZodNumber;
            current_frame: z.ZodNumber;
            total_frames: z.ZodNumber;
            estimated_remaining_sec: z.ZodNullable<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            percent: number;
            current_frame: number;
            total_frames: number;
            estimated_remaining_sec: number | null;
        }, {
            percent: number;
            current_frame: number;
            total_frames: number;
            estimated_remaining_sec: number | null;
        }>;
        output: z.ZodNullable<z.ZodObject<{
            url: z.ZodNullable<z.ZodString>;
            size_bytes: z.ZodNullable<z.ZodNumber>;
            duration_ms: z.ZodNullable<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            duration_ms: number | null;
            size_bytes: number | null;
            url: string | null;
        }, {
            duration_ms: number | null;
            size_bytes: number | null;
            url: string | null;
        }>>;
        error: z.ZodNullable<z.ZodObject<{
            code: z.ZodString;
            message: z.ZodString;
            details: z.ZodNullable<z.ZodUnknown>;
        }, "strip", z.ZodTypeAny, {
            code: string;
            message: string;
            details?: unknown;
        }, {
            code: string;
            message: string;
            details?: unknown;
        }>>;
        created_at: z.ZodString;
        started_at: z.ZodNullable<z.ZodString>;
        completed_at: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        created_at: string;
        status: "cancelled" | "pending" | "queued" | "rendering" | "completed" | "failed";
        error: {
            code: string;
            message: string;
            details?: unknown;
        } | null;
        project_id: string;
        composition_id: string;
        input_props: Record<string, unknown>;
        output_settings: {
            width: number;
            height: number;
            codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
            format: "mp4" | "webm" | "mov" | "gif";
            fps: number;
        };
        priority: "low" | "normal" | "high" | "urgent";
        progress: {
            percent: number;
            current_frame: number;
            total_frames: number;
            estimated_remaining_sec: number | null;
        };
        output: {
            duration_ms: number | null;
            size_bytes: number | null;
            url: string | null;
        } | null;
        started_at: string | null;
        completed_at: string | null;
    }, {
        id: string;
        created_at: string;
        status: "cancelled" | "pending" | "queued" | "rendering" | "completed" | "failed";
        error: {
            code: string;
            message: string;
            details?: unknown;
        } | null;
        project_id: string;
        composition_id: string;
        input_props: Record<string, unknown>;
        output_settings: {
            width: number;
            height: number;
            codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
            format: "mp4" | "webm" | "mov" | "gif";
            fps: number;
        };
        priority: "low" | "normal" | "high" | "urgent";
        progress: {
            percent: number;
            current_frame: number;
            total_frames: number;
            estimated_remaining_sec: number | null;
        };
        output: {
            duration_ms: number | null;
            size_bytes: number | null;
            url: string | null;
        } | null;
        started_at: string | null;
        completed_at: string | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    data: {
        id: string;
        created_at: string;
        status: "cancelled" | "pending" | "queued" | "rendering" | "completed" | "failed";
        error: {
            code: string;
            message: string;
            details?: unknown;
        } | null;
        project_id: string;
        composition_id: string;
        input_props: Record<string, unknown>;
        output_settings: {
            width: number;
            height: number;
            codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
            format: "mp4" | "webm" | "mov" | "gif";
            fps: number;
        };
        priority: "low" | "normal" | "high" | "urgent";
        progress: {
            percent: number;
            current_frame: number;
            total_frames: number;
            estimated_remaining_sec: number | null;
        };
        output: {
            duration_ms: number | null;
            size_bytes: number | null;
            url: string | null;
        } | null;
        started_at: string | null;
        completed_at: string | null;
    }[];
}, {
    data: {
        id: string;
        created_at: string;
        status: "cancelled" | "pending" | "queued" | "rendering" | "completed" | "failed";
        error: {
            code: string;
            message: string;
            details?: unknown;
        } | null;
        project_id: string;
        composition_id: string;
        input_props: Record<string, unknown>;
        output_settings: {
            width: number;
            height: number;
            codec: "h264" | "h265" | "vp8" | "vp9" | "prores";
            format: "mp4" | "webm" | "mov" | "gif";
            fps: number;
        };
        priority: "low" | "normal" | "high" | "urgent";
        progress: {
            percent: number;
            current_frame: number;
            total_frames: number;
            estimated_remaining_sec: number | null;
        };
        output: {
            duration_ms: number | null;
            size_bytes: number | null;
            url: string | null;
        } | null;
        started_at: string | null;
        completed_at: string | null;
    }[];
}>;
export declare const RenderOutputUrlResponseSchema: z.ZodObject<{
    download_url: z.ZodString;
    expires_at: z.ZodString;
    size_bytes: z.ZodNumber;
    duration_ms: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    duration_ms: number;
    size_bytes: number;
    expires_at: string;
    download_url: string;
}, {
    duration_ms: number;
    size_bytes: number;
    expires_at: string;
    download_url: string;
}>;
export declare const WebhookTriggerConfigSchema: z.ZodObject<{
    secret_header: z.ZodOptional<z.ZodString>;
    allowed_ips: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    secret_header?: string | undefined;
    allowed_ips?: string[] | undefined;
}, {
    secret_header?: string | undefined;
    allowed_ips?: string[] | undefined;
}>;
export declare const ScheduleTriggerConfigSchema: z.ZodObject<{
    cron: z.ZodString;
    timezone: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    cron: string;
    timezone: string;
}, {
    cron: string;
    timezone?: string | undefined;
}>;
export declare const AssetUploadTriggerConfigSchema: z.ZodObject<{
    asset_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
}, {
    asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
}>;
export declare const AutomationTriggerSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"webhook">;
    config: z.ZodObject<{
        secret_header: z.ZodOptional<z.ZodString>;
        allowed_ips: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        secret_header?: string | undefined;
        allowed_ips?: string[] | undefined;
    }, {
        secret_header?: string | undefined;
        allowed_ips?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "webhook";
    config: {
        secret_header?: string | undefined;
        allowed_ips?: string[] | undefined;
    };
}, {
    type: "webhook";
    config: {
        secret_header?: string | undefined;
        allowed_ips?: string[] | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"schedule">;
    config: z.ZodObject<{
        cron: z.ZodString;
        timezone: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        cron: string;
        timezone: string;
    }, {
        cron: string;
        timezone?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "schedule";
    config: {
        cron: string;
        timezone: string;
    };
}, {
    type: "schedule";
    config: {
        cron: string;
        timezone?: string | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"asset_upload">;
    config: z.ZodObject<{
        asset_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>, "many">>;
    }, "strip", z.ZodTypeAny, {
        asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
    }, {
        asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "asset_upload";
    config: {
        asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
    };
}, {
    type: "asset_upload";
    config: {
        asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
    };
}>]>;
export declare const RenderActionConfigSchema: z.ZodObject<{
    composition_id: z.ZodString;
    input_props_template: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    output_settings_override: z.ZodOptional<z.ZodObject<{
        format: z.ZodOptional<z.ZodEnum<["mp4", "webm", "mov", "gif"]>>;
        codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
        width: z.ZodOptional<z.ZodNumber>;
        height: z.ZodOptional<z.ZodNumber>;
        fps: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        width?: number | undefined;
        height?: number | undefined;
        codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        format?: "mp4" | "webm" | "mov" | "gif" | undefined;
        fps?: number | undefined;
    }, {
        width?: number | undefined;
        height?: number | undefined;
        codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        format?: "mp4" | "webm" | "mov" | "gif" | undefined;
        fps?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    composition_id: string;
    input_props_template: Record<string, unknown>;
    output_settings_override?: {
        width?: number | undefined;
        height?: number | undefined;
        codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        format?: "mp4" | "webm" | "mov" | "gif" | undefined;
        fps?: number | undefined;
    } | undefined;
}, {
    composition_id: string;
    input_props_template: Record<string, unknown>;
    output_settings_override?: {
        width?: number | undefined;
        height?: number | undefined;
        codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
        format?: "mp4" | "webm" | "mov" | "gif" | undefined;
        fps?: number | undefined;
    } | undefined;
}>;
export declare const NotificationActionConfigSchema: z.ZodObject<{
    channel: z.ZodEnum<["email", "webhook", "slack"]>;
    target: z.ZodString;
    template: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    channel: "email" | "webhook" | "slack";
    target: string;
    template?: string | undefined;
}, {
    channel: "email" | "webhook" | "slack";
    target: string;
    template?: string | undefined;
}>;
export declare const AutomationActionSchema: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"render">;
    config: z.ZodObject<{
        composition_id: z.ZodString;
        input_props_template: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        output_settings_override: z.ZodOptional<z.ZodObject<{
            format: z.ZodOptional<z.ZodEnum<["mp4", "webm", "mov", "gif"]>>;
            codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            fps: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            width?: number | undefined;
            height?: number | undefined;
            codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
            format?: "mp4" | "webm" | "mov" | "gif" | undefined;
            fps?: number | undefined;
        }, {
            width?: number | undefined;
            height?: number | undefined;
            codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
            format?: "mp4" | "webm" | "mov" | "gif" | undefined;
            fps?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        composition_id: string;
        input_props_template: Record<string, unknown>;
        output_settings_override?: {
            width?: number | undefined;
            height?: number | undefined;
            codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
            format?: "mp4" | "webm" | "mov" | "gif" | undefined;
            fps?: number | undefined;
        } | undefined;
    }, {
        composition_id: string;
        input_props_template: Record<string, unknown>;
        output_settings_override?: {
            width?: number | undefined;
            height?: number | undefined;
            codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
            format?: "mp4" | "webm" | "mov" | "gif" | undefined;
            fps?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "render";
    config: {
        composition_id: string;
        input_props_template: Record<string, unknown>;
        output_settings_override?: {
            width?: number | undefined;
            height?: number | undefined;
            codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
            format?: "mp4" | "webm" | "mov" | "gif" | undefined;
            fps?: number | undefined;
        } | undefined;
    };
}, {
    type: "render";
    config: {
        composition_id: string;
        input_props_template: Record<string, unknown>;
        output_settings_override?: {
            width?: number | undefined;
            height?: number | undefined;
            codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
            format?: "mp4" | "webm" | "mov" | "gif" | undefined;
            fps?: number | undefined;
        } | undefined;
    };
}>, z.ZodObject<{
    type: z.ZodLiteral<"notify">;
    config: z.ZodObject<{
        channel: z.ZodEnum<["email", "webhook", "slack"]>;
        target: z.ZodString;
        template: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        channel: "email" | "webhook" | "slack";
        target: string;
        template?: string | undefined;
    }, {
        channel: "email" | "webhook" | "slack";
        target: string;
        template?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: "notify";
    config: {
        channel: "email" | "webhook" | "slack";
        target: string;
        template?: string | undefined;
    };
}, {
    type: "notify";
    config: {
        channel: "email" | "webhook" | "slack";
        target: string;
        template?: string | undefined;
    };
}>]>;
export declare const AutomationSchema: z.ZodObject<{
    id: z.ZodString;
    project_id: z.ZodString;
    name: z.ZodString;
    enabled: z.ZodBoolean;
    trigger: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"webhook">;
        config: z.ZodObject<{
            secret_header: z.ZodOptional<z.ZodString>;
            allowed_ips: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        }, {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    }, {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"schedule">;
        config: z.ZodObject<{
            cron: z.ZodString;
            timezone: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            cron: string;
            timezone: string;
        }, {
            cron: string;
            timezone?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "schedule";
        config: {
            cron: string;
            timezone: string;
        };
    }, {
        type: "schedule";
        config: {
            cron: string;
            timezone?: string | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"asset_upload">;
        config: z.ZodObject<{
            asset_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        }, {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    }, {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    }>]>;
    actions: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"render">;
        config: z.ZodObject<{
            composition_id: z.ZodString;
            input_props_template: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            output_settings_override: z.ZodOptional<z.ZodObject<{
                format: z.ZodOptional<z.ZodEnum<["mp4", "webm", "mov", "gif"]>>;
                codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
                fps: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            }, {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        }, {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    }, {
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"notify">;
        config: z.ZodObject<{
            channel: z.ZodEnum<["email", "webhook", "slack"]>;
            target: z.ZodString;
            template: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        }, {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    }, {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    }>]>, "many">;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    last_triggered_at: z.ZodNullable<z.ZodString>;
    trigger_count: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    project_id: string;
    enabled: boolean;
    trigger: {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    } | {
        type: "schedule";
        config: {
            cron: string;
            timezone: string;
        };
    } | {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    };
    actions: ({
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    } | {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    })[];
    last_triggered_at: string | null;
    trigger_count: number;
}, {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
    project_id: string;
    enabled: boolean;
    trigger: {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    } | {
        type: "schedule";
        config: {
            cron: string;
            timezone?: string | undefined;
        };
    } | {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    };
    actions: ({
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    } | {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    })[];
    last_triggered_at: string | null;
    trigger_count: number;
}>;
export declare const CreateAutomationRequestSchema: z.ZodObject<{
    name: z.ZodString;
    trigger: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"webhook">;
        config: z.ZodObject<{
            secret_header: z.ZodOptional<z.ZodString>;
            allowed_ips: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        }, {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    }, {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"schedule">;
        config: z.ZodObject<{
            cron: z.ZodString;
            timezone: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            cron: string;
            timezone: string;
        }, {
            cron: string;
            timezone?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "schedule";
        config: {
            cron: string;
            timezone: string;
        };
    }, {
        type: "schedule";
        config: {
            cron: string;
            timezone?: string | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"asset_upload">;
        config: z.ZodObject<{
            asset_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        }, {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    }, {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    }>]>;
    actions: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"render">;
        config: z.ZodObject<{
            composition_id: z.ZodString;
            input_props_template: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            output_settings_override: z.ZodOptional<z.ZodObject<{
                format: z.ZodOptional<z.ZodEnum<["mp4", "webm", "mov", "gif"]>>;
                codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
                fps: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            }, {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        }, {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    }, {
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"notify">;
        config: z.ZodObject<{
            channel: z.ZodEnum<["email", "webhook", "slack"]>;
            target: z.ZodString;
            template: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        }, {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    }, {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    }>]>, "many">;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    enabled: boolean;
    trigger: {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    } | {
        type: "schedule";
        config: {
            cron: string;
            timezone: string;
        };
    } | {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    };
    actions: ({
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    } | {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    })[];
}, {
    name: string;
    trigger: {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    } | {
        type: "schedule";
        config: {
            cron: string;
            timezone?: string | undefined;
        };
    } | {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    };
    actions: ({
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    } | {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    })[];
    enabled?: boolean | undefined;
}>;
export declare const UpdateAutomationRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    trigger: z.ZodOptional<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"webhook">;
        config: z.ZodObject<{
            secret_header: z.ZodOptional<z.ZodString>;
            allowed_ips: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        }, {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    }, {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"schedule">;
        config: z.ZodObject<{
            cron: z.ZodString;
            timezone: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            cron: string;
            timezone: string;
        }, {
            cron: string;
            timezone?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "schedule";
        config: {
            cron: string;
            timezone: string;
        };
    }, {
        type: "schedule";
        config: {
            cron: string;
            timezone?: string | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"asset_upload">;
        config: z.ZodObject<{
            asset_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>, "many">>;
        }, "strip", z.ZodTypeAny, {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        }, {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    }, {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    }>]>>;
    actions: z.ZodOptional<z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"render">;
        config: z.ZodObject<{
            composition_id: z.ZodString;
            input_props_template: z.ZodRecord<z.ZodString, z.ZodUnknown>;
            output_settings_override: z.ZodOptional<z.ZodObject<{
                format: z.ZodOptional<z.ZodEnum<["mp4", "webm", "mov", "gif"]>>;
                codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
                width: z.ZodOptional<z.ZodNumber>;
                height: z.ZodOptional<z.ZodNumber>;
                fps: z.ZodOptional<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            }, {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        }, {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    }, {
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    }>, z.ZodObject<{
        type: z.ZodLiteral<"notify">;
        config: z.ZodObject<{
            channel: z.ZodEnum<["email", "webhook", "slack"]>;
            target: z.ZodString;
            template: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        }, {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    }, {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    }>]>, "many">>;
    enabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    enabled?: boolean | undefined;
    trigger?: {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    } | {
        type: "schedule";
        config: {
            cron: string;
            timezone: string;
        };
    } | {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    } | undefined;
    actions?: ({
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    } | {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    })[] | undefined;
}, {
    name?: string | undefined;
    enabled?: boolean | undefined;
    trigger?: {
        type: "webhook";
        config: {
            secret_header?: string | undefined;
            allowed_ips?: string[] | undefined;
        };
    } | {
        type: "schedule";
        config: {
            cron: string;
            timezone?: string | undefined;
        };
    } | {
        type: "asset_upload";
        config: {
            asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
        };
    } | undefined;
    actions?: ({
        type: "render";
        config: {
            composition_id: string;
            input_props_template: Record<string, unknown>;
            output_settings_override?: {
                width?: number | undefined;
                height?: number | undefined;
                codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                fps?: number | undefined;
            } | undefined;
        };
    } | {
        type: "notify";
        config: {
            channel: "email" | "webhook" | "slack";
            target: string;
            template?: string | undefined;
        };
    })[] | undefined;
}>;
export declare const TriggerAutomationRequestSchema: z.ZodRecord<z.ZodString, z.ZodUnknown>;
export declare const TriggerAutomationResponseSchema: z.ZodObject<{
    execution_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    execution_id: string;
}, {
    execution_id: string;
}>;
export declare const AutomationListResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        project_id: z.ZodString;
        name: z.ZodString;
        enabled: z.ZodBoolean;
        trigger: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"webhook">;
            config: z.ZodObject<{
                secret_header: z.ZodOptional<z.ZodString>;
                allowed_ips: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            }, "strip", z.ZodTypeAny, {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            }, {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "webhook";
            config: {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            };
        }, {
            type: "webhook";
            config: {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            };
        }>, z.ZodObject<{
            type: z.ZodLiteral<"schedule">;
            config: z.ZodObject<{
                cron: z.ZodString;
                timezone: z.ZodDefault<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                cron: string;
                timezone: string;
            }, {
                cron: string;
                timezone?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "schedule";
            config: {
                cron: string;
                timezone: string;
            };
        }, {
            type: "schedule";
            config: {
                cron: string;
                timezone?: string | undefined;
            };
        }>, z.ZodObject<{
            type: z.ZodLiteral<"asset_upload">;
            config: z.ZodObject<{
                asset_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["video", "audio", "image", "subtitle", "font", "other"]>, "many">>;
            }, "strip", z.ZodTypeAny, {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            }, {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "asset_upload";
            config: {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            };
        }, {
            type: "asset_upload";
            config: {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            };
        }>]>;
        actions: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
            type: z.ZodLiteral<"render">;
            config: z.ZodObject<{
                composition_id: z.ZodString;
                input_props_template: z.ZodRecord<z.ZodString, z.ZodUnknown>;
                output_settings_override: z.ZodOptional<z.ZodObject<{
                    format: z.ZodOptional<z.ZodEnum<["mp4", "webm", "mov", "gif"]>>;
                    codec: z.ZodOptional<z.ZodEnum<["h264", "h265", "vp8", "vp9", "prores"]>>;
                    width: z.ZodOptional<z.ZodNumber>;
                    height: z.ZodOptional<z.ZodNumber>;
                    fps: z.ZodOptional<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                }, {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            }, {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "render";
            config: {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            };
        }, {
            type: "render";
            config: {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            };
        }>, z.ZodObject<{
            type: z.ZodLiteral<"notify">;
            config: z.ZodObject<{
                channel: z.ZodEnum<["email", "webhook", "slack"]>;
                target: z.ZodString;
                template: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            }, {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            type: "notify";
            config: {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            };
        }, {
            type: "notify";
            config: {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            };
        }>]>, "many">;
        created_at: z.ZodString;
        updated_at: z.ZodString;
        last_triggered_at: z.ZodNullable<z.ZodString>;
        trigger_count: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        project_id: string;
        enabled: boolean;
        trigger: {
            type: "webhook";
            config: {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            };
        } | {
            type: "schedule";
            config: {
                cron: string;
                timezone: string;
            };
        } | {
            type: "asset_upload";
            config: {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            };
        };
        actions: ({
            type: "render";
            config: {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            };
        } | {
            type: "notify";
            config: {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            };
        })[];
        last_triggered_at: string | null;
        trigger_count: number;
    }, {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        project_id: string;
        enabled: boolean;
        trigger: {
            type: "webhook";
            config: {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            };
        } | {
            type: "schedule";
            config: {
                cron: string;
                timezone?: string | undefined;
            };
        } | {
            type: "asset_upload";
            config: {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            };
        };
        actions: ({
            type: "render";
            config: {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            };
        } | {
            type: "notify";
            config: {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            };
        })[];
        last_triggered_at: string | null;
        trigger_count: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    data: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        project_id: string;
        enabled: boolean;
        trigger: {
            type: "webhook";
            config: {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            };
        } | {
            type: "schedule";
            config: {
                cron: string;
                timezone: string;
            };
        } | {
            type: "asset_upload";
            config: {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            };
        };
        actions: ({
            type: "render";
            config: {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            };
        } | {
            type: "notify";
            config: {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            };
        })[];
        last_triggered_at: string | null;
        trigger_count: number;
    }[];
}, {
    data: {
        id: string;
        name: string;
        created_at: string;
        updated_at: string;
        project_id: string;
        enabled: boolean;
        trigger: {
            type: "webhook";
            config: {
                secret_header?: string | undefined;
                allowed_ips?: string[] | undefined;
            };
        } | {
            type: "schedule";
            config: {
                cron: string;
                timezone?: string | undefined;
            };
        } | {
            type: "asset_upload";
            config: {
                asset_types?: ("video" | "audio" | "image" | "subtitle" | "font" | "other")[] | undefined;
            };
        };
        actions: ({
            type: "render";
            config: {
                composition_id: string;
                input_props_template: Record<string, unknown>;
                output_settings_override?: {
                    width?: number | undefined;
                    height?: number | undefined;
                    codec?: "h264" | "h265" | "vp8" | "vp9" | "prores" | undefined;
                    format?: "mp4" | "webm" | "mov" | "gif" | undefined;
                    fps?: number | undefined;
                } | undefined;
            };
        } | {
            type: "notify";
            config: {
                channel: "email" | "webhook" | "slack";
                target: string;
                template?: string | undefined;
            };
        })[];
        last_triggered_at: string | null;
        trigger_count: number;
    }[];
}>;
export declare const ValidationErrorSchema: z.ZodObject<{
    field: z.ZodString;
    code: z.ZodString;
    message: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    field: string;
}, {
    code: string;
    message: string;
    field: string;
}>;
export declare const ProblemDetailsSchema: z.ZodObject<{
    type: z.ZodString;
    title: z.ZodString;
    status: z.ZodNumber;
    detail: z.ZodString;
    instance: z.ZodString;
    errors: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        code: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        field: string;
    }, {
        code: string;
        message: string;
        field: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: string;
    status: number;
    title: string;
    detail: string;
    instance: string;
    errors?: {
        code: string;
        message: string;
        field: string;
    }[] | undefined;
}, {
    type: string;
    status: number;
    title: string;
    detail: string;
    instance: string;
    errors?: {
        code: string;
        message: string;
        field: string;
    }[] | undefined;
}>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type AssetId = z.infer<typeof AssetIdSchema>;
export type RenderId = z.infer<typeof RenderIdSchema>;
export type AutomationId = z.infer<typeof AutomationIdSchema>;
export type WordTimestamp = z.infer<typeof WordTimestampSchema>;
export type CaptionSegment = z.infer<typeof CaptionSegmentSchema>;
export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type AssetStatus = z.infer<typeof AssetStatusSchema>;
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type CreateAssetUploadRequest = z.infer<typeof CreateAssetUploadRequestSchema>;
export type CreateAssetUploadResponse = z.infer<typeof CreateAssetUploadResponseSchema>;
export type AssetListResponse = z.infer<typeof AssetListResponseSchema>;
export type RenderStatus = z.infer<typeof RenderStatusSchema>;
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type VideoCodec = z.infer<typeof VideoCodecSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type OutputSettings = z.infer<typeof OutputSettingsSchema>;
export type RenderProgress = z.infer<typeof RenderProgressSchema>;
export type RenderOutput = z.infer<typeof RenderOutputSchema>;
export type RenderError = z.infer<typeof RenderErrorSchema>;
export type Render = z.infer<typeof RenderSchema>;
export type CaptionedVideoInputProps = z.infer<typeof CaptionedVideoInputPropsSchema>;
export type CreateRenderRequest = z.infer<typeof CreateRenderRequestSchema>;
export type RenderListResponse = z.infer<typeof RenderListResponseSchema>;
export type RenderOutputUrlResponse = z.infer<typeof RenderOutputUrlResponseSchema>;
export type WebhookTriggerConfig = z.infer<typeof WebhookTriggerConfigSchema>;
export type ScheduleTriggerConfig = z.infer<typeof ScheduleTriggerConfigSchema>;
export type AssetUploadTriggerConfig = z.infer<typeof AssetUploadTriggerConfigSchema>;
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;
export type RenderActionConfig = z.infer<typeof RenderActionConfigSchema>;
export type NotificationActionConfig = z.infer<typeof NotificationActionConfigSchema>;
export type AutomationAction = z.infer<typeof AutomationActionSchema>;
export type Automation = z.infer<typeof AutomationSchema>;
export type CreateAutomationRequest = z.infer<typeof CreateAutomationRequestSchema>;
export type UpdateAutomationRequest = z.infer<typeof UpdateAutomationRequestSchema>;
export type TriggerAutomationRequest = z.infer<typeof TriggerAutomationRequestSchema>;
export type TriggerAutomationResponse = z.infer<typeof TriggerAutomationResponseSchema>;
export type AutomationListResponse = z.infer<typeof AutomationListResponseSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
export type UserId = z.infer<typeof UserIdSchema>;
export type PlanTier = z.infer<typeof PlanTierSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserMeResponse = z.infer<typeof UserMeResponseSchema>;
export type VideoType = z.infer<typeof VideoTypeSchema>;
export type CalculateCostRequest = z.infer<typeof CalculateCostRequestSchema>;
export type CalculateCostResponse = z.infer<typeof CalculateCostResponseSchema>;
export type BuyCreditsRequest = z.infer<typeof BuyCreditsRequestSchema>;
export type BuyCreditsResponse = z.infer<typeof BuyCreditsResponseSchema>;
export type CreditTransaction = z.infer<typeof CreditTransactionSchema>;
//# sourceMappingURL=schemas.d.ts.map
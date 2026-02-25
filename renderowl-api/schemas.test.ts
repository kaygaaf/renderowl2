import { describe, it, expect } from 'vitest';
import {
  // Project schemas
  ProjectIdSchema,
  ProjectSchema,
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  
  // Asset schemas
  AssetIdSchema,
  AssetSchema,
  CreateAssetUploadRequestSchema,
  AssetTypeSchema,
  AssetStatusSchema,
  
  // Render schemas
  RenderIdSchema,
  RenderSchema,
  CreateRenderRequestSchema,
  RenderStatusSchema,
  PrioritySchema,
  OutputSettingsSchema,
  CaptionedVideoInputPropsSchema,
  
  // Automation schemas
  AutomationIdSchema,
  AutomationSchema,
  CreateAutomationRequestSchema,
  
  // Caption types
  CaptionSegmentSchema,
  WordTimestampSchema,
  CaptionStyleSchema,
} from './schemas';

describe('Project ID Validation', () => {
  it('accepts valid project IDs', () => {
    expect(ProjectIdSchema.safeParse('proj_abc123xyz789').success).toBe(true);
    expect(ProjectIdSchema.safeParse('proj_a1b2c3d4e5f6g7h8').success).toBe(true);
  });

  it('rejects invalid project IDs', () => {
    expect(ProjectIdSchema.safeParse('proj_abc').success).toBe(false); // too short
    expect(ProjectIdSchema.safeParse('invalid_abc123xyz').success).toBe(false); // wrong prefix
    expect(ProjectIdSchema.safeParse('proj_abc-123').success).toBe(false); // hyphen
  });
});

describe('Create Project Request', () => {
  it('accepts valid project creation', () => {
    const valid = {
      name: 'Summer Campaign 2025',
      description: 'Q3 marketing videos',
      settings: {
        default_width: 1080,
        default_height: 1920,
        default_fps: 30,
        default_duration_sec: 60,
      },
    };

    const result = CreateProjectRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts minimal project creation', () => {
    const minimal = {
      name: 'Test Project',
    };

    const result = CreateProjectRequestSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = {
      name: '',
    };

    const result = CreateProjectRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects name too long', () => {
    const invalid = {
      name: 'a'.repeat(256),
    };

    const result = CreateProjectRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Update Project Request', () => {
  it('accepts partial updates', () => {
    const partial = {
      description: 'Updated description',
    };

    const result = UpdateProjectRequestSchema.safeParse(partial);
    expect(result.success).toBe(true);
  });

  it('accepts empty update', () => {
    const result = UpdateProjectRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('Full Project Schema', () => {
  it('validates complete project', () => {
    const project = {
      id: 'proj_test123456789',
      name: 'Test Project',
      description: null,
      status: 'active',
      settings: {
        default_width: 1080,
        default_height: 1920,
        default_fps: 30,
        default_duration_sec: 60,
      },
      created_at: '2025-02-25T01:24:00Z',
      updated_at: '2025-02-25T01:24:00Z',
      created_by: 'user_123',
      asset_count: 5,
      render_count: 3,
    };

    const result = ProjectSchema.safeParse(project);
    expect(result.success).toBe(true);
  });
});

describe('Asset Upload Request', () => {
  it('accepts valid upload request', () => {
    const valid = {
      filename: 'intro.mp4',
      content_type: 'video/mp4',
      size_bytes: 52428800,
    };

    const result = CreateAssetUploadRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects oversized files', () => {
    const oversized = {
      filename: 'large.mp4',
      content_type: 'video/mp4',
      size_bytes: 20 * 1024 * 1024 * 1024, // 20GB
    };

    const result = CreateAssetUploadRequestSchema.safeParse(oversized);
    expect(result.success).toBe(false);
  });
});

describe('Render Creation Request', () => {
  it('accepts valid render request', () => {
    const valid = {
      composition_id: 'CaptionedVideo',
      input_props: {
        videoSrc: 'asset://assets/abc123',
        captions: [
          { startMs: 0, endMs: 2500, text: 'Hello world' },
        ],
        captionStyle: {
          fontSize: 64,
          textColor: '#FFFFFF',
        },
      },
      output_settings: {
        format: 'mp4',
        codec: 'h264',
        width: 1080,
        height: 1920,
        fps: 30,
      },
      priority: 'high',
    };

    const result = CreateRenderRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies default priority', () => {
    const minimal = {
      composition_id: 'CaptionedVideo',
      input_props: {},
      output_settings: {
        format: 'mp4',
        codec: 'h264',
        width: 1080,
        height: 1920,
        fps: 30,
      },
    };

    const result = CreateRenderRequestSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe('normal');
    }
  });
});

describe('CaptionedVideo Input Props', () => {
  it('accepts array captions', () => {
    const props = {
      captions: [
        { startMs: 0, endMs: 1000, text: 'First' },
        { startMs: 1000, endMs: 2000, text: 'Second', words: [
          { startMs: 1000, endMs: 1500, word: 'Second' },
        ]},
      ],
    };

    const result = CaptionedVideoInputPropsSchema.safeParse(props);
    expect(result.success).toBe(true);
  });

  it('accepts asset URL for captions', () => {
    const props = {
      captions: 'asset://assets/captions.json',
      videoSrc: 'https://cdn.example.com/video.mp4',
    };

    const result = CaptionedVideoInputPropsSchema.safeParse(props);
    expect(result.success).toBe(true);
  });

  it('accepts valid hex colors', () => {
    const props = {
      captions: [{ startMs: 0, endMs: 1000, text: 'Test' }],
      captionStyle: {
        textColor: '#FF5733',
        highlightColor: '#FFFFFF',
        backgroundColor: '#000000',
      },
    };

    const result = CaptionedVideoInputPropsSchema.safeParse(props);
    expect(result.success).toBe(true);
  });

  it('rejects invalid hex colors', () => {
    const props = {
      captions: [{ startMs: 0, endMs: 1000, text: 'Test' }],
      captionStyle: {
        textColor: 'red', // not hex
      },
    };

    const result = CaptionedVideoInputPropsSchema.safeParse(props);
    expect(result.success).toBe(false);
  });
});

describe('Automation Creation', () => {
  it('accepts webhook automation', () => {
    const valid = {
      name: 'Auto-render on upload',
      trigger: {
        type: 'webhook' as const,
        config: {
          secret_header: 'X-Secret-Key',
        },
      },
      actions: [
        {
          type: 'render' as const,
          config: {
            composition_id: 'CaptionedVideo',
            input_props_template: {
              videoSrc: '{{trigger.video_url}}',
            },
          },
        },
      ],
    };

    const result = CreateAutomationRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts schedule automation', () => {
    const valid = {
      name: 'Daily render',
      trigger: {
        type: 'schedule' as const,
        config: {
          cron: '0 9 * * 1',
          timezone: 'America/New_York',
        },
      },
      actions: [
        {
          type: 'notify' as const,
          config: {
            channel: 'email' as const,
            target: 'user@example.com',
          },
        },
      ],
    };

    const result = CreateAutomationRequestSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid cron', () => {
    const invalid = {
      name: 'Bad cron',
      trigger: {
        type: 'schedule' as const,
        config: {
          cron: 'invalid cron',
        },
      },
      actions: [],
    };

    const result = CreateAutomationRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('requires at least one action', () => {
    const invalid = {
      name: 'No actions',
      trigger: {
        type: 'webhook' as const,
        config: {},
      },
      actions: [],
    };

    const result = CreateAutomationRequestSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Full Render Schema', () => {
  it('validates complete render', () => {
    const render = {
      id: 'rnd_test123456789',
      project_id: 'proj_test123456789',
      composition_id: 'CaptionedVideo',
      status: 'rendering',
      input_props: { captions: [] },
      output_settings: {
        format: 'mp4',
        codec: 'h264',
        width: 1080,
        height: 1920,
        fps: 30,
      },
      priority: 'high',
      progress: {
        percent: 45.5,
        current_frame: 450,
        total_frames: 990,
        estimated_remaining_sec: 120,
      },
      output: null,
      error: null,
      created_at: '2025-02-25T01:24:00Z',
      started_at: '2025-02-25T01:25:00Z',
      completed_at: null,
    };

    const result = RenderSchema.safeParse(render);
    expect(result.success).toBe(true);
  });
});

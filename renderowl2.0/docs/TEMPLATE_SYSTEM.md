# 🎨 Renderowl 2.0 Template System

## Overview

The Template System allows users to create videos quickly using pre-designed templates. Templates include structured scenes, placeholder content, and default styling that can be customized for any project.

## Architecture

### Backend

#### Domain Models (`backend/internal/domain/template.go`)

```go
// Core template structure
type Template struct {
    ID          string          // Unique identifier
    Name        string          // Template name
    Description string          // Description
    Category    string          // youtube, tiktok, ads, etc.
    Thumbnail   string          // Emoji or image URL
    Gradient    string          // Tailwind gradient classes
    Duration    float64         // Total duration in seconds
    Width       int             // Video width
    Height      int             // Video height
    FPS         int             // Frames per second
    Scenes      []TemplateScene // Scene definitions
    Popularity  int             // 0-100 popularity score
    Version     int             // Template version
    IsActive    bool            // Active status
    Tags        []string        // Search tags
}

type TemplateScene struct {
    ID          string          // Scene identifier
    Name        string          // Scene name
    Description string          // Scene description
    Duration    float64         // Scene duration
    Order       int             // Scene order
    Clips       []TemplateClip  // Clips in scene
    Transitions *TemplateTransition
}
```

#### Repository (`backend/internal/repository/template.go`)

- Database model with JSONB support for scenes
- Auto-seeding of default templates
- Version management for template updates
- Category filtering and search

#### Service (`backend/internal/service/template.go`)

- Template listing with filters
- Template-to-timeline conversion
- Placeholder replacement
- Scene-to-track mapping

#### API Handlers (`backend/internal/handlers/template.go`)

```
GET  /api/v1/templates              - List templates
GET  /api/v1/templates/categories   - Get categories
GET  /api/v1/templates/stats        - Get stats
GET  /api/v1/templates/:id          - Get template details
POST /api/v1/templates/:id/use      - Create timeline from template
```

### Frontend

#### Components

| Component | Location | Purpose |
|-----------|----------|---------|
| TemplateCard | `components/templates/TemplateCard.tsx` | Individual template card |
| TemplatePreview | `components/templates/TemplatePreview.tsx` | Preview modal with scene navigation |
| TemplateCategories | `components/templates/TemplateCategories.tsx` | Category filter buttons |
| TemplatesGallery | `components/templates/TemplatesGallery.tsx` | Gallery grid view |

#### Page

**`app/templates/page.tsx`** - Main templates page with:
- Search functionality
- Category filtering
- API integration
- Template preview modal
- "Use Template" workflow

## Templates Included (10)

| # | Template | Category | Duration | Resolution | Scenes |
|---|----------|----------|----------|------------|--------|
| 1 | YouTube Intro Pro | youtube | 8s | 1920x1080 | 3 |
| 2 | Product Demo | ads | 30s | 1920x1080 | 4 |
| 3 | Educational Tutorial | education | 60s | 1920x1080 | 5 |
| 4 | TikTok Viral Style | tiktok | 15s | 1080x1920 | 3 |
| 5 | Instagram Reel | instagram | 15s | 1080x1920 | 3 |
| 6 | Ad Commercial | ads | 30s | 1920x1080 | 4 |
| 7 | News Update | news | 45s | 1920x1080 | 4 |
| 8 | Storytelling | storytelling | 90s | 1920x1080 | 4 |
| 9 | Listicle Video | listicle | 75s | 1920x1080 | 5 |
| 10 | Explainer Video | explainer | 60s | 1920x1080 | 6 |

## Usage Flow

1. **Browse Templates** - User visits `/templates`
2. **Filter/Search** - Filter by category or search by name/tag
3. **Preview** - Click "Preview" to see scene breakdown
4. **Use Template** - Click "Use Template" to create timeline
5. **Edit** - Redirected to editor with pre-populated timeline

## API Usage

### List Templates
```bash
GET /api/v1/templates?category=youtube&search=intro
```

### Use Template
```bash
POST /api/v1/templates/tpl-youtube-intro/use
{
  "name": "My YouTube Intro",
  "description": "Custom intro for my channel",
  "customData": {
    "enter_channel_name": "My Awesome Channel"
  }
}
```

Response:
```json
{
  "timelineId": "uuid",
  "message": "Timeline created successfully from template",
  "templateId": "tpl-youtube-intro",
  "createdAt": "2024-..."
}
```

## Database Schema

```sql
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    thumbnail VARCHAR(255) NOT NULL,
    gradient VARCHAR(100) NOT NULL,
    icon VARCHAR(10) NOT NULL,
    duration FLOAT DEFAULT 60,
    width INTEGER DEFAULT 1920,
    height INTEGER DEFAULT 1080,
    fps INTEGER DEFAULT 30,
    scenes JSONB,
    popularity INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    tags JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_active ON templates(is_active);
```

## Adding New Templates

To add a new template, edit `backend/internal/domain/template.go`:

```go
func getMyNewTemplate() *Template {
    return &Template{
        ID:          "tpl-my-template",
        Name:        "My New Template",
        Description: "Description here",
        Category:    string(CategoryYouTube),
        Thumbnail:   "🎬",
        Icon:        "🎬",
        Gradient:    "from-blue-500 to-purple-600",
        Duration:    30,
        Width:       1920,
        Height:      1080,
        FPS:         30,
        Popularity:  85,
        Version:     1,
        IsActive:    true,
        Tags:        []string{"tag1", "tag2"},
        Scenes: []TemplateScene{
            // Define scenes here
        },
    }
}
```

Then add it to `GetDefaultTemplates()`:
```go
return []*Template{
    // ... existing templates
    getMyNewTemplate(),
}
```

The template will be auto-seeded on next server start.

## Future Enhancements

- [ ] User-created templates
- [ ] Template marketplace
- [ ] AI-generated templates
- [ ] Template ratings/reviews
- [ ] Template collections
- [ ] Import from external sources (Canva, etc.)

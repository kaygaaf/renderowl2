# 🦉 Renderowl 2.0 - Complete User Flow Documentation

## Overview
This document describes the complete end-to-end user flow for Renderowl 2.0, showing how all integrated components work together.

---

## 1. Landing & Authentication

### Entry Points
- **Landing Page** (`/`)
  - Hero section with CTA to sign up
  - Features showcase
  - Pricing information
  - Links to `/auth` for login/signup

### Authentication Flow
```
User clicks "Get Started" or "Sign In"
    ↓
Redirect to /auth?mode=signup or /auth?mode=login
    ↓
Clerk authentication component
    ↓
On success → Redirect to /dashboard
```

**Files:**
- `frontend/src/app/page.tsx` - Landing page
- `frontend/src/app/auth/page.tsx` - Auth page
- `frontend/src/contexts/AuthContext.tsx` - Auth state management

---

## 2. Dashboard

### Dashboard Features (`/dashboard`)
After login, users land on the dashboard with:

1. **Quick Actions**
   - "Create New Video" → `/editor` (fresh start)
   - "Browse Templates" → `/templates`

2. **Stats Cards**
   - Total videos created
   - Minutes generated
   - Credits used

3. **Recent Projects**
   - List of recent timelines
   - Click to edit → `/editor?id={projectId}`
   - Status badges (draft/processing/completed)

4. **Quick Start Templates**
   - 3 featured templates
   - Click → `/editor?template={id}`

5. **Usage Progress**
   - Monthly credit usage bar
   - Upgrade link

**Files:**
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/components/dashboard/DashboardContent.tsx`

---

## 3. Editor Entry Points

Users can enter the editor through 3 paths:

### Path A: Start Fresh (`/editor`)
```
Dashboard → "Create New Video" button
    ↓
Empty editor with default tracks (Video, Audio, Text)
```

### Path B: Use Template (`/editor?template={id}`)
```
Dashboard → "Browse Templates" OR Quick Template
    ↓
/templates page
    ↓
Select template
    ↓
POST /api/v1/templates/{id}/use
    ↓
Backend creates timeline from template
    ↓
Redirect to /editor?id={newTimelineId}
    ↓
Editor loads with pre-populated tracks/clips
```

### Path C: Edit Existing (`/editor?id={projectId}`)
```
Dashboard → Click on recent project
    ↓
GET /api/v1/timelines/{id}
    ↓
GET /api/v1/timelines/{id}/tracks
    ↓
GET /api/v1/timelines/{id}/clips
    ↓
Editor loads with existing timeline
```

---

## 4. Integrated Editor (`/editor`)

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│  Navbar (logo, user menu)                                    │
├─────────────────────────────────────────────────────────────┤
│  Left Sidebar    │     Main Editor      │  Right Sidebar    │
│  (270px)         │     (flexible)       │  (288px)          │
│                  │                      │                   │
│  - Back button   │  ┌────────────────┐  │  - Properties     │
│  - AI Generate   │  │                │  │  - Duration       │
│    button/toggle │  │  Video Preview │  │  - FPS            │
│  - Asset library │  │  (Remotion)    │  │  - Resolution     │
│    (images,      │  │                │  │  - Transition     │
│     audio, video)│  └────────────────┘  │                   │
│  - Add Track     │                      │                   │
│    buttons       │  ┌────────────────┐  │                   │
│                  │  │   Timeline     │  │                   │
│  When AI active: │  │   (tracks &    │  │                   │
│  - AI Wizard     │  │    clips)      │  │                   │
│    replaces      │  └────────────────┘  │                   │
│    assets        │                      │                   │
└──────────────────┴──────────────────────┴───────────────────┘
```

### Editor Features

#### 4.1 AI Generation (Left Sidebar)
When user clicks "AI Generate":
```
Show AITimelineGenerator component
    ↓
Step 1: Script Generation
  - Enter prompt
  - Select style, duration, scenes
  - Click "Generate Script"
  - POST /api/v1/ai/script
    ↓
Step 2: Scene Generation
  - Select image style (cinematic, realistic, etc.)
  - Select image source (Unsplash, DALL-E, etc.)
  - Click "Generate Scenes"
  - POST /api/v1/ai/scenes
    ↓
Step 3: Voice Generation
  - Select voice from list
  - GET /api/v1/ai/voices
  - Adjust settings (stability, clarity, speed)
  - Generate voice per scene
  - POST /api/v1/ai/voice
    ↓
Step 4: Build Timeline
  - Click "Generate Timeline"
  - Creates tracks in backend:
    POST /api/v1/timelines/{id}/tracks (video, audio, text)
  - Creates clips in backend:
    POST /api/v1/timelines/{id}/clips
  - Timeline updated with new tracks/clips
```

#### 4.2 Timeline Editing (Bottom Panel)
- **Tracks**: Video, Audio, Text tracks
- **Clips**: Visual representation of media
- **Playhead**: Red line showing current position
- **Controls**: Play/Pause, skip, time display
- **Track Actions**: Delete track button (hover)

#### 4.3 Video Preview (Center)
- Remotion player integration
- Renders actual video composition
- Updates with playhead position
- Play/Pause syncs with timeline controls

#### 4.4 Properties Panel (Right Sidebar)
- Duration slider
- FPS selector
- Resolution selector
- Transition selector
- Background color picker

#### 4.5 Toolbar Actions
- **Save**: POST/PUT /api/v1/timelines
- **Preview**: Toggle play/pause
- **Export**: POST /api/render → Starts video render job
- **Publish**: Opens PublishModal

---

## 5. Publishing Flow

### Open Publish Modal
```
Editor → Click "Publish" button
    ↓
PublishModal opens
    ↓
GET /api/v1/social/accounts → Load connected accounts
```

### Tab 1: Publish Now
```
1. Select Platforms
   - Shows platform cards (YouTube, TikTok, etc.)
   - Only enabled if account connected
   - "Connect account" link for disconnected platforms
   - Toggle selection with checkmark

2. Enter Details
   - Title input
   - Description textarea
   - Tags input (comma separated)
   - Privacy selector (public/unlisted/private)

3. Click "Publish Now"
   - POST /api/v1/social/crosspost
   - Backend queues upload jobs
   - Shows success message
   - Redirects to analytics
```

### Tab 2: Schedule
```
1. Select Platforms (same as above)

2. Select Date/Time
   - Date picker
   - Time picker
   - Validates future date

3. Enter Details (same as above)

4. Click "Schedule Post"
   - POST /api/v1/social/schedule
   - Backend stores scheduled post
   - Worker processes at scheduled time
   - Shows success message
```

### Platform OAuth Flow
```
User clicks "Connect account" for platform
    ↓
GET /api/v1/social/auth/{platform}
    ↓
Returns OAuth URL
    ↓
Open popup to platform OAuth
    ↓
User authorizes app
    ↓
Platform redirects with code
    ↓
POST /api/v1/social/callback/{platform}
    ↓
Backend exchanges code for tokens
    ↓
Account now connected ✅
```

---

## 6. Analytics (`/dashboard/analytics`)

After publishing, users can view:

### Analytics Dashboard
- **Overview Stats**: Total views, engagement rate, followers gained
- **Video Performance**: List of published videos with metrics
- **Platform Breakdown**: Performance by social platform
- **Engagement Metrics**: Likes, comments, shares over time
- **Growth Charts**: Follower/subscriber growth

### Data Sources
- Webhooks from social platforms update analytics
- GET /api/v1/analytics/dashboard
- GET /api/v1/analytics/videos
- GET /api/v1/social/analytics/{accountId}

---

## 7. Complete User Journey Example

### Scenario: New User Creates and Publishes Video

```
1. DISCOVERY
   User visits renderowl.com
   → Sees landing page
   → Clicks "Get Started"

2. SIGNUP
   → /auth?mode=signup
   → Creates account with Clerk
   → Redirected to /dashboard

3. DASHBOARD
   → Sees empty state "No projects yet"
   → Clicks "Browse Templates"

4. TEMPLATES
   → /templates
   → Browses categories (YouTube, TikTok, etc.)
   → Previews "Product Showcase" template
   → Clicks "Use Template"
   → POST /api/v1/templates/{id}/use
   → Redirected to /editor?id={newId}

5. EDITOR (Template Loaded)
   → Timeline pre-populated with 5 scenes
   → User clicks "AI Generate" in sidebar

6. AI GENERATION
   → Step 1: Enters prompt "Explain blockchain in 60 seconds"
   → Generates script with 4 scenes
   → Step 2: Selects "educational" style, DALL-E images
   → Generates scenes with AI images
   → Step 3: Selects "Josh" voice (ElevenLabs)
   → Generates narration for all scenes
   → Step 4: Click "Generate Timeline"
   → Creates new tracks with clips
   → Timeline now has AI content

7. EDITING
   → User drags clips to adjust timing
   → Changes text on scene 2
   → Clicks "Save"
   → POST /api/v1/timelines/{id}

8. PREVIEW
   → Clicks "Preview" button
   → Remotion player plays video
   → User watches entire video

9. EXPORT
   → Clicks "Export"
   → POST /api/render
   → Shows "Rendering..." status
   → Worker processes video
   → Email notification when done

10. PUBLISH
    → Clicks "Publish" button
    → PublishModal opens
    → Connects YouTube account (OAuth flow)
    → Selects YouTube platform
    → Enters title "Blockchain Explained in 60 Seconds"
    → Clicks "Publish Now"
    → POST /api/v1/social/crosspost
    → Video uploads to YouTube
    → Success message shown

11. ANALYTICS
    → Redirected to /dashboard/analytics
    → Sees new video in list
    → Views start appearing (from webhook)
    → Checks engagement metrics

12. RETURN
    → Goes back to /dashboard
    → New project appears in "Recent Projects"
    → Clicks it to edit again
```

---

## 8. API Endpoints Summary

### Authentication
- All endpoints require Bearer token (Clerk JWT)
- Middleware validates token and extracts userID

### Timelines
- `GET /api/v1/timelines` - List user's timelines
- `POST /api/v1/timelines` - Create new timeline
- `GET /api/v1/timelines/:id` - Get timeline details
- `PUT /api/v1/timelines/:id` - Update timeline
- `DELETE /api/v1/timelines/:id` - Delete timeline

### Tracks
- `GET /api/v1/timelines/:id/tracks` - List tracks
- `POST /api/v1/timelines/:id/tracks` - Create track
- `PUT /api/v1/tracks/:id` - Update track
- `DELETE /api/v1/tracks/:id` - Delete track

### Clips
- `GET /api/v1/timelines/:id/clips` - List clips
- `POST /api/v1/timelines/:id/clips` - Create clip
- `PUT /api/v1/clips/:id` - Update clip
- `DELETE /api/v1/clips/:id` - Delete clip

### Templates
- `GET /api/v1/templates` - List templates
- `GET /api/v1/templates/:id` - Get template
- `POST /api/v1/templates/:id/use` - Use template

### AI
- `POST /api/v1/ai/script` - Generate script
- `POST /api/v1/ai/scenes` - Generate scenes
- `POST /api/v1/ai/voice` - Generate voice
- `GET /api/v1/ai/voices` - List voices

### Social
- `GET /api/v1/social/accounts` - List connected accounts
- `GET /api/v1/social/auth/:platform` - Get OAuth URL
- `POST /api/v1/social/callback/:platform` - OAuth callback
- `POST /api/v1/social/crosspost` - Cross-post video
- `POST /api/v1/social/schedule` - Schedule post

---

## 9. File Structure

### Frontend Integration Points
```
frontend/src/
├── app/
│   ├── page.tsx                    # Landing
│   ├── auth/page.tsx               # Auth
│   ├── dashboard/page.tsx          # Dashboard
│   ├── templates/page.tsx          # Templates gallery
│   └── editor/page.tsx             # INTEGRATED EDITOR
├── components/
│   ├── ai/
│   │   ├── ScriptGenerator.tsx
│   │   ├── SceneGenerator.tsx
│   │   ├── VoiceSelector.tsx
│   │   ├── AIPanel.tsx
│   │   └── AITimelineGenerator.tsx # NEW: AI → Timeline
│   ├── social/
│   │   └── PublishModal.tsx        # NEW: Publishing
│   ├── templates/
│   │   ├── TemplatesGallery.tsx
│   │   └── TemplateTimelineLoader.tsx # NEW: Template → Timeline
│   ├── dashboard/
│   │   └── DashboardContent.tsx
│   └── editor/
│       └── VideoPlayer.tsx
├── lib/
│   └── api.ts                      # API client (updated)
└── contexts/
    └── AuthContext.tsx
```

---

## 10. Integration Verification

Run the verification script:
```bash
cd renderowl2.0
./scripts/verify-integration.sh
```

This checks all integration files are present and properly linked.

---

**🎉 Renderowl 2.0 is fully integrated and ready for users!**

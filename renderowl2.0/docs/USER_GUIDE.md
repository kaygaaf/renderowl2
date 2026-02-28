# 📖 Renderowl 2.0 - User Guide

Complete guide for using Renderowl 2.0 to create, edit, and publish AI-powered videos.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Video](#creating-your-first-video)
3. [Using AI Features](#using-ai-features)
4. [Timeline Editor](#timeline-editor)
5. [Publishing to Social Media](#publishing-to-social-media)
6. [Analytics](#analytics)
7. [Templates](#templates)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Creating an Account

1. Visit [renderowl.com](https://renderowl.com)
2. Click **"Get Started"** or **"Sign Up"**
3. Enter your email and create a password
4. Verify your email address
5. Complete your profile

### Dashboard Overview

After logging in, you'll see your dashboard:

![Dashboard Overview]

**Key Areas:**
- **Quick Actions**: Start a new video or browse templates
- **Stats Cards**: See your usage and credits
- **Recent Projects**: Access your latest videos
- **Template Gallery**: Quick access to popular templates

### Understanding Credits

Renderowl uses a credit system for video rendering:

| Action | Credits |
|--------|---------|
| AI Script Generation | 5 |
| AI Scene Generation | 10 per scene |
| AI Voice Generation | 5 per minute |
| 720p Render | 25 |
| 1080p Render | 50 |
| 4K Render | 100 |
| Social Publish | 5 per platform |

**Free tier includes 500 credits/month.** Additional credits can be purchased.

---

## Creating Your First Video

### Method 1: Start from Scratch

1. Click **"Create New Video"** on the dashboard
2. You'll be taken to the editor with empty tracks
3. Add content using the AI sidebar or upload your own media

### Method 2: Use a Template

1. Click **"Browse Templates"**
2. Filter by category (YouTube, TikTok, Educational, etc.)
3. Preview templates by hovering or clicking
4. Click **"Use Template"** to load it into the editor

### Method 3: AI-First Creation

1. Click **"AI Generate"** in the editor sidebar
2. Enter your topic or prompt
3. Follow the AI wizard to create script, scenes, and voice
4. Review and edit the generated timeline

---

## Using AI Features

### AI Script Writer

The AI Script Writer creates professional video scripts from your ideas.

**How to Use:**

1. Click **"AI Generate"** in the left sidebar
2. Select **"Generate Script"**
3. Enter your prompt (e.g., "Explain blockchain in simple terms")
4. Choose a style:
   - **Educational**: Clear, informative
   - **Entertaining**: Engaging, fun
   - **Professional**: Business-focused
   - **Casual**: Relaxed, conversational
   - **Dramatic**: Emotional, impactful
   - **Humorous**: Funny, light-hearted
5. Set target duration (15-300 seconds)
6. Choose number of scenes (1-10)
7. Click **"Generate"**

**Example Prompts:**
- "Create a 60-second explainer about solar panels for homeowners"
- "Write an entertaining script about the history of coffee"
- "Professional overview of our SaaS product features"

**Tips:**
- Be specific about your target audience
- Include key points you want covered
- Specify tone and style preferences

### AI Scene Generator

Generate visual scenes with images that match your script.

**How to Use:**

1. After generating a script, click **"Generate Scenes"**
2. Select visual style:
   - **Cinematic**: Movie-like quality
   - **Realistic**: Photorealistic images
   - **Animated**: Illustration style
   - **Abstract**: Artistic, conceptual
   - **Minimalist**: Clean, simple
3. Choose image source:
   - **Unsplash**: Free high-quality stock photos
   - **Pexels**: Another stock photo source
   - **DALL-E**: AI-generated images (premium)
   - **Stability AI**: AI-generated images (premium)
4. Toggle **"Generate AI Images"** for custom visuals
5. Click **"Generate Scenes"**

**Image Sources Explained:**

| Source | Type | Cost | Best For |
|--------|------|------|----------|
| Unsplash | Stock Photos | Free | Real-world subjects |
| Pexels | Stock Photos | Free | Diverse content |
| DALL-E 3 | AI Generated | 15 credits/scene | Custom visuals |
| Stability AI | AI Generated | 10 credits/scene | Artistic styles |

### AI Voice/Narration

Add professional voiceovers to your video.

**How to Use:**

1. After generating scenes, click **"Generate Voice"**
2. Select a voice from the library:
   - Preview voices by clicking the play button
   - Filter by gender, accent, age
   - Search by name or characteristics
3. Adjust settings:
   - **Stability**: Higher = more consistent, Lower = more varied
   - **Clarity**: Higher = clearer pronunciation
   - **Speed**: Playback speed (0.5x - 2x)
4. Click **"Generate Voice"** for each scene
5. Review and re-generate if needed

**Voice Providers:**

**ElevenLabs (Premium):**
- 1000+ voices
- Voice cloning available
- Most natural-sounding
- Supports SSML for advanced control

**OpenAI TTS:**
- 6 built-in voices
- Fast generation
- Good quality
- Lower cost

**Voice Selection Tips:**
- Match voice to content style (professional voice for business content)
- Consider your target audience's preferences
- Test different voices for longer content
- Use consistent voice across a series

### One-Click Timeline Generation

After creating script, scenes, and voice:

1. Click **"Generate Timeline"**
2. The system creates:
   - Video track with scene images
   - Audio track with voiceover
   - Text track with captions
3. Review the automatically created timeline
4. Edit timing, transitions, and text as needed

---

## Timeline Editor

### Understanding the Interface

```
┌─────────────────────────────────────────────────────────────┐
│  Navbar                                                      │
├─────────────────────────────────────────────────────────────┤
│  Left Sidebar    │     Preview       │  Right Sidebar       │
│  - Assets        │                   │  - Properties        │
│  - AI Tools      │   [VIDEO HERE]    │  - Duration          │
│  - Templates     │                   │  - Resolution        │
├──────────────────┴───────────────────┴──────────────────────┤
│  Timeline                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Video Track  │ [Scene1] [Scene2] [Scene3]          │   │
│  ├──────────────┼───────────────────────────────────────┤   │
│  │ Audio Track  │ [Voice1] [Voice2] [Voice3]          │   │
│  ├──────────────┼───────────────────────────────────────┤   │
│  │ Text Track   │ [Text1]  [Text2]  [Text3]           │   │
│  └──────────────┴───────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Working with Tracks

**Track Types:**
- **Video**: Video clips and images
- **Audio**: Voiceovers, music, sound effects
- **Text**: Titles, captions, overlays
- **Image**: Static images with effects
- **Effect**: Transitions and visual effects

**Adding Tracks:**
1. Click **"+ Add Track"** button
2. Select track type
3. The new track appears in the timeline

**Track Controls:**
- **Visibility Toggle** (👁️): Show/hide track
- **Lock Toggle** (🔒): Prevent accidental edits
- **Delete** (🗑️): Remove track and all clips

### Working with Clips

**Adding Clips:**
1. Drag media from the asset library to a track
2. Or use AI generation to auto-create clips

**Editing Clips:**
1. **Move**: Drag clip left/right to change timing
2. **Resize**: Drag clip edges to adjust duration
3. **Delete**: Select clip and press Delete or click 🗑️
4. **Duplicate**: Right-click → Duplicate

**Clip Properties (Right Sidebar):**
- **Start Time**: When clip begins
- **Duration**: How long it plays
- **Trim**: Adjust in/out points for video/audio
- **Volume**: For audio clips (0-200%)
- **Opacity**: For visual clips (0-100%)

### Video Preview

The preview shows exactly how your video will look:

- **Play/Pause**: Spacebar or click play button
- **Scrub**: Click and drag on timeline
- **Fullscreen**: Click fullscreen button
- **Quality**: Preview renders in real-time

### Timeline Controls

**Toolbar Buttons:**
- **Undo/Redo**: Ctrl+Z / Ctrl+Y
- **Zoom**: Zoom in/out on timeline
- **Snap**: Toggle snap-to-grid
- **Save**: Save your work
- **Preview**: Play from current position
- **Export**: Start video render

**Keyboard Shortcuts:**

| Shortcut | Action |
|----------|--------|
| Space | Play/Pause |
| ← / → | Previous/Next frame |
| ↑ / ↓ | Zoom in/out |
| Delete | Delete selected clip |
| Ctrl+S | Save |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |

### Properties Panel

Adjust video settings in the right sidebar:

**Timeline Properties:**
- **Duration**: Total video length (seconds)
- **FPS**: Frames per second (24, 30, 60)
- **Resolution**: Video dimensions
- **Background**: Background color
- **Transition**: Default transition between clips

**Clip Properties:**
- Vary by clip type
- Text clips: Font, size, color, animation
- Video clips: Trim, speed, filters
- Audio clips: Volume, fade, trim

---

## Publishing to Social Media

### Connecting Accounts

Before publishing, connect your social accounts:

1. Go to **Settings → Social Accounts**
2. Click **"Connect"** next to a platform
3. Complete OAuth authorization
4. Account appears in connected list

**Supported Platforms:**
- YouTube
- TikTok
- Instagram
- X (Twitter)
- Facebook
- LinkedIn

### Publishing a Video

1. Click **"Publish"** in the editor toolbar
2. The Publish Modal opens

**Tab 1: Publish Now**
1. Select platforms (checkboxes)
2. Enter:
   - **Title**: Video title
   - **Description**: Video description
   - **Tags**: Comma-separated keywords
   - **Privacy**: Public, Unlisted, or Private
3. Click **"Publish Now"**
4. Video uploads to selected platforms

**Tab 2: Schedule**
1. Select platforms
2. Choose date and time
3. Enter title, description, tags
4. Click **"Schedule Post"**
5. Video publishes automatically at scheduled time

**Tab 3: Cross-Post Settings**
- Configure platform-specific options
- Set different descriptions per platform
- Choose thumbnail for each platform

### Understanding Privacy Settings

| Setting | YouTube | TikTok | Instagram | X | Facebook | LinkedIn |
|---------|---------|--------|-----------|---|----------|----------|
| Public | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Unlisted | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Private | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Friends | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ |

### Managing Scheduled Posts

View and manage scheduled posts:

1. Go to **Dashboard → Scheduled Posts**
2. See list of upcoming posts
3. Actions:
   - **Edit**: Change details or timing
   - **Cancel**: Remove from schedule
   - **Post Now**: Publish immediately

---

## Analytics

### Dashboard Analytics

Access analytics from the dashboard sidebar:

**Overview Tab:**
- Total views across all videos
- Engagement rate (likes, comments, shares)
- Follower/subscriber growth
- Credit usage

**Platform Breakdown:**
- Views per platform
- Performance comparison
- Best performing platform

**Video Performance:**
- List of all published videos
- Sort by views, engagement, or date
- Quick stats for each video

### Video-Specific Analytics

Click on any video in the list for detailed metrics:

**Performance Metrics:**
- Total views
- Watch time
- Average view duration
- Retention rate (% who watch to end)

**Engagement Metrics:**
- Likes
- Comments
- Shares
- Click-through rate

**Audience Insights:**
- Geographic distribution
- Traffic sources
- Device types

**Platform-Specific Data:**
- Per-platform breakdown
- Comparison across platforms
- Best time to post

### Understanding Analytics

**Key Metrics Explained:**

| Metric | What It Means | Good Range |
|--------|---------------|------------|
| Views | Times video was watched | Varies |
| Engagement Rate | (Likes+Comments+Shares)/Views | 3-6% |
| Retention | % who watch to end | 50%+ |
| CTR | Clicks from recommendations | 2-10% |
| Watch Time | Total minutes watched | Higher = better |

**Using Analytics to Improve:**
1. Identify top-performing content
2. See which platforms work best for you
3. Find optimal posting times
4. Understand audience preferences
5. Track growth over time

---

## Templates

### Browsing Templates

1. Go to **Dashboard → Templates**
2. Filter by:
   - Category (YouTube, TikTok, etc.)
   - Duration
   - Style
   - Premium/Free
3. Preview by hovering or clicking

### Template Categories

| Category | Best For | Examples |
|----------|----------|----------|
| YouTube | Long-form content | Intros, explainers, reviews |
| TikTok | Short vertical videos | Trends, dances, tips |
| Instagram | Square/portrait | Reels, stories, ads |
| Educational | Teaching content | Tutorials, courses |
| Promotional | Marketing | Product launches, ads |
| Social | General social | Quotes, announcements |

### Using a Template

1. Browse and find a template you like
2. Click **"Preview"** to see it in action
3. Click **"Use Template"**
4. Enter a project name
5. Template loads in editor with pre-populated content
6. Customize:
   - Replace placeholder text
   - Swap images/videos
   - Adjust timing
   - Add your branding

### Creating Custom Templates

*(Premium feature)*

1. Create a timeline you want to save as template
2. Click **"Save as Template"** in the menu
3. Fill template details:
   - Name
   - Description
   - Category
   - Tags
   - Thumbnail
4. Choose visibility (Private or Public)
5. Save

---

## Tips & Best Practices

### Content Creation Tips

**Script Writing:**
- Hook viewers in the first 3 seconds
- Keep sentences short and punchy
- One main idea per scene
- End with a call-to-action

**Visual Design:**
- Use high-quality images
- Maintain consistent branding
- Don't overcrowd scenes
- Use contrasting colors for text

**Audio:**
- Match voice to content tone
- Use background music at 10-20% volume
- Ensure voiceover is clear
- Add subtle sound effects

### Technical Best Practices

**Timeline Organization:**
- Name your tracks descriptively
- Use color coding for different content types
- Group related clips
- Lock tracks you're not editing

**Performance:**
- Save frequently (auto-save every 30s)
- Preview before exporting
- Use appropriate resolution for target platform
- Don't use too many effects

**Export Settings:**
- YouTube: 1080p or 4K, 60fps if action
- TikTok: 1080x1920, 60fps
- Instagram: 1080x1080 (feed) or 1080x1920 (reels)
- Web: 720p for faster loading

### Platform-Specific Tips

**YouTube:**
- Use custom thumbnails
- Write detailed descriptions
- Add timestamps
- Use end screens and cards

**TikTok:**
- Start with a hook
- Use trending sounds
- Keep under 60 seconds for best reach
- Add captions

**Instagram:**
- Use hashtags (5-10)
- Post at optimal times
- Engage with comments quickly
- Use Stories for behind-scenes

**LinkedIn:**
- Professional tone
- Add value/education
- Use native video (not links)
- Tag relevant people

### Troubleshooting

**Editor Issues:**
- Clear browser cache
- Use Chrome or Firefox
- Disable browser extensions
- Check internet connection

**Export Problems:**
- Check timeline duration (>1 second)
- Verify all clips have valid sources
- Ensure sufficient credits
- Try lower resolution

**Publishing Issues:**
- Reconnect social account
- Check video meets platform requirements
- Verify privacy settings
- Check for platform outages

### Keyboard Shortcuts Reference

| Windows/Linux | Mac | Action |
|---------------|-----|--------|
| Ctrl+S | Cmd+S | Save |
| Ctrl+Z | Cmd+Z | Undo |
| Ctrl+Y | Cmd+Shift+Z | Redo |
| Ctrl+C | Cmd+C | Copy |
| Ctrl+V | Cmd+V | Paste |
| Delete | Delete | Delete clip |
| Space | Space | Play/Pause |
| ← | ← | Previous frame |
| → | → | Next frame |

---

## Getting Help

### In-App Help

- **Tooltips**: Hover over buttons for quick info
- **Guided Tours**: First-time user walkthrough
- **Help Center**: Click ? icon in navbar

### Support Channels

- **Email**: support@renderowl.com
- **Chat**: Click chat bubble (business hours)
- **Documentation**: docs.renderowl.com
- **Community**: community.renderowl.com

### Feedback

We love hearing from users!

- **Feature Requests**: Submit via dashboard
- **Bug Reports**: Use in-app report button
- **General Feedback**: Email feedback@renderowl.com

---

**Happy Creating! 🦉✨**

**[⬆ Back to Top](#-renderowl-20---user-guide)**

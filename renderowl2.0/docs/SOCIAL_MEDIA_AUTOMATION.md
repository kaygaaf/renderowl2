# 📱 Renderowl 2.0 - Social Media Automation

**ONE PLATFORM TO RULE THEM ALL** 🚀

## Overview

Renderowl 2.0 now includes a comprehensive social media automation system that allows you to:

- ✅ Connect and manage multiple social media accounts
- ✅ Schedule posts for optimal times across all platforms
- ✅ Cross-post videos to YouTube, TikTok, Instagram, Twitter/X, LinkedIn, and Facebook
- ✅ Track analytics and performance metrics
- ✅ Discover trending topics and hashtags
- ✅ Automate recurring content publishing

## Features

### 1. Platform APIs (`backend/internal/service/social/`)

Full OAuth2 integration for all major platforms:

| Platform | OAuth | Upload | Analytics | Trends |
|----------|-------|--------|-----------|--------|
| YouTube | ✅ | ✅ | ✅ | ✅ |
| TikTok | ✅ | ✅ | ⚠️ | ⚠️ |
| Instagram | ✅ | ✅ | ✅ | ⚠️ |
| Twitter/X | ✅ | ✅ | ⚠️ | ⚠️ |
| LinkedIn | ✅ | ✅ | ⚠️ | ⚠️ |
| Facebook | ✅ | ✅ | ✅ | ⚠️ |

Legend:
- ✅ Full support
- ⚠️ Limited by platform API restrictions

### 2. Content Scheduler (`backend/internal/scheduler/`)

BullMQ-inspired job queue with Redis:

- **Delayed jobs**: Schedule posts for specific dates/times
- **Recurring content**: Daily, weekly, monthly publishing
- **Retry logic**: Automatic retries with exponential backoff
- **Queue management**: Real-time queue monitoring
- **Timezone support**: Post at optimal local times

### 3. Auto-Publisher (`backend/internal/service/publisher.go`)

Automatic publishing with intelligent features:

- **Cross-platform posting**: Publish to multiple platforms simultaneously
- **Platform-specific formatting**: Auto-optimize content per platform
- **Error handling**: Graceful failure and retry mechanisms
- **Progress tracking**: Real-time publishing status

### 4. Frontend Social Dashboard (`frontend/src/components/social/`)

React-based dashboard with 6 tabs:

1. **Accounts** - Connect and manage social media accounts
2. **Schedule** - Create and schedule new posts
3. **Calendar** - Visual content calendar view
4. **Queue** - Real-time publishing queue status
5. **Analytics** - Cross-platform performance metrics
6. **Trends** - Discover trending topics and hashtags

## API Endpoints

### Social Media Endpoints

```
GET    /api/v1/social/platforms           - List available platforms
GET    /api/v1/social/accounts            - List connected accounts
GET    /api/v1/social/accounts/:id        - Get specific account
DELETE /api/v1/social/accounts/:id        - Disconnect account
GET    /api/v1/social/connect/:platform   - Get OAuth URL
POST   /api/v1/social/callback/:platform  - OAuth callback handler

POST   /api/v1/social/upload              - Upload video immediately
POST   /api/v1/social/crosspost           - Cross-post to multiple platforms

POST   /api/v1/social/schedule            - Schedule a post
GET    /api/v1/social/schedule            - List scheduled posts
DELETE /api/v1/social/schedule/:id        - Cancel scheduled post

POST   /api/v1/social/publish/:id         - Publish scheduled post now
POST   /api/v1/social/retry/:id           - Retry failed post
GET    /api/v1/social/queue               - Get publishing queue

GET    /api/v1/social/analytics/:accountId - Get analytics
GET    /api/v1/social/trends/:accountId    - Get trending topics
GET    /api/v1/social/stats               - Get queue statistics
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Redis (for scheduler)
REDIS_ADDR=localhost:6379
REDIS_PASSWORD=

# YouTube
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URL=http://localhost:3000/auth/callback/youtube

# TikTok
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URL=http://localhost:3000/auth/callback/tiktok

# Instagram
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URL=http://localhost:3000/auth/callback/instagram

# Twitter/X
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_REDIRECT_URL=http://localhost:3000/auth/callback/twitter

# LinkedIn
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URL=http://localhost:3000/auth/callback/linkedin

# Facebook
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_REDIRECT_URL=http://localhost:3000/auth/callback/facebook
```

## Usage

### 1. Connect Accounts

1. Go to **Dashboard → Social → Accounts**
2. Click on the platform you want to connect
3. Complete OAuth flow
4. Account is now connected and ready for posting

### 2. Schedule a Post

1. Go to **Dashboard → Social → Schedule**
2. Select your video
3. Choose platforms to publish to
4. Customize title/description per platform (optional)
5. Set date and time
6. Enable recurring (optional)
7. Click "Schedule" or "Publish Now"

### 3. View Calendar

- Visual month view of all scheduled posts
- Click on a post to edit or cancel
- Color-coded by status

### 4. Monitor Queue

- Real-time publishing status
- Retry failed posts
- Cancel pending posts

### 5. Analytics

- Cross-platform view counts
- Engagement metrics
- Growth tracking
- Export to CSV

### 6. Trends

- Discover trending hashtags
- Find popular sounds (TikTok)
- Content suggestions based on trends

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Accounts   │  │   Schedule   │  │    Calendar      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │    Queue     │  │   Analytics  │  │     Trends       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (Go/Gin)                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   YouTube    │  │    TikTok    │  │   Instagram      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Twitter    │  │   LinkedIn   │  │    Facebook      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Scheduler   │  │  Publisher   │  │   Analytics      │  │
│  │   (Redis)    │  │              │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### SocialAccount
- `id` - UUID
- `user_id` - User ID
- `platform` - Platform name
- `account_id` - Platform-specific ID
- `account_name` - Display name
- `access_token` - OAuth access token
- `refresh_token` - OAuth refresh token
- `token_expiry` - Token expiration
- `status` - Connection status
- `metadata` - Platform-specific data

### ScheduledPost
- `id` - UUID
- `user_id` - User ID
- `video_id` - Associated video
- `title` - Post title
- `description` - Post description
- `scheduled_at` - Scheduled time
- `timezone` - User timezone
- `status` - Post status
- `recurring` - Recurrence rule

### PlatformPost
- `id` - UUID
- `scheduled_post_id` - Parent post
- `platform` - Platform name
- `account_id` - Account ID
- `status` - Publishing status
- `platform_post_id` - Published post ID
- `post_url` - Published URL

### AnalyticsData
- `id` - UUID
- `post_id` - Post ID
- `platform` - Platform name
- `views`, `likes`, `comments`, `shares`
- `engagement` - Engagement rate
- `recorded_at` - Timestamp

## Future Enhancements

- [ ] AI-powered optimal posting time prediction
- [ ] Automatic hashtag suggestions
- [ ] Competitor analytics tracking
- [ ] A/B testing for thumbnails and titles
- [ ] Comment/reply management across platforms
- [ ] Team collaboration features
- [ ] Advanced analytics dashboards

## Support

For issues or questions about the social media automation system, please refer to the main Renderowl documentation or contact support.

---

**ONE PLATFORM TO POST EVERYWHERE!** 🚀📱

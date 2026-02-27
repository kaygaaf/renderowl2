# Changelog

## [0.4.0] - Frontend Dashboard Implementation

### New Frontend Application

Complete dashboard implementation for Renderowl platform with industrial/retro-futuristic design aesthetic.

#### Pages Implemented
- **Dashboard Overview** — Real-time stats, recent activity, project quick view, quick actions
- **Renders List** — Filterable render job management with status tracking
- **Credits Dashboard** — Balance display, credit packages, transaction history, cost estimates

#### Design System
- **Aesthetic:** Industrial/utilitarian with retro-futuristic touches
- **Theme:** Dark mode with amber/gold primary and cyan accent colors
- **Typography:** Geist Sans for UI, Geist Mono for data (tabular nums)
- **Components:** Comprehensive shadcn/ui-inspired component library

#### UI Components
- Layout: Sidebar navigation, header with search/notifications
- Data Display: Cards, badges, progress bars, tabs
- Forms: Buttons, inputs, dropdown menus
- Feedback: Toast notifications, tooltips
- Icons: Lucide React icon library

#### Features
- Responsive layout (sidebar collapses on mobile)
- Loading skeleton states
- Status indicators with color coding
- Progress tracking for active renders
- Credit balance display in sidebar
- Notification dropdown with unread count
- Quick action buttons for common tasks

#### Technical Stack
- Next.js 16 with App Router
- React 19
- TypeScript 5
- Tailwind CSS 4
- Radix UI primitives
- Framer Motion (ready for animations)

### Project Structure
```
renderowl-frontend/
├── src/app/              # Next.js app routes
├── src/components/
│   ├── ui/              # Reusable UI components
│   ├── dashboard/       # Dashboard-specific components
│   └── layout/          # Layout components
├── src/lib/             # Utilities
├── src/types/           # TypeScript types
```

## [0.3.0] - Analytics, Notifications & Enhanced Batch Generation

### Analytics API

New comprehensive analytics system for tracking renders, usage metrics, and performance.

#### Features
- **Analytics Summary** (`GET /v1/analytics/summary`) — Overall render statistics with completion rates, average duration, credits used
- **Time Series Data** (`GET /v1/analytics/timeseries`) — Historical metrics for renders, credits, frames, duration
- **Project Comparison** (`GET /v1/analytics/projects`) — Performance comparison across projects
- **Custom Event Tracking** (`POST /v1/analytics/events`) — Track custom business events

#### Database Schema
- `analytics_events` — Time-series event log with JSON payload support
- `analytics_daily` — Daily aggregated statistics (renders, credits, frames, storage)
- Automatic aggregation with upsert support

### Notifications System

Real-time notification system for user-facing events.

#### Features
- **List Notifications** (`GET /v1/analytics/notifications`) — Paginated notification feed
- **Unread Count** (`GET /v1/analytics/notifications/unread-count`) — Quick badge count
- **Mark as Read** (`POST /v1/analytics/notifications/:id/read`) — Individual read status
- **Mark All Read** (`POST /v1/analytics/notifications/read-all`) — Bulk read operation
- **Delete Notification** (`DELETE /v1/analytics/notifications/:id`) — Remove notification

#### Notification Types
- `render_complete` — Render job finished successfully
- `render_failed` — Render job failed with error details
- `credit_low` — Low credit balance warning
- `batch_complete` — Batch processing completed
- `system` — System announcements

#### Auto-Generated Notifications
- Batch completion notifications automatically created when batch jobs finish
- Credit low warnings triggered at 50 credits remaining

### Batch Generation Enhancements

- Batch operation analytics tracking
- Automatic progress notifications
- Success/failure counts in batch completion messages
- Integration with notification system for batch status updates

### Video Templates Improvements

The templates system now includes:
- Template marketplace with featured listings
- Purchase tracking and reviews
- Usage analytics (render count, download count)
- Category and tag-based discovery
- Public/private/community visibility options

### API Documentation

- New comprehensive API documentation at `docs/ANALYTICS_API.md`
- Full endpoint specifications with request/response examples
- Database schema documentation
- Rate limit specifications

### Testing

- Analytics service test suite (`test-analytics.ts`)
- Validates event tracking, daily stats, notifications, batch progress
- All tests passing

## [0.2.0] - Security & Bug Fixes

### Security Fixes (CRITICAL)

#### Render Progress Webhook Authentication
- **Fixed:** Render progress webhook endpoint (`POST /v1/renders/webhooks/progress`) was accessible without authentication
- **Solution:** Added HMAC-SHA256 signature verification using `X-Worker-Signature` header
- **Impact:** Prevents unauthorized manipulation of render status and progress

#### Internal Credit Endpoint Protection
- **Fixed:** Internal credit management endpoints (`/credits/deduct`, `/credits/add`, `/credits/check`) were publicly accessible
- **Solution:** Added authorization layer requiring internal API key or admin privileges
- **Environment Variables:**
  - `INTERNAL_API_KEYS`: Comma-separated list of valid internal API keys
  - `ADMIN_USER_IDS`: Comma-separated list of admin user IDs

#### JWT Authentication Implementation
- **Fixed:** Auth hook used hardcoded demo user instead of validating JWT tokens
- **Solution:** Implemented proper JWT verification with payload validation
- **Behavior:** Invalid or expired tokens now return 401 with descriptive error

#### API Key Admin Scope Restriction
- **Fixed:** Any user could create API keys with `admin:*` scope
- **Solution:** Added admin-only restriction for admin scope creation
- **Check:** Validates against `ADMIN_USER_IDS` environment variable

### Bug Fixes

#### Input Validation
- **Render Output Settings:** Added validation for resolution (64x64 to 7680x4320), FPS (1-240), duration (1s-1h)
- **Asset Upload:** Added filename security validation (no path traversal, extension whitelist)
- **User/Credit Operations:** Added `user_id` format validation using Zod schemas

#### Race Condition Mitigation
- **Job Queue:** Changed `claimNextJob()` to use atomic UPDATE with RETURNING clause
- **Note:** SQLite limitations prevent full ACID guarantees; production should use PostgreSQL/MySQL

#### Asset Deletion Safety
- **Fixed:** Assets could be deleted while referenced by active renders
- **Solution:** Added reference checking before deletion
- **Behavior:** Returns 409 Conflict with list of active renders if asset is in use

#### Division by Zero Protection
- **Fixed:** Progress calculation could divide by zero if `total_frames` was 0
- **Solution:** Added validation rejecting zero total_frames

### Code Quality

#### Error Handling
- Added structured error responses following RFC 7807 Problem Details
- Improved error messages with specific field validation failures
- Added request logging for security events (failed auth, invalid signatures)

#### Type Safety
- Fixed TypeScript errors in authentication hooks
- Added proper type assertions for JWT payloads

### Environment Variables

New required environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `RENDER_WEBHOOK_SECRET` | Yes (if using workers) | Secret for signing render progress webhooks |
| `INTERNAL_API_KEYS` | Yes (for internal ops) | Comma-separated internal API keys |
| `ADMIN_USER_IDS` | Yes (for admin ops) | Comma-separated admin user IDs |
| `JWT_SECRET` | Yes (for auth) | Secret for JWT signing |

### API Changes

#### Breaking Changes
- `POST /v1/renders/webhooks/progress` now requires `X-Worker-Signature` header
- `POST /v1/credits/deduct` now requires internal API key or admin auth
- `POST /v1/credits/add` now requires internal API key or admin auth
- `GET /v1/credits/check/:user_id` now requires internal API key or admin auth
- All user endpoints now require valid JWT (no more hardcoded demo user)

#### Validation Changes
- Render creation now validates output resolution limits
- Asset upload now validates filename extensions
- Invalid `user_id` formats now return 400 instead of 404

### Migration Guide

1. **Set up environment variables:**
   ```bash
   export RENDER_WEBHOOK_SECRET="your-secret-here"
   export INTERNAL_API_KEYS="key1,key2,key3"
   export ADMIN_USER_IDS="user_admin1,user_admin2"
   export JWT_SECRET="your-jwt-secret"
   ```

2. **Update worker configuration:**
   - Workers must now sign webhook payloads with HMAC-SHA256
   - Include `X-Worker-Signature` header with hex-encoded signature

3. **Update internal services:**
   - Services calling internal credit endpoints must include `X-API-Key` header
   - Or authenticate as an admin user

4. **Update client authentication:**
   - Clients must obtain valid JWT tokens
   - Include `Authorization: Bearer <token>` header

### Known Issues

1. **In-Memory Storage:** Data is lost on server restart. Migration to persistent database recommended.
2. **Credit Race Condition:** `deductCredits()` still has theoretical race condition (check then deduct). Full atomicity requires database transactions.
3. **Enhanced Queue:** TypeScript errors exist in `lib/enhanced-queue.ts` (unused in production paths).

## [0.1.0] - Initial Release

### Features
- Project management (CRUD)
- Asset upload and management
- Render job queue with progress tracking
- Credit system with Stripe integration
- API key management
- Webhook support
- Batch operations
- Automation system

### Authentication
- JWT-based authentication (placeholder)
- API key authentication

# Idempotency Service - Renderowl

**Status:** ✅ IMPLEMENTED  
**Date:** 2026-02-25  
**Feature:** Job deduplication via content-addressable caching

---

## Overview

The idempotency service prevents duplicate video generation by caching successful results keyed by request content. This provides:

- **Cost savings**: Identical requests return cached results without re-charging credits
- **Client safety**: Clients can safely retry requests without worrying about duplicate work
- **Performance**: Cached results return instantly without processing time

---

## How It Works

### Key Generation

Idempotency keys are automatically generated from task parameters:

```python
key = generate_key(
    "tasks.generate_video",
    args=(),
    kwargs={
        "title": "My Video",
        "scenes": [...],
        "voice": "en-US-AriaNeural",
        "aspect_ratio": "16:9",
        # ... other params
    }
)
# Returns: SHA256 hash of normalized parameters
```

### Request Flow

```
Client Request
      ↓
[API] Generate idempotency key from request
      ↓
[Task] Check Redis for cached result
      ↓
    ├─ HIT → Return cached result immediately
    └─ MISS → Acquire lock, process, store result
```

### Concurrent Request Handling

When two identical requests arrive simultaneously:

1. First request acquires the processing lock
2. Second request waits (with timeout) or gets "processing" status
3. When first completes, second returns the cached result

---

## API Usage

### Auto-generated Keys

Keys are automatically generated for all requests:

```bash
# First request - processes normally
curl -X POST https://api.renderowl.com/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Video",
    "scenes": [...]
  }'
# → {"job_id": "abc123", "status": "PENDING"}

# Identical request - returns cached result
curl -X POST https://api.renderowl.com/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Video",
    "scenes": [...]
  }'
# → {"job_id": "def456", "status": "SUCCESS", "cached": true, "original_job_id": "abc123"}
```

### Custom Keys

Clients can provide their own idempotency keys:

```bash
curl -X POST https://api.renderowl.com/api/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "My Video",
    "scenes": [...],
    "idempotency_key": "user-123-request-456"
  }'
```

### Check Key Status

```bash
# Check if work already exists for parameters
POST /api/idempotency/check
{
  "task_name": "tasks.generate_video",
  "kwargs": {
    "title": "Test",
    "scenes": [...]
  }
}

# Response
{
  "key": "a1b2c3d4...",
  "status": "hit",
  "should_process": false,
  "job_id": "abc123",
  "cached_result": true
}
```

### Admin Endpoints

```bash
# Get cache statistics
GET /api/idempotency/stats
# → {"cached_results": 42, "active_locks": 3, "ttl_seconds": 604800}

# Invalidate a cached result
POST /api/idempotency/invalidate/{key}
```

---

## Configuration

### TTL Settings

| Type | TTL | Description |
|------|-----|-------------|
| Success | 7 days | Cached successful results |
| Error | 1 hour | Failed attempts (allow retry) |
| Lock | 1 hour | Maximum processing time |

### Redis Keys

- `videogen:idempotency:{hash}` → Cached result
- `videogen:idempotency:{hash}:lock` → Processing lock

---

## Integration with Existing Systems

### Complements Checkpoints

- **Checkpoints** = Resume from failure _within_ a job
- **Idempotency** = Skip duplicate _jobs_ entirely

### Works with DLQ

Failed jobs are stored with a shorter TTL (1 hour), allowing automatic retry while still preventing immediate duplicates.

---

## Files Added/Modified

| File | Purpose |
|------|---------|
| `app/core/idempotency.py` | Core service implementation |
| `app/api/idempotency_routes.py` | API endpoints |
| `app/api/router.py` | Route registration |
| `app/api/schemas.py` | Request/response schemas |
| `app/tasks/pipeline.py` | Task integration |

---

## Testing

```bash
# 1. Submit a job
curl -X POST /api/generate -d '{"title":"Test","scenes":[...]}'

# 2. Submit identical job immediately
# Should return cached result or "processing" status

# 3. Check cache stats
GET /api/idempotency/stats

# 4. Invalidate and retry
POST /api/idempotency/invalidate/{key}
```

---

## Future Enhancements

- [ ] Partial result caching (cache individual scene renders)
- [ ] Smart key invalidation (invalidate when models update)
- [ ] Cache warming for popular templates
- [ ] Cross-user deduplication for public templates

# Security Hardening Report: Renderowl

## 1. Auth Audit
- **Authentication**: JWT and API Key authentication are enforced globally on `/v1/*` routes using a Fastify `onRequest` hook.
- **IDOR Prevention**: While endpoints validate inputs, authorization logic checking ownership (e.g., verifying `project.user_id === request.user.id`) must be strictly applied inside individual route handlers.
- **JWT Handling**: Handled via `@fastify/jwt`.

## 2. Input Validation
- **Validators**: The API is written in Node.js/TypeScript (not Python), so **Zod** is used in place of Pydantic. `schemas.ts` provides comprehensive, strict validation rules for all requests, which Fastify handles automatically.
- **Sanitization & SQLi**: Parameterized queries are used with `better-sqlite3`, preventing SQL injection.

## 3. File Upload Security
- **Limits**: Fastify's global `bodyLimit` is set to 10MB to prevent denial-of-service via massive payloads. Direct asset uploads are validated by `CreateAssetUploadRequestSchema`.
- **Validation**: `AssetTypeSchema` enforces strict valid asset types.

## 4. Rate Limiting
- **Global API Limits**: Implemented via `rateLimitPlugin` backed by an SQLite DB (`ratelimit.db`), protecting all standard endpoints.

## 5. Error Handling
- **Sensitive Data Removed**: Modified the global error handler in `server.ts`. In production environments, internal errors now return a generic message ("An unexpected internal error occurred. Please contact support.") instead of leaking stack traces, database schema details, or underlying error messages.
- **Validation Errors**: Safely return HTTP 400 with details about the failed fields.

## 6. CORS & Headers
- **Security Headers**: Installed and registered `@fastify/helmet` to inject robust HTTP security headers (X-Frame-Options, X-Content-Type-Options, etc.).
- **CORS Configuration**: Hardened `@fastify/cors` settings to only allow `https://app.renderowl.com` and `https://renderowl.com` in production, eliminating the insecure wildcard/allow-all fallback.

*All security improvements have been committed to the repository.*
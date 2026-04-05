# BuddyScript Backend

Backend API for the BuddyScript social feed application. This service provides authentication, authorization, feed/post management, comments/replies, like/unlike interactions, image handling, and production-oriented API safeguards.

## Project Context

This backend was built to satisfy the assignment requirements:

- Secure user authentication and authorization.
- Protected feed access for logged-in users only.
- Create/read/update/delete post flows with newest-first ordering.
- Post visibility controls (`public` and `private`).
- Like/unlike support for posts, comments, and replies.
- Ability to view users who liked a post/comment/reply.
- Scalable API design choices for high-read social workloads.

## Tech Stack

- Runtime: Node.js
- Language: TypeScript
- Framework: Express 5
- Database: MongoDB with Mongoose
- Validation: Zod
- Auth: JWT + HttpOnly cookie support
- Security: Helmet, CORS controls, rate limiting
- Caching/Rate store : Redis
- Media storage: Local uploads or Cloudinary

## Key Features Implemented

### Authentication & Authorization

- Register with first name, last name, email, and password.
- Login with email and password.
- JWT-based auth with extraction from HttpOnly cookies and `Authorization` header.
- Protected routes via auth middleware.
- Profile read/update endpoints.
- Login/register rate limiting for brute-force mitigation.

### Feed & Posts

- Feed endpoint is protected.
- Feed returns newest posts first.
- Visibility behavior:
  - `public`: visible to all authenticated users.
  - `private`: visible only to the author.
- Create post with text and optional image URL.
- Update and delete post (author-only access).

### Social Interactions

- Like/unlike for posts.
- Comment on posts.
- Like/unlike comments.
- Reply to comments.
- Like/unlike replies.
- Endpoints to list users who liked each entity.

### Scalability & Performance-Oriented Choices

- Cursor-based pagination on feed and social-list endpoints.
- Optional legacy page pagination toggle for compatibility.
- Redis-backed caching abstraction for high-read routes.
- Transaction-aware like/unlike mutation logic.
- Cache invalidation on write operations to reduce stale reads.

### Security & Reliability

- `helmet` for baseline HTTP hardening.
- Strict CORS allowlist from environment configuration.
- Request-size limits for JSON and URL-encoded payloads.
- Centralized error handling with consistent API shape.
- Request ID-aware logging.

## API Base URL

- Local: `http://localhost:5000/api`

Health check endpoints:

- `GET /` (service status)
- `GET /api/health`

## Main Endpoint Groups

- Auth: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`
- Posts: `/posts`, `/posts/:id`, `/posts/:id/like`, `/posts/:id/likes`
- Comments: `/posts/:postId/comments`, `/comments/:id`, `/comments/:id/like`, `/comments/:id/likes`
- Replies: `/comments/:commentId/replies`, `/replies/:id`, `/replies/:id/like`, `/replies/:id/likes`
- Media: `/media/upload`

## Environment Variables

Copy `.env.example` to `.env` and set values.

Required:

- `PORT` (default: `5000`)
- `NODE_ENV` (`development` | `production` | `test`)
- `MONGODB_URI`
- `JWT_SECRET` (minimum 32 characters)
- `CORS_ORIGIN` (comma-separated origins)
- `APP_BASE_URL` (for absolute URL normalization)

Optional:

- `STORAGE_PROVIDER` (`local` or `cloudinary`)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `REDIS_URL`
- `ENABLE_LEGACY_PAGE_PAGINATION`
- `CACHE_TTL_SECONDS`
- `ENABLE_MEDIA_JOB_WORKER`
- `COOKIE_SAME_SITE`
- `JSON_BODY_LIMIT`
- `URLENCODED_BODY_LIMIT`

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Start dev server:

```bash
npm run dev
```

4. Build production bundle:

```bash
npm run build
```

5. Start built server:

```bash
npm start
```

## Scripts

- `npm run dev` - Start backend with `nodemon` + `ts-node`
- `npm run build` - TypeScript compile to `dist`
- `npm start` - Run compiled backend
- `npm run test` - Build and run backend logic tests

## Design Decisions

1. JWT with cookie + bearer support
   - Reason: works well for browser clients and API tooling.
   - Trade-off: dual token sources add small middleware complexity.

2. Cursor pagination by default
   - Reason: better consistency and performance for large, frequently updated feeds.
   - Trade-off: slightly more complex client pagination logic than page-number mode.

3. Visibility logic enforced in backend queries
   - Reason: prevents private-post leakage even if frontend is bypassed.
   - Trade-off: additional authorization checks in multiple query paths.

4. Cache-aside pattern on read-heavy endpoints
   - Reason: lower response times under high read volume.
   - Trade-off: write paths must invalidate relevant cache keys.

## What Was Intentionally Out of Scope

- Forgot-password and account recovery flows.
- Admin dashboard/moderation panel.
- Real-time notifications/websocket updates.

These were intentionally excluded to match the assignment scope.


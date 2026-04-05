# BuddyScript Frontend

Frontend client for the BuddyScript assignment, built with Next.js. It implements the provided Login/Register/Feed experience and connects to the BuddyScript backend API.

## Project Context

This frontend was implemented according to the SRS requirements:

- Support signup/login and protected feed access.
- Show newest posts first.
- Support post creation with text and image.
- Handle post/comment/reply like/unlike states.
- Show who liked posts/comments/replies.
- Respect private/public post visibility behavior from backend.

## Tech Stack

- Framework: Next.js 16 
- Language: TypeScript
- State management: Redux Toolkit + Redux Persist
- Data fetching/cache: RTK Query
- Forms & validation: React Hook Form + Zod
- UI tooling: Bootstrap, Tailwind CSS, custom CSS assets

## Main Routes

- `/login` - User login page
- `/register` - User registration page
- `/` - Feed page (protected)

The feed route is wrapped with route protection, so unauthenticated users are redirected to auth flow.

## Implemented Features

### Authentication

- Register with first name, last name, email, password.
- Login with email and password.
- Persistent auth session handling via Redux + persisted session data.
- Profile fetch for authenticated session bootstrap.
- Logout support.

### Feed & Posting

- Create new post with text and optional image.
- Feed query with newest-first ordering (served by backend).
- Cursor-based loading support through API query params.

### Social Interactions

- Like/unlike posts.
- Create/read comments per post.
- Like/unlike comments.
- Create/read replies per comment.
- Like/unlike replies.
- Fetch and display liked-user lists for posts/comments/replies.

### Media

- Image upload integration through backend media endpoint.

## API Integration

Frontend uses a central RTK Query base API with:

- `credentials: include` for cookie-based auth compatibility.
- Optional bearer token header support for compatibility mode.
- Session-aware 401 handling for auth-state endpoints.
- Runtime-safe API URL resolution and normalization.

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Required values:

- `NEXT_PUBLIC_API_URL` (example: `http://localhost:5000`)
- `NEXT_PUBLIC_APP_NAME` (example: `BuddyScript`)

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Start development server:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

5. Start production build:

```bash
npm start
```

## Scripts

- `npm run dev` - Start local Next.js development server
- `npm run build` - Build production artifacts
- `npm run start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run test:logic` - Run frontend logic tests

## Decisions & Rationale

1. Next.js App Router
	- Reason: clear route organization for auth and feed pages.
	- Trade-off: client/server component boundaries require extra discipline.

2. RTK Query for server-state
	- Reason: built-in caching, invalidation, and mutation handling for social interactions.
	- Trade-off: requires defining endpoint contracts upfront.

3. Redux Persist for auth continuity
	- Reason: smoother user experience during refresh and hydration.
	- Trade-off: persistence strategy must be carefully scoped to avoid stale auth artifacts.

4. API base URL normalization
	- Reason: avoids localhost/127.0.0.1 mismatch issues in local development.
	- Trade-off: adds small amount of URL normalization logic in client.

## Scope Notes

The following were intentionally not implemented to stay within assignment scope:

- Forgot password / password recovery
- Extended social features beyond listed requirements
- Major visual redesign of provided pages

## Related Repository Parts

- Frontend folder: `BuddyScript-FE`
- Backend folder: `BuddyScript`


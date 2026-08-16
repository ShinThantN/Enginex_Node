# Enginex_Node

## Project Overview

Enginex is a TypeScript Node.js backend for a developer marketplace platform. It provides authentication, user and client management, engineer profiles, feed/posts, team management, and file uploads. The project uses Prisma for database access and is designed for rapid development.

## Purpose

- Serve REST APIs for the Enginex web and mobile clients
- Manage user authentication, profiles, and roles (admin, client, engineer)
- Provide a social feed with posts, comments, likes and viral scoring
- Support switchable local-database and S3 image storage plus team/project collaboration features

## Tech Stack

- Runtime: Node.js (ES modules) with TypeScript
- Framework: Express
- ORM: Prisma (generated client in `generated/prisma`)
- Database: MySQL (configured via Prisma)
- Auth: JWT, OTP (modules under `src/modules/auth`)
- Image storage: MariaDB (`STORAGE_PROVIDER=database`) or AWS S3 (`STORAGE_PROVIDER=s3`)
- Validation: Zod
- Dev tools: `jest` for tests, `eslint` for linting
- Deploy tools: `Docker` for containerization

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file based on `.env.example`

3. Generate Prisma client and run migrations

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start the dev server

```bash
npm run dev
```

5. Run tests

```bash
npm test
```

## Local/offline Docker prototype

Once the Node and MySQL images and npm dependency layers are available locally:

```bash
docker compose build app
docker compose up -d mysql
npx prisma migrate deploy
docker compose up -d app
```

Set `DATABASE_URL` from `.env.example` before running the migration command.
Compose selects database image storage and does not require AWS credentials.
It also treats a root `.env` as optional; copy `.env.example` to `.env` when you
need local JWT, email, or S3 overrides.

## API Endpoints (overview)

The server mounts route modules under `/api/*`. Below are the main route groups and representative endpoints. Refer to `src/modules/*/*.routes.ts` for full route details.

- **Auth** (`/api/auth`)
  - `POST /api/auth/register` — register a new user
  - `POST /api/auth/login` — login and receive JWT
  - `POST /api/auth/otp` — OTP endpoints for verification

- **Engineers** (`/api/engineers`)
  - `GET /api/engineers` — list/search engineers
  - `GET /api/engineers/:id` — get engineer profile
  - `PUT /api/engineers/:id` — update engineer profile

- **Client** (`/api/client`)
  - `GET /api/client/:id` — client profile and projects
  - `POST /api/client` — create client (admin or onboarding flow)

- **Feed** (`/api/feed`)
  - `GET /api/feed` — fetch feed (with pagination/filters)
  - `POST /api/feed` — create a new post
  - `POST /api/feed/:id/comment` — add comment
  - `POST /api/feed/:id/like` — like a post

- **Team** (`/api/team`)
  - `GET /api/team` — list teams
  - `POST /api/team` — create a team

- **Upload** (`/api/uploads`)
  - `POST /api/uploads/images` — legacy raw S3 upload; disabled in database mode

- **Profile image** (`/api/users`)
  - `POST /api/users/profile-image` — upload/replace one `multipart/form-data` image
  - `GET /api/users/:id/profile-image` — return the stored image bytes
  - `DELETE /api/users/profile-image` — delete the authenticated user's image

- **Post, project and portfolio images** (`/api/images`)
  - `POST /api/images/posts/:id` — upload/replace an owned post image
  - `POST /api/images/projects/:id` — upload/replace an owned project image
  - `POST /api/images/portfolios/:id` — upload/replace an owned portfolio image
  - `GET /api/images/:resource/:id` — return image bytes
  - `DELETE /api/images/:resource/:id` — delete an owned resource image

All POST image endpoints accept one `multipart/form-data` file. Create the post,
project, or portfolio first, then upload its image using the returned resource ID.
In database mode, normal JSON contains a relative `profileImage` or `imageUrl`;
binary fields are returned only by the dedicated GET endpoints.

- **Admin** (`/api/admin`)
  - various admin management endpoints under `src/modules/admin`

- **Docs & OpenAPI**
  - `GET /docs` and the OpenAPI JSON are available under the docs routes in `src/docs`

## Project Structure (high level)

- `src/` — application source
- `src/modules/*` — feature modules (auth, feed, engineers, client, admin, team, upload)
- `src/routes` — top-level route wiring
- `generated/prisma` — Prisma client (do not edit)
- `prisma/` — Prisma schema and migrations

## Notes & Next Steps

- Check `package.json` scripts (`dev`, `start`, `prisma:generate`, `prisma:migrate`) for running and DB tasks.
- Configure environment variables before running the server.
- API tests live under `src/modules/*/*.test.ts` — run `npm test` to execute.

---

Generated README: see project root for details.

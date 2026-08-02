# Enginex project overview

Enginex is an API for an engineering freelancing marketplace. It connects **clients** who need work completed with **engineers** and **companies/teams** that can deliver it.

## User roles

| Role | Main responsibilities |
| --- | --- |
| Client | Maintain a profile, find engineers or teams, save favourites, and create projects. |
| Engineer | Maintain an engineering profile and portfolio, respond to work, and publish feed posts. |
| Company / team | Represent a team, manage its members, respond to work, and publish feed posts. |
| Super admin | Review reports and verification requests. |

## System map

```mermaid
flowchart LR
    Client[Client]
    Engineer[Engineer]
    Team[Company / Team]
    Admin[Super admin]

    API[Express API: /api]
    Auth[Auth module]
    Profiles[Client & profile modules]
    Feed[Feed module]
    Uploads[Upload module]
    AdminModule[Admin module]
    DB[(MySQL via Prisma)]
    S3[(S3-compatible storage)]
    Email[Email service]

    Client --> API
    Engineer --> API
    Team --> API
    Admin --> API
    API --> Auth
    API --> Profiles
    API --> Feed
    API --> Uploads
    API --> AdminModule
    Auth --> DB
    Auth --> Email
    Profiles --> DB
    Feed --> DB
    AdminModule --> DB
    Uploads --> S3
```

## Request flow

```mermaid
flowchart TD
    Start([HTTP request]) --> Server[src/server.ts]
    Server -->|/api| Routes[src/routes/index.ts]
    Routes --> Module[Feature route]
    Module --> Protected{Authentication required?}
    Protected -->|Yes| Auth[authenticateUser]
    Auth --> Allowed{Role allowed?}
    Allowed -->|No| Denied[Return 401 / 403]
    Allowed -->|Yes| Controller
    Protected -->|No| Controller
    Controller --> Service[Service / business logic]
    Service --> Prisma[Prisma client]
    Prisma --> Database[(MySQL)]
    Database --> Response([JSON response])
```

## Core account flow

```mermaid
flowchart TD
    Register[POST /api/auth/register] --> User[Create user and role profile]
    User --> OTP[Create and send OTP]
    OTP --> Verify[POST /api/auth/verify-email]
    Verify --> Verified{OTP valid?}
    Verified -->|No| Retry[Resend OTP or retry]
    Retry --> Verify
    Verified -->|Yes| Active[Mark email verified]
    Active --> Login[POST /api/auth/login]
    Login --> Tokens[Issue access and refresh tokens]
    Tokens --> Protected[Access protected endpoints]
    Protected --> Refresh[POST /api/auth/refresh]
    Refresh --> Tokens
    Protected --> Logout[POST /api/auth/logout]
```

## Project marketplace lifecycle

```mermaid
stateDiagram-v2
    [*] --> OPEN: Client creates project
    OPEN --> ASSIGNED: Engineer or team selected
    ASSIGNED --> IN_PROGRESS: Contract / work begins
    IN_PROGRESS --> COMPLETED: Work accepted
    OPEN --> CANCELLED
    ASSIGNED --> CANCELLED
    IN_PROGRESS --> CANCELLED
    COMPLETED --> [*]
    CANCELLED --> [*]
```

## Feed interaction flow

```mermaid
flowchart LR
    Author[Engineer or team] -->|Create post| Post[Feed post]
    Viewer[Authenticated user] -->|View feed or search| Post
    Viewer -->|Like / unlike| Post
    Viewer -->|Add comment| Comment[Post comment]
    Author -->|Edit / delete own content| Post
    Author -->|Edit / delete own content| Comment
    Post --> Metrics[Like, comment and viral-score metrics]
```

## API modules

| Base path | Purpose | Current route group |
| --- | --- | --- |
| `/api/auth` | Registration, login, OTP verification, token refresh, logout | Auth |
| `/api/clients` | Client profiles, search, favourites and project creation | Client |
| `/api/posts` | Feed, posts, likes and comments | Feed |
| `/api/comments` | Comment editing and deletion | Feed |
| `/api/engineers` | Engineer-only API area | Engineers |
| `/api/team` | Company/team-only API area | Team |
| `/api/admin` | Super-admin-only API area | Admin |
| `/api/uploads` | Authenticated image uploads | Upload |
| `/health` | Service health check | Server |

## Data model at a glance

```mermaid
erDiagram
    USER ||--o| CLIENT_PROFILE : has
    USER ||--o| ENGINEER_PROFILE : has
    USER ||--o| TEAM_PROFILE : has
    USER ||--o{ PROJECT : creates
    PROJECT ||--o{ PROJECT_RESPONSE : receives
    PROJECT ||--o{ CONTRACT : has
    PROJECT ||--o{ RATING : receives
    USER ||--o{ POST : writes
    POST ||--o{ POST_LIKE : receives
    POST ||--o{ POST_COMMENT : contains
    TEAM_PROFILE ||--o{ TEAM_MEMBER : includes
    ENGINEER_PROFILE ||--o{ TEAM_MEMBER : joins
    ENGINEER_PROFILE ||--o{ ENGINEER_PORTFOLIO : owns
```

## Suggested flowcharts to add next

1. Project response flow: engineer/team applies or receives an invitation, client accepts or rejects, and the system creates a contract.
2. Team membership flow: team invites engineer, engineer approves or rejects, membership becomes active.
3. Verification and reporting flow: user submits a request or report, super admin reviews it, and the record is approved, rejected, resolved, or dismissed.
4. Upload flow: authenticated user sends an image, validation checks MIME type and size, then S3 returns a public asset URL.

> Note: The Prisma schema already models projects, responses, contracts, ratings, team members, verifications and reports. Some corresponding route modules are currently placeholders, so their detailed API flows should be defined when those endpoints are implemented.

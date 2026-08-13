const bearerAuth = [{ bearerAuth: [] }];

const jsonResponse = {
  400: { description: "Invalid request" },
  401: { description: "Authentication required or token is invalid" },
  403: { description: "The authenticated user does not have this role" },
  404: { description: "Resource not found" },
  500: { description: "Internal server error" },
};

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Enginex API",
    version: "1.0.0",
    description: "API for the Enginex engineering freelance platform.",
  },
  servers: [{ url: "/api", description: "Current server" }],
  tags: [
    { name: "Auth" },
    { name: "Clients" },
    { name: "Engineers" },
    { name: "Teams" },
    { name: "Posts" },
    { name: "Comments" },
    { name: "Uploads" },
    { name: "Admin" },
  ],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user and send an email OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "User created; verify the OTP before logging in",
          },
          409: { description: "Email already exists" },
          422: { description: "Validation failed" },
          502: { description: "Email delivery failed" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in and receive access and refresh tokens",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description:
              "Authenticated; refresh token is set as an HTTP-only cookie",
          },
          401: { description: "Invalid credentials" },
          403: { description: "Email is not verified" },
          422: { description: "Validation failed" },
        },
      },
    },
    "/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify an emailed OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
            },
          },
        },
        responses: {
          200: { description: "Email verified" },
          400: { description: "Invalid OTP" },
          410: { description: "Expired OTP" },
          422: { description: "Validation failed" },
        },
      },
    },
    "/auth/resend-otp": {
      post: {
        tags: ["Auth"],
        summary: "Send a replacement verification OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string", format: "email" } },
              },
            },
          },
        },
        responses: {
          200: { description: "OTP sent" },
          409: { description: "Email already verified" },
          429: { description: "Resend cooldown active" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh an access token",
        responses: {
          200: { description: "Access token refreshed" },
          401: { description: "Refresh cookie missing" },
          403: { description: "Refresh token invalid or expired" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Clear the refresh-token cookie",
        responses: {
          200: { description: "Logged out" },
          204: { description: "No refresh cookie was present" },
        },
      },
    },

    "/clients/search": {
      get: {
        tags: ["Clients"],
        summary: "Search engineers and teams",
        parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Search results" }, ...jsonResponse },
      },
    },
    "/clients/engineers/{id}": {
      get: {
        tags: ["Clients"],
        summary: "Get a public engineer profile",
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: {
          200: { description: "Engineer profile" },
          ...jsonResponse,
        },
      },
    },
    "/clients/teams/{id}": {
      get: {
        tags: ["Clients"],
        summary: "Get a public team profile",
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 200: { description: "Team profile" }, ...jsonResponse },
      },
    },
    "/clients/profile": {
      get: {
        tags: ["Clients"],
        summary: "Get the current client profile",
        security: bearerAuth,
        responses: { 200: { description: "Client profile" }, ...jsonResponse },
      },
      put: {
        tags: ["Clients"],
        summary: "Update the current client profile",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClientProfile" },
            },
          },
        },
        responses: { 200: { description: "Profile updated" }, ...jsonResponse },
      },
    },
    "/clients/favorites": {
      get: {
        tags: ["Clients"],
        summary: "List favorite engineers",
        security: bearerAuth,
        responses: { 200: { description: "Favorites" }, ...jsonResponse },
      },
      post: {
        tags: ["Clients"],
        summary: "Favorite an engineer",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["engineerProfileId"],
                properties: {
                  engineerProfileId: { type: "integer", minimum: 1 },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Favorite saved" }, ...jsonResponse },
      },
      delete: {
        tags: ["Clients"],
        summary: "Remove a favorite engineer",
        security: bearerAuth,
        parameters: [
          {
            name: "engineerProfileId",
            in: "query",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          204: { description: "Favorite removed" },
          ...jsonResponse,
        },
      },
    },
    "/clients/projects": {
      post: {
        tags: ["Clients"],
        summary: "Create a project listing",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Project" },
            },
          },
        },
        responses: { 201: { description: "Project created" }, ...jsonResponse },
      },
    },

    "/engineers": {
      get: {
        tags: ["Engineers"],
        summary: "Engineer route health check",
        responses: { 200: { description: "Route is available" } },
      },
    },
    "/engineers/profile": {
      get: {
        tags: ["Engineers"],
        summary: "Get the current engineer profile",
        security: bearerAuth,
        responses: {
          200: { description: "Engineer profile" },
          ...jsonResponse,
        },
      },
      put: {
        tags: ["Engineers"],
        summary: "Replace/update the current engineer profile",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EngineerProfile" },
            },
          },
        },
        responses: { 200: { description: "Profile updated" }, ...jsonResponse },
      },
      patch: {
        tags: ["Engineers"],
        summary: "Partially update the current engineer profile",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/EngineerProfile" },
            },
          },
        },
        responses: { 200: { description: "Profile updated" }, ...jsonResponse },
      },
    },
    "/engineers/profile/status": {
      put: {
        tags: ["Engineers"],
        summary: "Update engineer availability",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["availabilityStatus"],
                properties: {
                  availabilityStatus: {
                    type: "string",
                    enum: ["AVAILABLE", "BUSY", "ON_PROJECT"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Availability updated" },
          ...jsonResponse,
        },
      },
    },
    "/engineers/direct-projects": {
      get: {
        tags: ["Engineers"],
        summary: "List direct project assignments",
        security: bearerAuth,
        responses: { 200: { description: "Direct projects" }, ...jsonResponse },
      },
    },
    "/engineers/companies": {
      get: {
        tags: ["Engineers"],
        summary: "List companies",
        security: bearerAuth,
        responses: { 200: { description: "Companies" }, ...jsonResponse },
      },
    },
    "/engineers/projects/{id}/apply": {
      post: {
        tags: ["Engineers"],
        summary: "Apply to an open project",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  proposedPrice: { type: "number", minimum: 0 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Application submitted" },
          ...jsonResponse,
        },
      },
    },

    "/team/profile": {
      get: {
        tags: ["Teams"],
        summary: "Get the current company team profile",
        security: bearerAuth,
        responses: { 200: { description: "Team profile" }, ...jsonResponse },
      },
      patch: {
        tags: ["Teams"],
        summary: "Update the current company team profile",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TeamProfile" },
            },
          },
        },
        responses: {
          200: { description: "Team profile updated" },
          ...jsonResponse,
        },
      },
    },
    "/team/members": {
      get: {
        tags: ["Teams"],
        summary: "List team members",
        security: bearerAuth,
        responses: { 200: { description: "Members" }, ...jsonResponse },
      },
      post: {
        tags: ["Teams"],
        summary: "Invite an engineer",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["engineerProfileId"],
                properties: {
                  engineerProfileId: { type: "integer" },
                  roleInTeam: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Invitation created" },
          ...jsonResponse,
        },
      },
    },
    "/team/members/{memberId}": {
      delete: {
        tags: ["Teams"],
        summary: "Remove a team member",
        security: bearerAuth,
        parameters: [
          {
            name: "memberId",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: { 204: { description: "Member removed" }, ...jsonResponse },
      },
    },
    "/team/invitations": {
      get: {
        tags: ["Teams"],
        summary: "List the current engineer's team invitations",
        security: bearerAuth,
        responses: { 200: { description: "Invitations" }, ...jsonResponse },
      },
    },
    "/team/members/{memberId}/decision": {
      patch: {
        tags: ["Teams"],
        summary: "Accept or reject a team invitation",
        security: bearerAuth,
        parameters: [
          {
            name: "memberId",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["approvalStatus"],
                properties: {
                  approvalStatus: {
                    type: "string",
                    enum: ["APPROVED", "REJECTED"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Invitation updated" },
          ...jsonResponse,
        },
      },
    },

    "/posts": {
      post: {
        tags: ["Posts"],
        summary: "Create a post",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Post" },
            },
          },
        },
        responses: { 201: { description: "Post created" }, ...jsonResponse },
      },
    },
    "/posts/feed": {
      get: {
        tags: ["Posts"],
        summary: "Get the public feed",
        security: bearerAuth,
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10, maximum: 50 },
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string", enum: ["latest", "trending"] },
          },
        ],
        responses: { 200: { description: "Paginated feed" }, ...jsonResponse },
      },
    },
    "/posts/search": {
      get: {
        tags: ["Posts"],
        summary: "Search posts",
        security: bearerAuth,
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          { name: "page", in: "query", schema: { type: "integer" } },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", maximum: 50 },
          },
        ],
        responses: { 200: { description: "Search results" }, ...jsonResponse },
      },
    },
    "/posts/{id}": {
      patch: {
        tags: ["Posts"],
        summary: "Update an owned post",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Post" },
            },
          },
        },
        responses: { 200: { description: "Post updated" }, ...jsonResponse },
      },
      delete: {
        tags: ["Posts"],
        summary: "Delete an owned post",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 204: { description: "Post deleted" }, ...jsonResponse },
      },
    },
    "/posts/{id}/like": {
      post: {
        tags: ["Posts"],
        summary: "Like a post",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 201: { description: "Post liked" }, ...jsonResponse },
      },
      delete: {
        tags: ["Posts"],
        summary: "Remove a post like",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 200: { description: "Like removed" }, ...jsonResponse },
      },
    },
    "/posts/{id}/comments": {
      get: {
        tags: ["Comments"],
        summary: "List a post's comments",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 200: { description: "Comments" }, ...jsonResponse },
      },
      post: {
        tags: ["Comments"],
        summary: "Comment on a post",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["comment"],
                properties: { comment: { type: "string" } },
              },
            },
          },
        },
        responses: { 201: { description: "Comment created" }, ...jsonResponse },
      },
    },
    "/comments/{id}": {
      patch: {
        tags: ["Comments"],
        summary: "Update an owned comment",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["comment"],
                properties: { comment: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Comment updated" }, ...jsonResponse },
      },
      delete: {
        tags: ["Comments"],
        summary: "Delete an owned comment",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 204: { description: "Comment deleted" }, ...jsonResponse },
      },
    },
    "/uploads/images": {
      post: {
        tags: ["Uploads"],
        summary: "Upload an image",
        description: "Send the raw image bytes, not multipart form data.",
        security: bearerAuth,
        requestBody: {
          required: true,
          content: {
            "image/jpeg": { schema: { type: "string", format: "binary" } },
            "image/png": { schema: { type: "string", format: "binary" } },
            "image/webp": { schema: { type: "string", format: "binary" } },
            "image/gif": { schema: { type: "string", format: "binary" } },
          },
        },
        responses: { 201: { description: "Image uploaded" }, ...jsonResponse },
      },
    },
    "/admin": {
      get: {
        tags: ["Admin"],
        summary: "Admin route health check",
        security: bearerAuth,
        responses: {
          200: { description: "Route is available" },
          ...jsonResponse,
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List all users",
        security: bearerAuth,
        responses: { 200: { description: "Users" }, ...jsonResponse },
      },
    },
    "/admin/users/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Get a user",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 200: { description: "User" }, ...jsonResponse },
      },
      patch: {
        tags: ["Admin"],
        summary: "Update a user",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { 200: { description: "User updated" }, ...jsonResponse },
      },
      put: {
        tags: ["Admin"],
        summary: "Replace/update a user",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { 200: { description: "User updated" }, ...jsonResponse },
      },
      delete: {
        tags: ["Admin"],
        summary: "Delete a user",
        security: bearerAuth,
        parameters: [{ $ref: "#/components/parameters/Id" }],
        responses: { 204: { description: "User deleted" }, ...jsonResponse },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    parameters: {
      Id: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "integer", minimum: 1 },
      },
    },
    schemas: {
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password", "role"],
        properties: {
          name: { type: "string", minLength: 3 },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6, format: "password" },
          role: { type: "string", enum: ["CLIENT", "ENGINEER", "COMPANY"] },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
      },
      VerifyEmailRequest: {
        type: "object",
        required: ["email", "otp"],
        properties: {
          email: { type: "string", format: "email" },
          otp: { type: "string", pattern: "^\\d{6}$" },
        },
      },
      ClientProfile: {
        type: "object",
        properties: {
          bio: { type: "string" },
          avatarUrl: { type: "string", format: "uri" },
          location: { type: "string" },
        },
      },
      EngineerProfile: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          profileImage: { type: "string", format: "uri" },
          specialization: {
            type: "string",
            enum: ["CIVIL", "ARCHITECT", "MECHANICAL", "ELECTRICAL"],
          },
          bio: { type: "string" },
          avatarUrl: { type: "string", format: "uri" },
          yearsOfExperience: { type: "integer", minimum: 0 },
          availabilityStatus: {
            type: "string",
            enum: ["AVAILABLE", "BUSY", "ON_PROJECT"],
          },
          hourlyRate: { type: "number", minimum: 0 },
          location: { type: "string" },
        },
      },
      TeamProfile: {
        type: "object",
        properties: {
          companyName: { type: "string" },
          description: { type: "string" },
          website: { type: "string", format: "uri" },
          location: { type: "string" },
        },
      },
      Project: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          budgetMin: { type: "number" },
          budgetMax: { type: "number" },
          location: { type: "string" },
        },
      },
      Post: {
        type: "object",
        required: ["title", "content"],
        properties: {
          title: { type: "string", minLength: 3 },
          content: { type: "string", minLength: 1 },
          visibility: {
            type: "string",
            enum: ["PUBLIC", "PRIVATE"],
            default: "PUBLIC",
          },
          imageUrl: { type: "string", format: "uri" },
        },
      },
    },
  },
} as const;

export { openApiDocument };

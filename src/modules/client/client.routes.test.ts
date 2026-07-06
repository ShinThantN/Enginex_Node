import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import clientRouter from "./client.routes.ts";
import * as clientService from "./client.service.ts";

jest.mock("../../shared/middlewares/index.ts", () => ({
  authenticateUser: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authorization.slice(7).trim();

    if (token === "valid-client-token") {
      req.user = { id: 10, role: "CLIENT" };
      next();
      return;
    }

    if (token === "valid-engineer-token") {
      req.user = { id: 12, role: "ENGINEER" };
      next();
      return;
    }

    res.status(401).json({ error: "Invalid or expired access token" });
  },
  requireRole:
    (...allowedRoles: string[]) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!req.user) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res
          .status(403)
          .json({ error: `Forbidden: requires role ${allowedRoles.join(" or ")}` });
        return;
      }

      next();
    },
}));

jest.mock("./client.service.ts", () => ({
  getClientProfile: jest.fn(),
  updateClientProfile: jest.fn(),
  searchEngineersAndTeams: jest.fn(),
  getEngineerProfile: jest.fn(),
  getTeamProfile: jest.fn(),
  saveFavorite: jest.fn(),
  getFavorites: jest.fn(),
  createProject: jest.fn(),
}));

type AsyncMock<T> = jest.Mock<(...args: unknown[]) => Promise<T>>;

const app = express();
app.use(express.json());
app.use("/api/clients", clientRouter);

describe("Client Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET /api/clients/search should return engineers and teams", async () => {
    const mockData = {
      engineers: [{ id: 1, specialization: "CIVIL" }],
      teams: [{ id: 3, companyName: "Build Team" }],
    };

    (
      clientService.searchEngineersAndTeams as unknown as AsyncMock<
        typeof mockData
      >
    ).mockResolvedValue(mockData);

    const res = await request(app).get(
      "/api/clients/search?q=jo&type=engineer&page=1&limit=10",
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(mockData);
  });

  it("GET /api/clients/engineers/:id should return engineer profile", async () => {
    const engineer = { id: 4, user: { id: 2, fullName: "Alex" } };

    (
      clientService.getEngineerProfile as unknown as AsyncMock<typeof engineer>
    ).mockResolvedValue(engineer);

    const res = await request(app).get("/api/clients/engineers/4");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(engineer);
  });

  it("GET /api/clients/engineers/:id should fail for invalid ID", async () => {
    const res = await request(app).get("/api/clients/engineers/abc");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid engineer profile ID" });
  });

  it("GET /api/clients/teams/:id should return team profile", async () => {
    const team = { id: 7, companyName: "Skyline Team" };

    (
      clientService.getTeamProfile as unknown as AsyncMock<typeof team>
    ).mockResolvedValue(team);

    const res = await request(app).get("/api/clients/teams/7");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(team);
  });

  it("GET /api/clients/profile should return 401 without token", async () => {
    const res = await request(app).get("/api/clients/profile");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Authentication required" });
  });

  it("GET /api/clients/profile should return 403 for non-client role", async () => {
    const res = await request(app)
      .get("/api/clients/profile")
      .set("Authorization", "Bearer valid-engineer-token");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden: requires role CLIENT" });
  });

  it("GET /api/clients/profile should return current profile for client", async () => {
    const profile = {
      id: 10,
      email: "client@example.com",
      fullName: "Client User",
      role: "CLIENT",
      clientProfile: { bio: "Test" },
    };

    (
      clientService.getClientProfile as unknown as AsyncMock<typeof profile>
    ).mockResolvedValue(profile);

    const res = await request(app)
      .get("/api/clients/profile")
      .set("Authorization", "Bearer valid-client-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(profile);
  });

  it("PUT /api/clients/profile should validate payload", async () => {
    const res = await request(app)
      .put("/api/clients/profile")
      .set("Authorization", "Bearer valid-client-token")
      .send({ avatarUrl: "not-a-valid-url" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("PUT /api/clients/profile should update profile", async () => {
    const updated = {
      id: 10,
      fullName: "Updated Name",
      role: "CLIENT",
      clientProfile: { bio: "Updated bio" },
    };

    (
      clientService.updateClientProfile as unknown as AsyncMock<typeof updated>
    ).mockResolvedValue(updated);

    const payload = { fullName: "Updated Name", bio: "Updated bio" };
    const res = await request(app)
      .put("/api/clients/profile")
      .set("Authorization", "Bearer valid-client-token")
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(updated);
  });

  it("POST /api/clients/favorites should save favorite engineer", async () => {
    const favorite = { id: 22, clientId: 10, engineerProfileId: 5 };

    (
      clientService.saveFavorite as unknown as AsyncMock<typeof favorite>
    ).mockResolvedValue(favorite);

    const res = await request(app)
      .post("/api/clients/favorites")
      .set("Authorization", "Bearer valid-client-token")
      .send({ engineerProfileId: 5 });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(favorite);
  });

  it("GET /api/clients/favorites should return favorite list", async () => {
    const favorites = [{ id: 22, engineerProfileId: 5 }];

    (
      clientService.getFavorites as unknown as AsyncMock<typeof favorites>
    ).mockResolvedValue(favorites);

    const res = await request(app)
      .get("/api/clients/favorites")
      .set("Authorization", "Bearer valid-client-token");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(favorites);
  });

  it("POST /api/clients/projects should create project", async () => {
    const project = {
      id: 99,
      clientId: 10,
      title: "Bridge Design",
      assignmentType: "OPEN",
      visibility: "PUBLIC",
      status: "OPEN",
    };

    (
      clientService.createProject as unknown as AsyncMock<typeof project>
    ).mockResolvedValue(project);

    const res = await request(app)
      .post("/api/clients/projects")
      .set("Authorization", "Bearer valid-client-token")
      .send({
        title: "Bridge Design",
        description: "Need civil engineer",
        imageUrl: "https://example.com/image.jpg",
        budgetMin: 1500,
        budgetMax: 3000,
        location: "Dhaka",
        visibility: "PUBLIC",
        assignmentType: "OPEN",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(project);
  });
});

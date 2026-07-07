import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { postsRouter, commentsRouter } from "./feed.routes.ts";
import * as feedService from "./feed.service.ts";
import { AppError } from "../../shared/utils/utils.ts";

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

    if (token === "valid-company-token") {
      req.user = { id: 20, role: "COMPANY" };
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

jest.mock("./feed.service.ts", () => ({
  createPost: jest.fn(),
  getFeed: jest.fn(),
  searchPosts: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  likePost: jest.fn(),
  unlikePost: jest.fn(),
  addComment: jest.fn(),
  getComments: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
}));

type AsyncMock<T = unknown> = jest.Mock<(...args: unknown[]) => Promise<T>>;
const asAsync = <T = unknown>(fn: unknown) => fn as AsyncMock<T>;

const app = express();
app.use(express.json());
app.use("/api/posts", postsRouter);
app.use("/api/comments", commentsRouter);

describe("Feed Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/posts", () => {
    it("creates a post for an engineer", async () => {
      const post = { id: 1, authorId: 12, title: "Hello", content: "There" };
      asAsync(feedService.createPost).mockResolvedValue(post);

      const res = await request(app)
        .post("/api/posts")
        .set("Authorization", "Bearer valid-engineer-token")
        .send({ title: "Hello", content: "There" });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(post);
    });

    it("creates a post for a team (company)", async () => {
      const post = { id: 2, authorId: 20, title: "Team", content: "Post" };
      asAsync(feedService.createPost).mockResolvedValue(post);

      const res = await request(app)
        .post("/api/posts")
        .set("Authorization", "Bearer valid-company-token")
        .send({ title: "Team", content: "Post" });

      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(post);
    });

    it("forbids a client from creating a post", async () => {
      const res = await request(app)
        .post("/api/posts")
        .set("Authorization", "Bearer valid-client-token")
        .send({ title: "Nope", content: "Blocked" });

      expect(res.status).toBe(403);
      expect(feedService.createPost).not.toHaveBeenCalled();
    });

    it("requires authentication", async () => {
      const res = await request(app)
        .post("/api/posts")
        .send({ title: "Hi", content: "There" });

      expect(res.status).toBe(401);
    });

    it("validates the payload", async () => {
      const res = await request(app)
        .post("/api/posts")
        .set("Authorization", "Bearer valid-engineer-token")
        .send({ title: "no", content: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(feedService.createPost).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/posts/feed", () => {
    it("returns the feed for any authenticated user", async () => {
      asAsync(feedService.getFeed).mockResolvedValue({
        items: [{ id: 1, authorId: 12 }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get("/api/posts/feed?sort=trending")
        .set("Authorization", "Bearer valid-client-token");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ id: 1, authorId: 12 }]);
      expect(res.body.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it("requires authentication", async () => {
      const res = await request(app).get("/api/posts/feed");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/posts/search", () => {
    it("returns search results", async () => {
      asAsync(feedService.searchPosts).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      const res = await request(app)
        .get("/api/posts/search?q=bridge")
        .set("Authorization", "Bearer valid-engineer-token");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("rejects a missing query", async () => {
      const res = await request(app)
        .get("/api/posts/search")
        .set("Authorization", "Bearer valid-engineer-token");

      expect(res.status).toBe(400);
    });
  });

  describe("likes", () => {
    it("likes a post", async () => {
      asAsync(feedService.likePost).mockResolvedValue({ id: 1, likeCount: 1 });

      const res = await request(app)
        .post("/api/posts/1/like")
        .set("Authorization", "Bearer valid-client-token");

      expect(res.status).toBe(201);
      expect(feedService.likePost).toHaveBeenCalledWith(10, 1);
    });

    it("unlikes a post", async () => {
      asAsync(feedService.unlikePost).mockResolvedValue({ id: 1, likeCount: 0 });

      const res = await request(app)
        .delete("/api/posts/1/like")
        .set("Authorization", "Bearer valid-client-token");

      expect(res.status).toBe(200);
      expect(feedService.unlikePost).toHaveBeenCalledWith(10, 1);
    });

    it("rejects an invalid post id", async () => {
      const res = await request(app)
        .post("/api/posts/abc/like")
        .set("Authorization", "Bearer valid-client-token");

      expect(res.status).toBe(400);
    });
  });

  describe("comments", () => {
    it("creates a comment", async () => {
      asAsync(feedService.addComment).mockResolvedValue({ id: 5, comment: "nice" });

      const res = await request(app)
        .post("/api/posts/3/comments")
        .set("Authorization", "Bearer valid-client-token")
        .send({ comment: "nice" });

      expect(res.status).toBe(201);
      expect(feedService.addComment).toHaveBeenCalledWith(10, 3, { comment: "nice" });
    });

    it("lists comments", async () => {
      asAsync(feedService.getComments).mockResolvedValue({
        items: [{ id: 5, comment: "nice" }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });

      const res = await request(app)
        .get("/api/posts/3/comments")
        .set("Authorization", "Bearer valid-client-token");

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([{ id: 5, comment: "nice" }]);
    });

    it("updates a comment via /api/comments/:id", async () => {
      asAsync(feedService.updateComment).mockResolvedValue({ id: 5, comment: "edited" });

      const res = await request(app)
        .patch("/api/comments/5")
        .set("Authorization", "Bearer valid-client-token")
        .send({ comment: "edited" });

      expect(res.status).toBe(200);
      expect(feedService.updateComment).toHaveBeenCalledWith(10, 5, { comment: "edited" });
    });

    it("deletes a comment via /api/comments/:id", async () => {
      asAsync(feedService.deleteComment).mockResolvedValue(undefined);

      const res = await request(app)
        .delete("/api/comments/5")
        .set("Authorization", "Bearer valid-client-token");

      expect(res.status).toBe(204);
      expect(feedService.deleteComment).toHaveBeenCalledWith(10, 5);
    });
  });

  describe("error mapping", () => {
    it("maps an AppError thrown by the service to its status code", async () => {
      asAsync(feedService.updatePost).mockRejectedValue(
        new AppError("You can only modify your own posts", 403),
      );

      const res = await request(app)
        .patch("/api/posts/1")
        .set("Authorization", "Bearer valid-engineer-token")
        .send({ title: "New title" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "You can only modify your own posts" });
    });
  });
});

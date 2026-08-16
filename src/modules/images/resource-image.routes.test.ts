import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import resourceImageRouter from "./resource-image.routes.ts";
import * as resourceImageService from "./resource-image.service.ts";

jest.mock("../../shared/middlewares/index.ts", () => ({
  authenticateUser: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.headers.authorization === "Bearer valid-token") {
      req.user = { id: 12, role: "ENGINEER" };
      next();
      return;
    }
    res.status(401).json({ error: "Authentication required" });
  },
}));

jest.mock("./resource-image.service.ts", () => ({
  resourceKinds: ["posts", "projects", "portfolios"],
  saveResourceImage: jest.fn(),
  getResourceImage: jest.fn(),
  deleteResourceImage: jest.fn(),
}));

type AsyncMock<T = unknown> = jest.Mock<(...args: unknown[]) => Promise<T>>;
const asAsync = <T = unknown>(fn: unknown) => fn as AsyncMock<T>;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const app = express();
app.use("/api/images", resourceImageRouter);

describe("Resource image routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uploads one multipart image to a target resource", async () => {
    asAsync(resourceImageService.saveResourceImage).mockResolvedValue({
      imageUrl: "/api/images/posts/3",
      storageProvider: "database",
    });

    const response = await request(app)
      .post("/api/images/posts/3")
      .set("Authorization", "Bearer valid-token")
      .attach("image", png, { filename: "post.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(resourceImageService.saveResourceImage).toHaveBeenCalledWith(
      12,
      "posts",
      3,
      expect.any(Buffer),
      "image/png",
    );
  });

  it("returns stored image bytes without authentication", async () => {
    asAsync(resourceImageService.getResourceImage).mockResolvedValue({
      imageData: Uint8Array.from(png),
      imageType: "image/png",
    });

    const response = await request(app).get("/api/images/projects/4");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^image\/png/);
    expect(Buffer.compare(response.body as Buffer, png)).toBe(0);
  });

  it("requires authentication to upload or delete", async () => {
    const upload = await request(app)
      .post("/api/images/portfolios/5")
      .attach("image", png, { filename: "portfolio.png", contentType: "image/png" });
    const deletion = await request(app).delete("/api/images/posts/3");

    expect(upload.status).toBe(401);
    expect(deletion.status).toBe(401);
  });

  it("rejects unknown resource types", async () => {
    const response = await request(app).get("/api/images/reports/1");
    expect(response.status).toBe(400);
  });
});

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppError } from "../../shared/utils/utils.ts";
import usersRouter from "./users.routes.ts";
import * as profileImageService from "./profile-image.service.ts";

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

jest.mock("./profile-image.service.ts", () => ({
  saveProfileImage: jest.fn(),
  getProfileImage: jest.fn(),
  deleteProfileImage: jest.fn(),
}));

type AsyncMock<T = unknown> = jest.Mock<(...args: unknown[]) => Promise<T>>;
const asAsync = <T = unknown>(fn: unknown) => fn as AsyncMock<T>;

const app = express();
app.use("/api/users", usersRouter);

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("User profile image routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts one multipart image in memory", async () => {
    asAsync(profileImageService.saveProfileImage).mockResolvedValue({
      profileImage: "/api/users/12/profile-image",
      storageProvider: "database",
    });

    const response = await request(app)
      .post("/api/users/profile-image")
      .set("Authorization", "Bearer valid-token")
      .attach("image", png, { filename: "avatar.png", contentType: "image/png" });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      profileImage: "/api/users/12/profile-image",
      storageProvider: "database",
    });
    expect(profileImageService.saveProfileImage).toHaveBeenCalledWith(
      12,
      expect.any(Buffer),
      "image/png",
    );
  });

  it("requires authentication for upload and deletion", async () => {
    const upload = await request(app)
      .post("/api/users/profile-image")
      .attach("image", png, { filename: "avatar.png", contentType: "image/png" });
    const deletion = await request(app).delete("/api/users/profile-image");

    expect(upload.status).toBe(401);
    expect(deletion.status).toBe(401);
  });

  it("returns the image bytes with their stored MIME type", async () => {
    asAsync(profileImageService.getProfileImage).mockResolvedValue({
      imageData: Uint8Array.from(png),
      imageType: "image/png",
    });

    const response = await request(app).get("/api/users/12/profile-image");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^image\/png/);
    expect(Buffer.compare(response.body as Buffer, png)).toBe(0);
  });

  it("returns 404 when the user has no stored profile image", async () => {
    asAsync(profileImageService.getProfileImage).mockRejectedValue(
      new AppError("Profile image not found", 404),
    );

    const response = await request(app).get("/api/users/12/profile-image");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Profile image not found" });
  });

  it("deletes the authenticated user's image", async () => {
    asAsync(profileImageService.deleteProfileImage).mockResolvedValue(undefined);

    const response = await request(app)
      .delete("/api/users/profile-image")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(204);
    expect(profileImageService.deleteProfileImage).toHaveBeenCalledWith(12);
  });
});

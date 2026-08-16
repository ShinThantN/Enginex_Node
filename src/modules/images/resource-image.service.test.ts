import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { prisma } from "../../shared/config/prisma.ts";
import {
  deleteResourceImage,
  getResourceImage,
  saveResourceImage,
} from "./resource-image.service.ts";

jest.mock("../../shared/config/prisma.ts", () => ({
  prisma: {
    post: { findUnique: jest.fn(), update: jest.fn() },
    project: { findUnique: jest.fn(), update: jest.fn() },
    engineerPortfolio: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

type AsyncMock<T = unknown> = jest.Mock<(...args: unknown[]) => Promise<T>>;
const asAsync = <T = unknown>(fn: unknown) => fn as AsyncMock<T>;
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const originalStorageProvider = process.env["STORAGE_PROVIDER"];

describe("Resource image service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env["STORAGE_PROVIDER"] = "database";
    asAsync(prisma.post.update).mockResolvedValue({});
    asAsync(prisma.project.update).mockResolvedValue({});
    asAsync(prisma.engineerPortfolio.update).mockResolvedValue({});
  });

  afterEach(() => {
    if (originalStorageProvider === undefined) {
      delete process.env["STORAGE_PROVIDER"];
    } else {
      process.env["STORAGE_PROVIDER"] = originalStorageProvider;
    }
  });

  it("stores a post image on an owned post", async () => {
    asAsync<{ userId: number }>(prisma.post.findUnique).mockResolvedValue({ userId: 12 });

    const result = await saveResourceImage(12, "posts", 3, png, "image/png");

    expect(prisma.post.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        imageUrl: "/api/images/posts/3",
        imageData: Uint8Array.from(png),
        imageType: "image/png",
      },
    });
    expect(result).toEqual({
      imageUrl: "/api/images/posts/3",
      storageProvider: "database",
    });
    expect(result).not.toHaveProperty("imageData");
  });

  it("stores project and portfolio images only for their owners", async () => {
    asAsync<{ clientId: number }>(prisma.project.findUnique).mockResolvedValue({
      clientId: 20,
    });
    asAsync<{ engineerProfile: { userId: number } }>(
      prisma.engineerPortfolio.findUnique,
    ).mockResolvedValue({ engineerProfile: { userId: 30 } });

    await saveResourceImage(20, "projects", 4, png, "image/png");
    await saveResourceImage(30, "portfolios", 5, png, "image/png");

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 4 },
        data: expect.objectContaining({ imageUrl: "/api/images/projects/4" }),
      }),
    );
    expect(prisma.engineerPortfolio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ imageUrl: "/api/images/portfolios/5" }),
      }),
    );
  });

  it("rejects image changes by a non-owner", async () => {
    asAsync<{ userId: number }>(prisma.post.findUnique).mockResolvedValue({ userId: 99 });

    await expect(saveResourceImage(12, "posts", 3, png, "image/png")).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(prisma.post.update).not.toHaveBeenCalled();
  });

  it("queries only image bytes and MIME type for retrieval", async () => {
    asAsync<{ imageData: Uint8Array; imageType: string }>(
      prisma.project.findUnique,
    ).mockResolvedValue({ imageData: Uint8Array.from(png), imageType: "image/png" });

    await expect(getResourceImage("projects", 4)).resolves.toEqual({
      imageData: Uint8Array.from(png),
      imageType: "image/png",
    });
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: 4 },
      select: { imageData: true, imageType: true },
    });
  });

  it("returns 404 when no database image exists", async () => {
    asAsync<null>(prisma.post.findUnique).mockResolvedValue(null);

    await expect(getResourceImage("posts", 3)).rejects.toMatchObject({
      message: "Image not found",
      statusCode: 404,
    });
  });

  it("clears the URL, bytes, and MIME type on deletion", async () => {
    asAsync<{ clientId: number }>(prisma.project.findUnique).mockResolvedValue({
      clientId: 20,
    });

    await deleteResourceImage(20, "projects", 4);

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { imageUrl: null, imageData: null, imageType: null },
    });
  });
});

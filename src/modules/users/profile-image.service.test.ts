import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { prisma } from "../../shared/config/prisma.ts";
import {
  deleteProfileImage,
  getProfileImage,
  saveProfileImage,
} from "./profile-image.service.ts";
import { validateImage } from "../../shared/config/image-storage.ts";
import { MAX_PROFILE_IMAGE_BYTES } from "../../shared/middlewares/image-upload.middleware.ts";

jest.mock("../../shared/config/prisma.ts", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

type AsyncMock<T = unknown> = jest.Mock<(...args: unknown[]) => Promise<T>>;
const asAsync = <T = unknown>(fn: unknown) => fn as AsyncMock<T>;

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const originalStorageProvider = process.env["STORAGE_PROVIDER"];

describe("Profile image service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env["STORAGE_PROVIDER"] = "database";
    asAsync(prisma.user.update).mockResolvedValue({});
  });

  afterEach(() => {
    if (originalStorageProvider === undefined) {
      delete process.env["STORAGE_PROVIDER"];
    } else {
      process.env["STORAGE_PROVIDER"] = originalStorageProvider;
    }
  });

  it("stores image bytes and MIME type in the database without returning bytes", async () => {
    const result = await saveProfileImage(12, png, "image/png");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        profileImage: "/api/users/12/profile-image",
        imageData: Uint8Array.from(png),
        imageType: "image/png",
      },
    });
    expect(result).toEqual({
      profileImage: "/api/users/12/profile-image",
      storageProvider: "database",
    });
    expect(result).not.toHaveProperty("imageData");
  });

  it("replaces the existing BLOB by updating the same user fields", async () => {
    const webp = Buffer.from("RIFF0000WEBP", "ascii");

    await saveProfileImage(12, png, "image/png");
    await saveProfileImage(12, webp, "image/webp");

    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: 12 },
      data: {
        profileImage: "/api/users/12/profile-image",
        imageData: Uint8Array.from(webp),
        imageType: "image/webp",
      },
    });
  });

  it("queries only the binary fields when retrieving an image", async () => {
    asAsync<{ imageData: Uint8Array; imageType: string }>(
      prisma.user.findUnique,
    ).mockResolvedValue({ imageData: Uint8Array.from(png), imageType: "image/png" });

    await expect(getProfileImage(12)).resolves.toEqual({
      imageData: Uint8Array.from(png),
      imageType: "image/png",
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 12 },
      select: { imageData: true, imageType: true },
    });
  });

  it("returns a 404 application error when no image exists", async () => {
    asAsync<null>(prisma.user.findUnique).mockResolvedValue(null);

    await expect(getProfileImage(12)).rejects.toMatchObject({
      message: "Profile image not found",
      statusCode: 404,
    });
  });

  it("clears the BLOB, MIME type, and profile reference when deleting", async () => {
    await deleteProfileImage(12);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: { profileImage: null, imageData: null, imageType: null },
    });
  });

  it("rejects unsupported, oversized, and MIME-spoofed files", () => {
    expect(() => validateImage(Buffer.from("GIF89a"), "image/gif")).toThrow(
      "Only JPEG, PNG, and WebP",
    );
    expect(() =>
      validateImage(Buffer.alloc(MAX_PROFILE_IMAGE_BYTES + 1), "image/png"),
    ).toThrow("5 MB or smaller");
    expect(() => validateImage(png, "image/jpeg")).toThrow(
      "does not match its image MIME type",
    );
  });
});

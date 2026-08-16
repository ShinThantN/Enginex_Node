import { MAX_PROFILE_IMAGE_BYTES } from "../middlewares/image-upload.middleware.ts";
import { AppError } from "../utils/utils.ts";

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof allowedImageTypes)[number];
export type StorageProvider = "database" | "s3";

export function getStorageProvider(): StorageProvider {
  const provider = process.env["STORAGE_PROVIDER"]?.trim().toLowerCase() || "database";
  if (provider !== "database" && provider !== "s3") {
    throw new AppError('STORAGE_PROVIDER must be either "database" or "s3"', 500);
  }
  return provider;
}

function detectImageType(image: Buffer): AllowedImageType | null {
  if (
    image.length >= 3 &&
    image[0] === 0xff &&
    image[1] === 0xd8 &&
    image[2] === 0xff
  ) {
    return "image/jpeg";
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (image.length >= pngSignature.length && image.subarray(0, 8).equals(pngSignature)) {
    return "image/png";
  }

  if (
    image.length >= 12 &&
    image.subarray(0, 4).toString("ascii") === "RIFF" &&
    image.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

export function validateImage(image: Buffer, mimeType: string): AllowedImageType {
  if (image.length === 0) throw new AppError("An image is required", 400);
  if (image.length > MAX_PROFILE_IMAGE_BYTES) {
    throw new AppError("Image must be 5 MB or smaller", 413);
  }
  if (!allowedImageTypes.includes(mimeType as AllowedImageType)) {
    throw new AppError("Only JPEG, PNG, and WebP images are supported", 400);
  }

  const detectedType = detectImageType(image);
  if (!detectedType || detectedType !== mimeType) {
    throw new AppError("The uploaded file content does not match its image MIME type", 400);
  }
  return detectedType;
}

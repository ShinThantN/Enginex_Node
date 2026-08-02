import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { AppError } from "../utils/utils.ts";

const supportedImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

type SupportedImageType = keyof typeof supportedImageTypes;

function getS3Config(): {
  bucket: string;
  region: string;
  credentials: { accessKeyId: string; secretAccessKey: string };
  publicBaseUrl?: string;
} {
  const bucket =
    process.env["AWS_S3_BUCKET"] ||
    process.env["AWS_BUCKET_NAME"] ||
    process.env["AWS_BUCKET"] ||
    process.env["S3_BUCKET_NAME"];
  const region = process.env["AWS_REGION"];
  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"] || process.env["AWS_ACCESS_KEY"];
  const secretAccessKey =
    process.env["AWS_SECRET_ACCESS_KEY"] || process.env["AWS_SECRET_KEY"];

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new AppError(
      "S3 is not configured. Set the bucket, region, access key, and secret key variables.",
      500,
    );
  }

  const publicBaseUrl = process.env["AWS_S3_PUBLIC_BASE_URL"]?.replace(/\/$/, "");
  return {
    bucket,
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(publicBaseUrl ? { publicBaseUrl } : {}),
  };
}

function isSupportedImageType(contentType: string): contentType is SupportedImageType {
  return contentType in supportedImageTypes;
}

export async function uploadImage(
  userId: number,
  image: Buffer,
  contentType: string | undefined,
): Promise<{ key: string; url: string }> {
  const mimeType = contentType?.split(";", 1)[0]?.trim();

  if (!mimeType || !isSupportedImageType(mimeType)) {
    throw new AppError("Only JPEG, PNG, WebP, and GIF images are supported.", 400);
  }

  if (image.length === 0) {
    throw new AppError("An image file is required.", 400);
  }

  const { bucket, region, credentials, publicBaseUrl } = getS3Config();
  const key = `images/${userId}/${randomUUID()}.${supportedImageTypes[mimeType]}`;
  const s3 = new S3Client({ region, credentials });

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: image,
      ContentType: mimeType,
    }),
  );

  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const url = publicBaseUrl
    ? `${publicBaseUrl}/${encodedKey}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;

  return { key, url };
}

export const imageContentTypes = Object.keys(supportedImageTypes);

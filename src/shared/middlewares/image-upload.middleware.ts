import express from "express";
import type { NextFunction, Request, Response } from "express";

export const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 64 * 1024;

const multipartBodyParser = express.raw({
  type: "multipart/form-data",
  limit: MAX_PROFILE_IMAGE_BYTES + MAX_MULTIPART_OVERHEAD_BYTES,
});

function getBoundary(contentType: string | undefined): string | null {
  const match = contentType?.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = match?.[1] ?? match?.[2]?.trim();

  if (!boundary || boundary.length > 70) return null;
  return boundary;
}

export function parseMultipartImage(
  body: Buffer,
  boundary: string,
): { buffer: Buffer; mimeType: string } {
  const delimiter = Buffer.from(`--${boundary}`);
  const nextDelimiter = Buffer.from(`\r\n--${boundary}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  const files: Array<{ buffer: Buffer; mimeType: string }> = [];

  let partStart = body.indexOf(delimiter);
  while (partStart !== -1) {
    partStart += delimiter.length;

    if (body.subarray(partStart, partStart + 2).equals(Buffer.from("--"))) {
      break;
    }

    if (!body.subarray(partStart, partStart + 2).equals(Buffer.from("\r\n"))) {
      throw new Error("Malformed multipart image upload");
    }
    partStart += 2;

    const headerEnd = body.indexOf(headerSeparator, partStart);
    if (headerEnd === -1) throw new Error("Malformed multipart image upload");

    const headers = body.subarray(partStart, headerEnd).toString("latin1");
    const contentStart = headerEnd + headerSeparator.length;
    const contentEnd = body.indexOf(nextDelimiter, contentStart);
    if (contentEnd === -1) throw new Error("Malformed multipart image upload");

    const disposition = headers.match(/^content-disposition:\s*([^\r\n]+)$/im)?.[1];
    const isFile = disposition && /filename\s*=\s*(?:"[^"]*"|[^;]+)/i.test(disposition);

    if (isFile) {
      const mimeType = headers
        .match(/^content-type:\s*([^\r\n;]+)/im)?.[1]
        ?.trim()
        .toLowerCase();
      if (!mimeType) throw new Error("The uploaded image must include a MIME type");

      files.push({ buffer: body.subarray(contentStart, contentEnd), mimeType });
    }

    partStart = contentEnd + 2;
  }

  if (files.length === 0) throw new Error("A single image file is required");
  if (files.length > 1) throw new Error("Only one image file may be uploaded");

  return files[0]!;
}

export function imageUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.is("multipart/form-data")) {
    res.status(415).json({ error: "Content-Type must be multipart/form-data" });
    return;
  }

  multipartBodyParser(req, res, (error) => {
    if (error) {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number(error.status)
          : 400;
      res.status(status === 413 ? 413 : 400).json({
        error:
          status === 413
            ? "Profile image must be 5 MB or smaller"
            : "Invalid multipart image upload",
      });
      return;
    }

    const boundary = getBoundary(req.headers["content-type"]);
    if (!boundary || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Invalid multipart image upload" });
      return;
    }

    try {
      req.imageUpload = parseMultipartImage(req.body, boundary);
      next();
    } catch (parseError) {
      res.status(400).json({
        error:
          parseError instanceof Error
            ? parseError.message
            : "Invalid multipart image upload",
      });
    }
  });
}

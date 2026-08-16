import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/utils.ts";
import {
  deleteProfileImage,
  getProfileImage,
  saveProfileImage,
} from "./profile-image.service.ts";

function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error("Profile image operation failed", error);
  res.status(500).json({ error: "Unable to process profile image" });
}

export async function uploadProfileImage(req: Request, res: Response): Promise<void> {
  if (!req.imageUpload) {
    res.status(400).json({ error: "A single image file is required" });
    return;
  }

  try {
    const result = await saveProfileImage(
      req.user!.id,
      req.imageUpload.buffer,
      req.imageUpload.mimeType,
    );
    res.status(201).json({ data: result });
  } catch (error) {
    sendError(res, error);
  }
}

export async function serveProfileImage(req: Request, res: Response): Promise<void> {
  const userId = Number(req.params["id"]);
  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    const image = await getProfileImage(userId);
    res.setHeader("Content-Type", image.imageType);
    res.setHeader("Content-Length", image.imageData.byteLength.toString());
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(Buffer.from(image.imageData));
  } catch (error) {
    sendError(res, error);
  }
}

export async function removeProfileImage(req: Request, res: Response): Promise<void> {
  try {
    await deleteProfileImage(req.user!.id);
    res.status(204).send();
  } catch (error) {
    sendError(res, error);
  }
}

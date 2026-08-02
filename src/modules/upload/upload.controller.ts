import type { Request, Response } from "express";
import { uploadImage } from "../../shared/config/s3.ts";
import { AppError } from "../../shared/utils/utils.ts";

export async function upload(req: Request, res: Response): Promise<void> {
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: "Send the image as the raw request body." });
    return;
  }

  try {
    const image = await uploadImage(req.user!.id, req.body, req.headers["content-type"]);
    res.status(201).json({ data: image });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("S3 image upload failed", error);
    res.status(502).json({ error: "Unable to upload image." });
  }
}

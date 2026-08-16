import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/utils.ts";
import { getStorageProvider } from "../../shared/config/image-storage.ts";

export async function upload(req: Request, res: Response): Promise<void> {
  if (!Buffer.isBuffer(req.body)) {
    res.status(400).json({ error: "Send the image as the raw request body." });
    return;
  }

  try {
    if (getStorageProvider() === "database") {
      res.status(400).json({
        error:
          "Database mode requires a target resource. Use /api/users/profile-image or /api/images/{posts|projects|portfolios}/:id.",
      });
      return;
    }

    const { uploadImage } = await import("../../shared/config/s3.ts");
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

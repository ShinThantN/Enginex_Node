import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/utils.ts";
import {
  deleteResourceImage,
  getResourceImage,
  resourceKinds,
  saveResourceImage,
  type ResourceKind,
} from "./resource-image.service.ts";

function parseResourceParams(req: Request): { resource: ResourceKind; id: number } | null {
  const resource = req.params["resource"];
  const id = Number(req.params["id"]);
  if (
    !resourceKinds.includes(resource as ResourceKind) ||
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }
  return { resource: resource as ResourceKind, id };
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error("Resource image operation failed", error);
  res.status(500).json({ error: "Unable to process image" });
}

export async function upload(req: Request, res: Response): Promise<void> {
  const params = parseResourceParams(req);
  if (!params) {
    res.status(400).json({ error: "Invalid image resource or ID" });
    return;
  }
  if (!req.imageUpload) {
    res.status(400).json({ error: "A single image file is required" });
    return;
  }

  try {
    const result = await saveResourceImage(
      req.user!.id,
      params.resource,
      params.id,
      req.imageUpload.buffer,
      req.imageUpload.mimeType,
    );
    res.status(201).json({ data: result });
  } catch (error) {
    sendError(res, error);
  }
}

export async function serve(req: Request, res: Response): Promise<void> {
  const params = parseResourceParams(req);
  if (!params) {
    res.status(400).json({ error: "Invalid image resource or ID" });
    return;
  }

  try {
    const image = await getResourceImage(params.resource, params.id);
    res.setHeader("Content-Type", image.imageType);
    res.setHeader("Content-Length", image.imageData.byteLength.toString());
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(Buffer.from(image.imageData));
  } catch (error) {
    sendError(res, error);
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  const params = parseResourceParams(req);
  if (!params) {
    res.status(400).json({ error: "Invalid image resource or ID" });
    return;
  }

  try {
    await deleteResourceImage(req.user!.id, params.resource, params.id);
    res.status(204).send();
  } catch (error) {
    sendError(res, error);
  }
}

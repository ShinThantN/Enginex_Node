import express from "express";
import { authenticateUser } from "../../shared/middlewares/index.ts";
import { imageContentTypes } from "../../shared/config/s3.ts";
import * as uploadController from "./upload.controller.ts";

const router = express.Router();

// The client should POST the file bytes directly, with Content-Type set to the image MIME type.
router.post(
  "/images",
  authenticateUser,
  express.raw({ type: imageContentTypes, limit: "5mb" }),
  uploadController.upload,
);

export default router;

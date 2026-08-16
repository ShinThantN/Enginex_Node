import { Router } from "express";
import { authenticateUser } from "../../shared/middlewares/index.ts";
import { imageUpload } from "../../shared/middlewares/image-upload.middleware.ts";
import * as usersController from "./users.controller.ts";

const router = Router();

router.post(
  "/profile-image",
  authenticateUser,
  imageUpload,
  usersController.uploadProfileImage,
);
router.delete(
  "/profile-image",
  authenticateUser,
  usersController.removeProfileImage,
);

// Profile images are public because normal <img> requests cannot attach the API's bearer token.
router.get("/:id/profile-image", usersController.serveProfileImage);

export default router;

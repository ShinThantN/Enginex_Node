import { Router } from "express";
import { authenticateUser } from "../../shared/middlewares/index.ts";
import { imageUpload } from "../../shared/middlewares/image-upload.middleware.ts";
import * as controller from "./resource-image.controller.ts";

const router = Router();

router.get("/:resource/:id", controller.serve);
router.post("/:resource/:id", authenticateUser, imageUpload, controller.upload);
router.delete("/:resource/:id", authenticateUser, controller.remove);

export default router;

import express from "express";
import { authenticateUser } from "../../shared/middlewares/index.ts";
import { requireClientRole } from "./client.middleware.ts";
import * as clientController from "./client.controller.ts";

const router = express.Router();

router.get("/search", clientController.search);
router.get("/engineers/:id", clientController.getEngineerProfile);
router.get("/teams/:id", clientController.getTeamProfile);

router.use(authenticateUser, requireClientRole);

router.get("/profile", clientController.getProfile);
router.put("/profile", clientController.updateProfile);
router.post("/favorites", clientController.saveFavorite);
router.get("/favorites", clientController.getFavorites);
router.get("/projects", clientController.getClientProjects);
router.post("/projects", clientController.createProject);
router.patch("/projects/:id", clientController.updateProject);
router.delete("/projects/:id", clientController.deleteProject);
router.get(
  "/projects/:id/applications",
  clientController.getProjectApplications,
);
router.patch(
  "/projects/:id/applications/:applicationId",
  clientController.reviewProjectApplication,
);
router.post(
  "/projects/:projectId/engineers/:engineerProfileId",
  clientController.assignProjectToEngineer,
);
router.delete("/favorites/:engineerProfileId", clientController.removeFavorite);

export default router;

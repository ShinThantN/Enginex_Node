import express from "express";
import { authenticateUser } from "../../shared/middlewares/auth.middleware.ts";
import { requireRole } from "../../shared/middlewares/rbac.middleware.ts";
import {
  applyToProject,
  getCompanies,
  getDirectProjects,
  getEngineerProfile,
  updateEngineerProfile,
  updateEngineerStatus,
} from "./engineers.controller.ts";

const router = express.Router();

router.use(authenticateUser, requireRole("ENGINEER"));
router.get("/", (_req, res) => {
  res.send("Engineers route is working!");
});
router.get("/profile", getEngineerProfile);
router.put("/profile", updateEngineerProfile);
router.patch("/profile", updateEngineerProfile);
router.put("/profile/status", updateEngineerStatus);
router.get("/direct-projects", getDirectProjects);
router.post("/projects/:id/apply", applyToProject);
router.get("/companies", getCompanies);

export default router;

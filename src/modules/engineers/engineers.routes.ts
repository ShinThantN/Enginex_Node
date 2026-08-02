import express from "express";
import { authenticate } from "../../shared/middlewares/index.js";
import {
  applyToProject,
  getCompanies,
  getDirectProjects,
  getEngineerProfile,
  updateEngineerProfile,
  updateEngineerStatus,
} from "./engineers.controller.js";

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("Engineers route is working!");
});

// All engineer operations below require an authenticated user. Without this
// middleware the controllers receive no `req.user` and fail when reading its id.
router.use(authenticate);

router.get("/profile", getEngineerProfile);
router.put("/profile", updateEngineerProfile);
router.patch("/profile", updateEngineerProfile);
router.put("/profile/status", updateEngineerStatus);
router.get("/direct-projects", getDirectProjects);
router.post("/projects/:id/apply", applyToProject);
router.get("/companies", getCompanies);

export default router;

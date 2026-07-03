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
router.get("/profile", authenticate, getEngineerProfile);
router.put("/profile", authenticate, updateEngineerProfile);
router.patch("/profile", authenticate, updateEngineerProfile);
router.put("/profile/status", authenticate, updateEngineerStatus);
router.get("/direct-projects", authenticate, getDirectProjects);
router.post("/projects/:id/apply", authenticate, applyToProject);
router.get("/companies", authenticate, getCompanies);

export default router;

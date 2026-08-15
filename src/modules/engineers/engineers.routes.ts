import express from "express";
import { authenticate } from "../../shared/middlewares/index.js";
import {
  applyToProject,
  getCompanies,
  getDirectProjects,
  getEngineerApplications,
  getEngineerProfile,
  getOpenProjects,
  updateEngineerProfile,
  updateEngineerStatus,
} from "./engineers.controller.js";

const requireEngineerRole = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== "ENGINEER") {
    res.status(403).json({ error: "Engineer access required" });
    return;
  }

  next();
};

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("Engineers route is working!");
});

// All engineer operations below require an authenticated user. Without this
// middleware the controllers receive no `req.user` and fail when reading its id.
router.use(authenticate, requireEngineerRole);

router.get("/profile", getEngineerProfile);
router.put("/profile", updateEngineerProfile);
router.patch("/profile", updateEngineerProfile);
router.put("/profile/status", updateEngineerStatus);
router.get("/direct-projects", getDirectProjects);
router.get("/projects/open", getOpenProjects);
router.get("/applications", getEngineerApplications);
router.post("/projects/:id/apply", applyToProject);
router.get("/companies", getCompanies);

export default router;

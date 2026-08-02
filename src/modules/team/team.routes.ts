import express from "express";
import {
  authenticateUser,
  requireRole,
} from "../../shared/middlewares/index.ts";

const router = express.Router();

router.use(authenticateUser, requireRole("COMPANY"));

// Define team routes here
router.get("/", (_req, res) => {
  res.send("Team route is working!");
});
router.get("/profile", authenticate, getTeamProfile);
router.patch("/profile", authenticate, updateTeamProfile);

export default router;

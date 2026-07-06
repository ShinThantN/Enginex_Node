import express from "express";
import { authenticateUser, requireRole } from "../../shared/middlewares/index.ts";

const router = express.Router();

router.use(authenticateUser, requireRole("CLIENT", "ENGINEER", "COMPANY"));

// Define feed routes here
router.get("/", (_req, res) => {
  res.send("Feed route is working!");
});

export default router;

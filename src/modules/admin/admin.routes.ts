import express from "express";
import { authenticateUser, requireRole } from "../../shared/middlewares/index.ts";

const router = express.Router();

router.use(authenticateUser, requireRole("SUPER_ADMIN"));

// Define admin routes here
router.get("/", (_req, res) => {
  res.send("Admin route is working!");
});

export default router;

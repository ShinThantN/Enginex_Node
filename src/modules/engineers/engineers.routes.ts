import express from "express";
import { authenticateUser, requireRole } from "../../shared/middlewares/index.ts";

const router = express.Router();

router.use(authenticateUser, requireRole("ENGINEER"));

// Define engineers routes here
router.get("/", (_req, res) => {
  res.send("Engineers route is working!");
});

export default router;

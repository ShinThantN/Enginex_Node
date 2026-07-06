import express from "express";
import { authenticateUser, requireRole } from "../../shared/middlewares/index.ts";

const router = express.Router();

router.use(authenticateUser, requireRole("COMPANY"));

// Define team routes here
router.get("/", (_req, res) => {
  res.send("Team route is working!");
});

export default router;

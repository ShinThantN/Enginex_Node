import express from "express";
import { authenticate } from "../../shared/middlewares/index.js";
import { getTeamProfile, updateTeamProfile } from "./team.controller.js";

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("Team route is working!");
});
router.get("/profile", authenticate, getTeamProfile);
router.patch("/profile", authenticate, updateTeamProfile);

export default router;

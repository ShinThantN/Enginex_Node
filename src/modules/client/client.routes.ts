import express from "express";
import { requireClientRole } from "./client.middleware.ts";
import * as clientController from "./client.controller.ts";

const router = express.Router();

router.use(requireClientRole);

router.get("/profile", clientController.getProfile);
router.put("/profile", clientController.updateProfile);
router.get("/search", clientController.search);
router.get("/engineers/:id", clientController.getEngineerProfile);
router.get("/teams/:id", clientController.getTeamProfile);
router.post("/favorites", clientController.saveFavorite);
router.get("/favorites", clientController.getFavorites);
router.post("/projects", clientController.createProject);

export default router;

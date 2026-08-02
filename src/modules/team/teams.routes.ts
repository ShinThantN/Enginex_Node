import { Router } from "express";
import { authenticateUser } from "../../shared/middlewares/auth.middleware.ts";
import { requireRole } from "../../shared/middlewares/rbac.middleware.ts";
import * as teamController from "./teams.controller.ts";

const router = Router();

router.use(authenticateUser);

router.get("/profile", requireRole("COMPANY"), teamController.getProfile);
router.patch("/profile", requireRole("COMPANY"), teamController.updateProfile);
router.get("/members", requireRole("COMPANY"), teamController.listMembers);
router.post("/members", requireRole("COMPANY"), teamController.inviteMember);
router.delete("/members/:memberId", requireRole("COMPANY"), teamController.removeMember);

router.get("/invitations", requireRole("ENGINEER"), teamController.listMyInvitations);
router.patch("/members/:memberId/decision", requireRole("ENGINEER"), teamController.decideInvitation);

export default router;

import express from "express";
import adminRoutes from "../modules/admin/admin.routes.js";
import authRoutes from "../modules/auth/auth.route.js";
import clientRoutes from "../modules/client/client.routes.js";
import engineersRoutes from "../modules/engineers/engineers.routes.js";
import feedRoutes from "../modules/feed/feed.routes.js";
import teamRoutes from "../modules/team/team.routes.js";

const router = express.Router();
router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/client", clientRoutes);
router.use("/engineer", engineersRoutes);
router.use("/engineers", engineersRoutes);
router.use("/feed", feedRoutes);
router.use("/team", teamRoutes);

export default router;

import express from "express";
import adminRoutes from "../modules/admin/admin.routes.ts";
import authRoutes from "../modules/auth/auth.routes.ts";
import clientRoutes from "../modules/client/client.routes.ts";
import engineersRoutes from "../modules/engineers/engineers.routes.ts";
import feedRoutes from "../modules/feed/feed.routes.ts";
import teamRoutes from "../modules/team/team.routes.ts";

const app = express();
const router = express.Router();
router.use("/admin", adminRoutes);
router.use("/auth", authRoutes);
router.use("/client", clientRoutes);
router.use("/engineers", engineersRoutes);
router.use("/feed", feedRoutes);
router.use("/team", teamRoutes);

app.use(router);

export default app;

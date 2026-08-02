import express from "express";
import { authenticateUser } from "../../shared/middlewares/auth.middleware.ts";
import { requireRole } from "../../shared/middlewares/rbac.middleware.ts";
import { deleteUser, getAllUsers, getUserById, updateUser } from "./admin.controller.ts";

const router = express.Router();

router.use(authenticateUser, requireRole("SUPER_ADMIN"));
router.get("/", (_req, res) => {
  res.send("Admin route is working!");
});
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;

import express from "express";
import {
  authenticateUser,
  requireRole,
} from "../../shared/middlewares/index.ts";
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "./admin.controller.ts";
const router = express.Router();

router.use(authenticateUser, requireRole("SUPER_ADMIN"));

// Define admin routes here
router.get("/", (_req, res) => {
  res.send("Admin route is working!");
});
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;

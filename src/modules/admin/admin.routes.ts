import express from "express";
import { deleteUser, getAllUsers, getUserById, updateUser } from "./admin.controller.js";

const router = express.Router();

router.get("/", (_req, res) => {
  res.send("Admin route is working!");
});
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id", updateUser);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

export default router;

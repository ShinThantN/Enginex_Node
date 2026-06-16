import express from "express";

const router = express.Router();
// Define admin routes here
router.get("/", (_req, res) => {
  res.send("Admin route is working!");
});

export default router;

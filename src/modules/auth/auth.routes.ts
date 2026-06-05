import express from "express";

const router = express.Router();
// Define auth routes here
router.get("/", (_req, res) => {
  res.send("Auth route is working!");
});

export default router;

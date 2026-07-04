import express from "express";

const router = express.Router();
// Define feed routes here
router.get("/", (_req, res) => {
  res.send("Feed route is working!");
});

export default router;

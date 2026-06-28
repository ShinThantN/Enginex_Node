import express from "express";

const router = express.Router();
// Define team routes here
router.get("/", (_req, res) => {
  res.send("Team route is working!");
});

export default router;

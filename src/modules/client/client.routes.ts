import express from "express";

const router = express.Router();
// Define client routes here
router.get("/", (_req, res) => {
  res.send("Client route is working!");
});

export default router;

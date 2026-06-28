import express from "express";

const router = express.Router();
// Define engineers routes here
router.get("/", (_req, res) => {
  res.send("Engineers route is working!");
});

export default router;

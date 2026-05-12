import express from "express";

const app = express();
app.get("/", (_req, res) => {
  res.send("Api is healthy and running!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

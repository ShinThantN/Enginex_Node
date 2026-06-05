import express from "express";
import routes from "./routes/index.ts";

const app = express();

app.use("/v1/api", routes);

app.get("/health", (_req, res) => {
  res.send("Api is healthy and running!");
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

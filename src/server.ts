import express from "express";
import "dotenv/config";
import routes from "./routes/index.ts";

const app = express();

app.use(express.json());
app.use("/api", routes);

app.get("/health", (_req, res) => {
  res.send("Api is healthy and running!");
});

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"], 10) : 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

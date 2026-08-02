import express from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import routes from "./routes/index.ts";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use("/api", routes);

app.get("/health", (_req, res) => {
  res.send("Api is healthy and running!");
});

app.use(
  (
    err: { statusCode?: number; status?: number; message?: string },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    void _next;
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
      success: false,
      status,
      message: err.message || "Internal Server Error",
    });
  },
);

const PORT = process.env["PORT"] ? parseInt(process.env["PORT"], 10) : 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

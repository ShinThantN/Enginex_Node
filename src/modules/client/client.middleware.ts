import type { Request, Response, NextFunction } from "express";

export function requireClientRole(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== "CLIENT") {
    res.status(403).json({ error: "Client access required" });
    return;
  }

  next();
}

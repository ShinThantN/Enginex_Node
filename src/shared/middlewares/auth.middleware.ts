import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/index.ts";

const getBearerToken = (req: Request): string | null => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();
  return token.length > 0 ? token : null;
};

export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env["ACCESS_TOKEN_SECRET"] || "enginex_access_secret",
    );

    if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
      res.status(401).json({ error: "Invalid access token" });
      return;
    }

    const userId = Number((decoded as { id: unknown }).id);

    if (Number.isNaN(userId)) {
      res.status(401).json({ error: "Invalid access token" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

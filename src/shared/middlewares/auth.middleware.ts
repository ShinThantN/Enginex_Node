import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/index.ts";
import { AppError, verifyAccessToken } from "../../modules/auth/auth.service.ts";

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
    const userId = verifyAccessToken(token);

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
  } catch (error) {
    const message =
      error instanceof AppError ? error.message : "Invalid or expired access token";
    res.status(401).json({ error: message });
  }
}

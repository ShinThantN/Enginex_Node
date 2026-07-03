import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { prisma } from '../config/index.js';

type JwtPayload = {
  id?: string | number;
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ success: false, status: 401, message: 'Access token is required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload;
    const userId = Number(decoded.id);

    if (!Number.isInteger(userId)) {
      res.status(401).json({ success: false, status: 401, message: 'Invalid access token' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      res.status(401).json({ success: false, status: 401, message: 'User not found' });
      return;
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch {
    res.status(401).json({ success: false, status: 401, message: 'Invalid or expired access token' });
  }
};

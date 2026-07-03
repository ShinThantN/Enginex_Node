import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import type { prisma as sharedPrisma } from '../../shared/config/index.js';

type PrismaClientInstance = typeof sharedPrisma;

let authPrisma: PrismaClientInstance | undefined;

const getAuthPrisma = async () => {
  if (authPrisma) return authPrisma;
  const config = await import('../../shared/config/index.js');
  return config.prisma;
};

export const setAuthPrismaForTests = (prismaClient: PrismaClientInstance) => {
  authPrisma = prismaClient;
};

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const generateToken = (res: Response, userId: string): string => {
  const accessToken = jwt.sign({ id: userId }, env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

  const refreshToken = jwt.sign({ id: userId }, env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

  res.cookie('jwt', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
};

export const registerUserService = async (userData: any) => {
  const { name, email, password, role } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);
  const prisma = await getAuthPrisma();

  try {
    return await prisma.user.create({
      data: {
        fullName: name,
        email,
        passwordHash: hashedPassword,
        role,
        status: 'ACTIVE',
      },
      select: { id: true, fullName: true, email: true, role: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Email already existed', 409);
    }
    throw error;
  }
};

export const loginUserService = async (loginData: any) => {
  const { email, password } = loginData;
  const prisma = await getAuthPrisma();

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) throw new AppError('Invalid Email or Password', 401);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new AppError('Invalid Email or Password', 401);

  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
};

export const refreshTokenService = async (token: string) => {
  return new Promise<{ accessToken: string }>((resolve, reject) => {
    jwt.verify(token, env.REFRESH_TOKEN_SECRET, (err: unknown, decoded: unknown) => {
      if (err || typeof decoded !== 'object' || decoded === null || !('id' in decoded)) {
        reject(new AppError('Invalid or expired refresh token', 403));
        return;
      }

      const accessToken = jwt.sign({ id: String(decoded.id) }, env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      resolve({ accessToken });
    });
  });
};

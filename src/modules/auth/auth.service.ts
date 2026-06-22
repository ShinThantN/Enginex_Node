import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '@prisma/client'; // Prisma ထပ်ဖြည့်ထားပါတယ်
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { env } from '../../config/env.js';

// Controller ဘက်က လှမ်းဖမ်းလို့ရအောင် Custom Error Class တစ်ခု သတ်မှတ်လိုက်ပါတယ်
export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const dbUrl = new URL(env.DATABASE_URL);
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname || env.MYSQL_HOST,
  port: dbUrl.port ? parseInt(dbUrl.port) : 3306,
  user: dbUrl.username || env.MYSQL_USER,
  password: dbUrl.password || env.MYSQL_PASSWORD,
  database: dbUrl.pathname?.substring(1) || env.MYSQL_DATABASE,
});

const prisma = new PrismaClient({ adapter });

export const generateToken = (res: Response, userId: string): string => {
  const accessToken = jwt.sign(
    { id: userId },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

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
    // Email တူလို့ Unique Constraint တက်လာရင် 409 Conflict ပစ်ပေးမယ်
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('Email already existed', 409);
    }
    throw error;
  }
};

export const loginUserService = async (loginData: any) => {
  const { email, password } = loginData;
  
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Invalid Email သို့မဟုတ် Password ဆိုရင် 401 Unauthorized ပစ်မယ်
  if (!user) throw new AppError('Invalid Email or Password', 401);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new AppError('Invalid Email or Password', 401);

  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role };
};

export const getAllUsersService = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [users, totalUsers] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  return {
    data: users,
    meta: { total: totalUsers, page, limit, totalPages },
  };
};

export const getUserByIdService = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, fullName: true, email: true, role: true, createdAt: true },
  });
  // User မရှိရင် 404 Not Found ပစ်မယ်
  if (!user) throw new AppError('User not found', 404);
  return user;
};

export const updateUserService = async (id: number, updateData: any) => {
  const { name, role } = updateData; 
  
  try {
    return await prisma.user.update({
      where: { id },
      data: { 
        fullName: name, 
        role 
      },
      select: { id: true, fullName: true, email: true, role: true },
    });
  } catch (error) {
    // Update လုပ်မယ့် User ID မရှိရင် Prisma က P2025 error ပစ်တတ်ပါတယ်
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('User not found for update', 404);
    }
    throw error;
  }
};

export const deleteUserService = async (id: number) => {
  try {
    await prisma.user.delete({
      where: { id },
    });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('User not found for deletion', 404);
    }
    throw error;
  }
};

export const refreshTokenService = async (token: string) => {
  return new Promise<{ accessToken: string }>((resolve, reject) => {
    jwt.verify(token, env.REFRESH_TOKEN_SECRET, (err: any, decoded: any) => {
      // Refresh token အလုပ်မလုပ်ရင် 403 Forbidden ပစ်မယ်
      if (err) return reject(new AppError('Invalid or expired refresh token', 403));
      const accessToken = jwt.sign({ id: decoded.id }, env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
      resolve({ accessToken });
    });
  });
};
import type { Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "../../shared/config/prisma.ts";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const generateToken = (res: Response, userId: string): string => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env["ACCESS_TOKEN_SECRET"] || "enginex_access_secret",
    {
      expiresIn: "15m",
    },
  );

  const refreshToken = jwt.sign(
    { id: userId },
    process.env["REFRESH_TOKEN_SECRET"] || "enginex_refresh_secret",
    {
      expiresIn: "7d",
    },
  );

  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "none",
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
        status: "ACTIVE",
      },
      select: { id: true, fullName: true, email: true, role: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("Email already existed", 409);
    }
    throw error;
  }
};

export const loginUserService = async (loginData: any) => {
  const { email, password } = loginData;
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) throw new AppError("Invalid Email or Password", 401);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new AppError("Invalid Email or Password", 401);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
};

export const refreshTokenService = async (token: string) => {
  return new Promise<{ accessToken: string }>((resolve, reject) => {
    jwt.verify(
      token,
      process.env["REFRESH_TOKEN_SECRET"] || "enginex_refresh_secret",
      (err: unknown, decoded: unknown) => {
        if (
          err ||
          typeof decoded !== "object" ||
          decoded === null ||
          !("id" in decoded)
        ) {
          reject(new AppError("Invalid or expired refresh token", 403));
          return;
        }

        const accessToken = jwt.sign(
          { id: String(decoded.id) },
          process.env["ACCESS_TOKEN_SECRET"] || "enginex_access_secret",
          { expiresIn: "15m" },
        );
        resolve({ accessToken });
      },
    );
  });
};

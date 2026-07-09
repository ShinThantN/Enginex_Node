import type { Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Prisma, prisma } from "../../shared/config/prisma.ts";
import {
  issueOtp,
  verifyOtp,
  assertResendAllowed,
} from "./otp.service.js";

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

export const verifyAccessToken = (token: string): number => {
  let decoded: unknown;
  try {
    decoded = jwt.verify(
      token,
      process.env["ACCESS_TOKEN_SECRET"] || "enginex_access_secret",
    );
  } catch {
    throw new AppError("Invalid or expired access token", 401);
  }

  if (typeof decoded !== "object" || decoded === null || !("id" in decoded)) {
    throw new AppError("Invalid access token", 401);
  }

  const userId = Number((decoded as { id: unknown }).id);

  if (Number.isNaN(userId)) {
    throw new AppError("Invalid access token", 401);
  }

  return userId;
};

export const registerUserService = async (userData: any) => {
  const { name, email, password, role } = userData;
  const hashedPassword = await bcrypt.hash(password, 10);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        fullName: name,
        email,
        passwordHash: hashedPassword,
        role,
        status: "PENDING_VERIFICATION",
        emailVerified: false,
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

  // Send the verification OTP. The account stays unverified until confirmed.
  await issueOtp({ id: user.id, email: user.email, fullName: user.fullName });

  return user;
};

export const loginUserService = async (loginData: any) => {
  const { email, password } = loginData;
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) throw new AppError("Invalid Email or Password", 401);

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) throw new AppError("Invalid Email or Password", 401);

  if (!user.emailVerified) {
    throw new AppError(
      "Email not verified. Please verify your email to continue.",
      403,
    );
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
};

/**
 * Verify a submitted OTP and, on success, mark the email as verified.
 *
 * The email-verified flag and OTP invalidation are written together in a single
 * atomic update so a consumed code cannot be replayed.
 */
export const verifyEmailService = async (verifyData: any) => {
  const { email, otp } = verifyData;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      emailVerified: true,
      otpHash: true,
      otpExpiresAt: true,
    },
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.emailVerified) throw new AppError("Email is already verified", 409);

  await verifyOtp({
    otp,
    otpHash: user.otpHash,
    otpExpiresAt: user.otpExpiresAt,
  });

  const verified = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      status: "ACTIVE",
      otpHash: null,
      otpExpiresAt: null,
      otpLastSentAt: null,
    },
    select: { id: true, fullName: true, email: true, role: true },
  });

  return verified;
};

/**
 * Issue a fresh OTP for an unverified account, honouring the resend cooldown
 * and replacing any previously issued code.
 */
export const resendOtpService = async (resendData: any) => {
  const { email } = resendData;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      fullName: true,
      emailVerified: true,
      otpLastSentAt: true,
    },
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.emailVerified) throw new AppError("Email is already verified", 409);

  assertResendAllowed(user.otpLastSentAt);

  await issueOtp({ id: user.id, email: user.email, fullName: user.fullName });
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

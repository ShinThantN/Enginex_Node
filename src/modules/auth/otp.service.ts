/**
 * OTP service.
 *
 * Owns the mechanics of one-time passwords used for email verification:
 * secure generation, hashing, storage, expiry/replay validation, resend
 * cooldown, and replacement. It knows nothing about the higher-level
 * registration/login flow — the Auth service orchestrates those and delegates
 * OTP concerns here. This service depends on the shared Email service to
 * deliver codes and never touches the Resend SDK directly.
 *
 * OTP length, expiry, and resend cooldown are configurable via environment
 * variables so operators can tune them without code changes.
 */

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../../shared/config/prisma.ts";
import { sendOtpEmail } from "../../shared/email/email.service.ts";
import { AppError } from "../../shared/utils/utils.ts";
import {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "./otp.config.js";

export {
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "./otp.config.js";

const OTP_SALT_ROUNDS = 10;

/**
 * Generate a cryptographically secure, fixed-length numeric OTP.
 * Uses `crypto.randomInt` (CSPRNG) rather than `Math.random`.
 */
export const generateOtp = (length: number = OTP_LENGTH): string => {
  const upperBound = 10 ** length;
  const value = crypto.randomInt(0, upperBound);
  return value.toString().padStart(length, "0");
};

export const hashOtp = (otp: string): Promise<string> =>
  bcrypt.hash(otp, OTP_SALT_ROUNDS);

/**
 * Generate a fresh OTP, persist its hash and expiry against the user (replacing
 * any previous code), and email it. Overwriting the stored hash is what makes a
 * previously issued OTP invalid, so this doubles as "replace on resend".
 */
export const issueOtp = async (user: {
  id: number;
  email: string;
  fullName: string;
}): Promise<void> => {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { otpHash, otpExpiresAt, otpLastSentAt: new Date() },
  });

  await sendOtpEmail({
    to: user.email,
    name: user.fullName,
    otp,
    expiryMinutes: OTP_EXPIRY_MINUTES,
  });
};

/**
 * Validate a submitted OTP against the stored hash and expiry. Pure and
 * side-effect free so it can be unit tested in isolation; invalidation of a
 * consumed OTP is performed by the caller as part of an atomic status update.
 *
 * Throws:
 *  - 400 when no OTP is on record or the code does not match
 *  - 410 when the code has expired
 */
export const verifyOtp = async (params: {
  otp: string;
  otpHash: string | null;
  otpExpiresAt: Date | null;
}): Promise<void> => {
  if (!params.otpHash || !params.otpExpiresAt) {
    throw new AppError(
      "No verification code found. Please request a new one.",
      400,
    );
  }

  if (params.otpExpiresAt.getTime() < Date.now()) {
    throw new AppError("Verification code has expired", 410);
  }

  const isMatch = await bcrypt.compare(params.otp, params.otpHash);
  if (!isMatch) {
    throw new AppError("Invalid verification code", 400);
  }
};

/**
 * Enforce the resend cooldown. Throws 429 when a new code is requested before
 * the configured window since the last send has elapsed.
 */
export const assertResendAllowed = (otpLastSentAt: Date | null): void => {
  if (!otpLastSentAt) {
    return;
  }

  const cooldownMs = OTP_RESEND_COOLDOWN_SECONDS * 1000;
  const elapsedMs = Date.now() - otpLastSentAt.getTime();

  if (elapsedMs < cooldownMs) {
    const retryInSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
    throw new AppError(
      `Please wait ${retryInSeconds} second${retryInSeconds === 1 ? "" : "s"} before requesting a new code.`,
      429,
    );
  }
};

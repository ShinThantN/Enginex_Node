import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  assertResendAllowed,
  issueOtp,
  OTP_LENGTH,
  OTP_EXPIRY_MINUTES,
} from "./otp.service.js";
import { prisma } from "../../shared/config/prisma.ts";
import { sendOtpEmail } from "../../shared/email/email.service.ts";

type AsyncMock<T> = jest.Mock<(...args: unknown[]) => Promise<T>>;

jest.mock("../../shared/config/prisma.ts", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock("../../shared/email/email.service.ts", () => ({
  sendOtpEmail: jest.fn(),
}));

const mockPrismaUserUpdate = prisma.user.update as unknown as AsyncMock<unknown>;
const mockSendOtpEmail = sendOtpEmail as unknown as AsyncMock<void>;

describe("OTP Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("generateOtp", () => {
    it("should generate a numeric OTP of the configured length", () => {
      const otp = generateOtp();
      expect(otp).toHaveLength(OTP_LENGTH);
      expect(otp).toMatch(/^\d+$/);
    });

    it("should honour an explicit length and zero-pad short values", () => {
      const otp = generateOtp(4);
      expect(otp).toHaveLength(4);
      expect(otp).toMatch(/^\d{4}$/);
    });
  });

  describe("verifyOtp", () => {
    it("should throw 400 when no OTP is stored", async () => {
      await expect(
        verifyOtp({ otp: "123456", otpHash: null, otpExpiresAt: null }),
      ).rejects.toThrow(
        expect.objectContaining({ statusCode: 400 }),
      );
    });

    it("should throw 410 when the OTP has expired", async () => {
      const otpHash = await hashOtp("123456");
      await expect(
        verifyOtp({
          otp: "123456",
          otpHash,
          otpExpiresAt: new Date(Date.now() - 1000),
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "Verification code has expired",
          statusCode: 410,
        }),
      );
    });

    it("should throw 400 when the OTP does not match", async () => {
      const otpHash = await hashOtp("123456");
      await expect(
        verifyOtp({
          otp: "000000",
          otpHash,
          otpExpiresAt: new Date(Date.now() + 60_000),
        }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "Invalid verification code",
          statusCode: 400,
        }),
      );
    });

    it("should resolve for a valid, unexpired OTP", async () => {
      const otpHash = await hashOtp("246810");
      await expect(
        verifyOtp({
          otp: "246810",
          otpHash,
          otpExpiresAt: new Date(Date.now() + 60_000),
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe("assertResendAllowed", () => {
    it("should allow when no previous OTP was sent", () => {
      expect(() => assertResendAllowed(null)).not.toThrow();
    });

    it("should allow when the cooldown window has elapsed", () => {
      const longAgo = new Date(Date.now() - 60 * 60 * 1000);
      expect(() => assertResendAllowed(longAgo)).not.toThrow();
    });

    it("should throw 429 when still within the cooldown window", () => {
      const justNow = new Date();
      expect(() => assertResendAllowed(justNow)).toThrow(
        expect.objectContaining({ statusCode: 429 }),
      );
    });
  });

  describe("issueOtp", () => {
    it("should persist a hashed OTP with expiry and send the email", async () => {
      mockPrismaUserUpdate.mockResolvedValue({});
      mockSendOtpEmail.mockResolvedValue(undefined);

      await issueOtp({ id: 1, email: "thura@gmail.com", fullName: "Thura" });

      expect(mockPrismaUserUpdate).toHaveBeenCalledTimes(1);
      const updateArg = mockPrismaUserUpdate.mock.calls[0]?.[0] as {
        where: { id: number };
        data: { otpHash: string; otpExpiresAt: Date; otpLastSentAt: Date };
      };
      expect(updateArg.where).toEqual({ id: 1 });
      // The stored code must be hashed, never the plaintext OTP.
      expect(updateArg.data.otpHash).toEqual(expect.any(String));
      expect(updateArg.data.otpHash).not.toMatch(/^\d+$/);
      expect(updateArg.data.otpExpiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(mockSendOtpEmail).toHaveBeenCalledTimes(1);
      const emailArg = mockSendOtpEmail.mock.calls[0]?.[0] as {
        to: string;
        name: string;
        otp: string;
        expiryMinutes: number;
      };
      expect(emailArg.to).toBe("thura@gmail.com");
      expect(emailArg.name).toBe("Thura");
      expect(emailArg.otp).toMatch(/^\d+$/);
      expect(emailArg.expiryMinutes).toBe(OTP_EXPIRY_MINUTES);
    });
  });
});

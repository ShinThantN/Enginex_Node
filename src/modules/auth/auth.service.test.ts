import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  loginUserService,
  registerUserService,
  verifyEmailService,
  resendOtpService,
} from "./auth.service.js";
import { Prisma, prisma } from "../../shared/config/prisma.ts";
import {
  issueOtp,
  verifyOtp,
  assertResendAllowed,
} from "./otp.service.js";
import bcrypt from "bcryptjs";

type AsyncMock<T> = jest.Mock<(...args: unknown[]) => Promise<T>>;
type SyncMock = jest.Mock<(...args: unknown[]) => void>;

jest.mock("../../shared/config/prisma.ts", () => {
  class MockPrismaClientKnownRequestError extends Error {
    code: string;

    constructor(message: string, params: { code: string; clientVersion?: string }) {
      super(message);
      this.code = params.code;
    }
  }

  return {
    prisma: {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    },
    Prisma: {
      PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
    },
  };
});

jest.mock("./otp.service.js", () => ({
  issueOtp: jest.fn(),
  verifyOtp: jest.fn(),
  assertResendAllowed: jest.fn(),
}));

jest.mock("bcryptjs");

const mockBcryptHash = bcrypt.hash as unknown as AsyncMock<string>;
const mockBcryptCompare = bcrypt.compare as unknown as AsyncMock<boolean>;

const mockPrismaUserCreate = prisma.user.create as unknown as AsyncMock<unknown>;
const mockPrismaUserFindUnique = prisma.user
  .findUnique as unknown as AsyncMock<unknown>;
const mockPrismaUserUpdate = prisma.user.update as unknown as AsyncMock<unknown>;

const mockIssueOtp = issueOtp as unknown as AsyncMock<void>;
const mockVerifyOtp = verifyOtp as unknown as AsyncMock<void>;
const mockAssertResendAllowed = assertResendAllowed as unknown as SyncMock;

describe("Auth Service Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerUserService", () => {
    it("should hash password and create a new user successfully", async () => {
      const mockUserData = {
        name: "Thura",
        email: "thura@gmail.com",
        password: "password123",
        role: "CLIENT",
      };
      const mockHashedPassword = "$2a$10$hashedpassword123";
      const mockSavedUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        role: "CLIENT",
      };

      mockBcryptHash.mockResolvedValue(mockHashedPassword);
      mockPrismaUserCreate.mockResolvedValue(mockSavedUser);
      mockIssueOtp.mockResolvedValue(undefined);

      const result = await registerUserService(mockUserData);

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockPrismaUserCreate).toHaveBeenCalledTimes(1);
      expect(mockPrismaUserCreate).toHaveBeenCalledWith({
        data: {
          fullName: "Thura",
          email: "thura@gmail.com",
          passwordHash: mockHashedPassword,
          role: "CLIENT",
          status: "PENDING_VERIFICATION",
          emailVerified: false,
        },
        select: { id: true, fullName: true, email: true, role: true },
      });
      expect(mockIssueOtp).toHaveBeenCalledWith({
        id: 1,
        email: "thura@gmail.com",
        fullName: "Thura",
      });
      expect(result).toEqual(mockSavedUser);
    });

    it("should throw 409 error if email already exists", async () => {
      const mockUserData = {
        name: "Thura",
        email: "thura@gmail.com",
        password: "password123",
        role: "CLIENT",
      };
      const mockHashedPassword = "$2a$10$hashedpassword123";

      mockBcryptHash.mockResolvedValue(mockHashedPassword);

      const prismaError = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed",
        {
          code: "P2002",
          clientVersion: "test",
        },
      );
      mockPrismaUserCreate.mockRejectedValue(prismaError);

      await expect(registerUserService(mockUserData)).rejects.toThrow(
        expect.objectContaining({
          message: "Email already existed",
          statusCode: 409,
        }),
      );
    });
  });

  describe("loginUserService", () => {
    it("should throw 401 error if user is not found", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      const loginData = { email: "wrong@gmail.com", password: "password123" };

      await expect(loginUserService(loginData)).rejects.toThrow(
        expect.objectContaining({
          message: "Invalid Email or Password",
          statusCode: 401,
        }),
      );
    });

    it("should throw 401 error if password does not match", async () => {
      const mockUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        passwordHash: "$2a$10$hashedpassword123",
        role: "USER",
      };
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(false);

      const loginData = { email: "thura@gmail.com", password: "wrongpassword" };

      await expect(loginUserService(loginData)).rejects.toThrow(
        expect.objectContaining({
          message: "Invalid Email or Password",
          statusCode: 401,
        }),
      );
    });

    it("should throw 403 error if email is not verified", async () => {
      const mockUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        passwordHash: "$2a$10$hashedpassword123",
        role: "CLIENT",
        emailVerified: false,
      };
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(true);

      const loginData = { email: "thura@gmail.com", password: "password123" };

      await expect(loginUserService(loginData)).rejects.toThrow(
        expect.objectContaining({
          message: "Email not verified. Please verify your email to continue.",
          statusCode: 403,
        }),
      );
    });

    it("should return user data on successful login", async () => {
      const mockUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        passwordHash: "$2a$10$hashedpassword123",
        role: "CLIENT",
        emailVerified: true,
      };
      mockPrismaUserFindUnique.mockResolvedValue(mockUser);
      mockBcryptCompare.mockResolvedValue(true);

      const loginData = { email: "thura@gmail.com", password: "password123" };
      const result = await loginUserService(loginData);

      expect(result).toEqual({
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        role: "CLIENT",
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        "password123",
        mockUser.passwordHash,
      );
    });
  });

  describe("verifyEmailService", () => {
    it("should throw 404 if user is not found", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      await expect(
        verifyEmailService({ email: "missing@gmail.com", otp: "123456" }),
      ).rejects.toThrow(
        expect.objectContaining({ message: "User not found", statusCode: 404 }),
      );
    });

    it("should throw 409 if email is already verified", async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 1,
        emailVerified: true,
        otpHash: null,
        otpExpiresAt: null,
      });

      await expect(
        verifyEmailService({ email: "thura@gmail.com", otp: "123456" }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "Email is already verified",
          statusCode: 409,
        }),
      );
      expect(mockVerifyOtp).not.toHaveBeenCalled();
    });

    it("should mark email verified and clear OTP on success", async () => {
      const expiresAt = new Date(Date.now() + 60_000);
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 1,
        emailVerified: false,
        otpHash: "hashed-otp",
        otpExpiresAt: expiresAt,
      });
      mockVerifyOtp.mockResolvedValue(undefined);
      const verifiedUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        role: "CLIENT",
      };
      mockPrismaUserUpdate.mockResolvedValue(verifiedUser);

      const result = await verifyEmailService({
        email: "thura@gmail.com",
        otp: "123456",
      });

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        otp: "123456",
        otpHash: "hashed-otp",
        otpExpiresAt: expiresAt,
      });
      expect(mockPrismaUserUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          emailVerified: true,
          status: "ACTIVE",
          otpHash: null,
          otpExpiresAt: null,
          otpLastSentAt: null,
        },
        select: { id: true, fullName: true, email: true, role: true },
      });
      expect(result).toEqual(verifiedUser);
    });

    it("should not mark verified if OTP validation fails", async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 1,
        emailVerified: false,
        otpHash: "hashed-otp",
        otpExpiresAt: new Date(Date.now() + 60_000),
      });
      mockVerifyOtp.mockRejectedValue(
        new AppErrorLike("Invalid verification code", 400),
      );

      await expect(
        verifyEmailService({ email: "thura@gmail.com", otp: "000000" }),
      ).rejects.toThrow("Invalid verification code");
      expect(mockPrismaUserUpdate).not.toHaveBeenCalled();
    });
  });

  describe("resendOtpService", () => {
    it("should throw 404 if user is not found", async () => {
      mockPrismaUserFindUnique.mockResolvedValue(null);

      await expect(
        resendOtpService({ email: "missing@gmail.com" }),
      ).rejects.toThrow(
        expect.objectContaining({ message: "User not found", statusCode: 404 }),
      );
    });

    it("should throw 409 if email is already verified", async () => {
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 1,
        email: "thura@gmail.com",
        fullName: "Thura",
        emailVerified: true,
        otpLastSentAt: null,
      });

      await expect(
        resendOtpService({ email: "thura@gmail.com" }),
      ).rejects.toThrow(
        expect.objectContaining({
          message: "Email is already verified",
          statusCode: 409,
        }),
      );
      expect(mockIssueOtp).not.toHaveBeenCalled();
    });

    it("should enforce cooldown then issue a new OTP", async () => {
      const lastSentAt = new Date(Date.now() - 120_000);
      mockPrismaUserFindUnique.mockResolvedValue({
        id: 1,
        email: "thura@gmail.com",
        fullName: "Thura",
        emailVerified: false,
        otpLastSentAt: lastSentAt,
      });
      mockIssueOtp.mockResolvedValue(undefined);

      await resendOtpService({ email: "thura@gmail.com" });

      expect(mockAssertResendAllowed).toHaveBeenCalledWith(lastSentAt);
      expect(mockIssueOtp).toHaveBeenCalledWith({
        id: 1,
        email: "thura@gmail.com",
        fullName: "Thura",
      });
    });
  });
});

/** Minimal AppError stand-in for asserting rejected OTP validation. */
class AppErrorLike extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

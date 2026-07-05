import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { loginUserService, registerUserService } from "./auth.service.js";
import { Prisma, prisma } from "../../shared/config/prisma.ts";
import bcrypt from "bcryptjs";

type AsyncMock<T> = jest.Mock<(...args: unknown[]) => Promise<T>>;

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
      },
    },
    Prisma: {
      PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
    },
  };
});

jest.mock("bcryptjs");

const mockBcryptHash = bcrypt.hash as unknown as AsyncMock<string>;
const mockBcryptCompare = bcrypt.compare as unknown as AsyncMock<boolean>;

const mockPrismaUserCreate = prisma.user.create as unknown as AsyncMock<unknown>;
const mockPrismaUserFindUnique = prisma.user
  .findUnique as unknown as AsyncMock<unknown>;

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

      const result = await registerUserService(mockUserData);

      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockPrismaUserCreate).toHaveBeenCalledTimes(1);
      expect(mockPrismaUserCreate).toHaveBeenCalledWith({
        data: {
          fullName: "Thura",
          email: "thura@gmail.com",
          passwordHash: mockHashedPassword,
          role: "CLIENT",
          status: "ACTIVE",
        },
        select: { id: true, fullName: true, email: true, role: true },
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

    it("should return user data on successful login", async () => {
      const mockUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        passwordHash: "$2a$10$hashedpassword123",
        role: "CLIENT",
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
});

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { registerUser, loginUser } from "./auth.controller.js";
import * as authService from "./auth.service.js";

type AsyncMock<T> = jest.Mock<(...args: unknown[]) => Promise<T>>;
type TestError = {
  statusCode?: number;
  message?: string;
};

// Setup Express app for testing
const app = express();
app.use(express.json());

app.post("/api/auth/register", registerUser);
app.post("/api/auth/login", loginUser);

// Global error handler middleware
app.use((err: TestError, _req: express.Request, res: express.Response) => {
  const statusCode = err.statusCode || 500;
  res
    .status(statusCode)
    .json({ success: false, status: statusCode, message: err.message });
});

// Mock services
jest.mock("./auth.service.js", () => ({
  AppError: class AppError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
      Object.setPrototypeOf(this, AppError.prototype);
    }
  },
  registerUserService: jest.fn(),
  loginUserService: jest.fn(),
  refreshTokenService: jest.fn(),
  generateToken: jest.fn(() => "mock-access-token"),
}));

describe("Auth Controller Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should return 422 if Zod validation fails", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "invalid-email" });

      expect(res.status).toBe(422);
      expect(res.body.message).toBe("Validation Failed");
    });

    it("should return 422 if required fields are missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Thura" });

      expect(res.status).toBe(422);
      expect(res.body.message).toBe("Validation Failed");
    });

    it("should return 409 if email already exists", async () => {
      (
        authService.registerUserService as unknown as AsyncMock<unknown>
      ).mockRejectedValue(
        new authService.AppError("Email already existed", 409),
      );

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Thura",
          email: "thura@gmail.com",
          password: "Password123!",
          role: "CLIENT",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email already existed");
    });

    it("should return 201 and user data on successful registration", async () => {
      const mockUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        role: "CLIENT",
      };
      (
        authService.registerUserService as unknown as AsyncMock<typeof mockUser>
      ).mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Thura",
          email: "thura@gmail.com",
          password: "Password123!",
          role: "CLIENT",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("User Created Successfully");
      expect(res.body.user).toEqual(mockUser);
      expect(res.body.accessToken).toBe("mock-access-token");
      expect(authService.generateToken).toHaveBeenCalledWith(
        expect.any(Object),
        "1",
      );
    });
  });

  describe("POST /api/auth/login", () => {
    it("should return 422 if validation fails", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "invalid-email" });

      expect(res.status).toBe(422);
      expect(res.body.message).toBe("Invalid Credentials");
    });

    it("should return 401 if user credentials are invalid", async () => {
      const appError = new authService.AppError("Invalid credentials", 401);
      (
        authService.loginUserService as unknown as AsyncMock<unknown>
      ).mockImplementation(() => {
        throw appError;
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "wrong@gmail.com", password: "wrongpassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("should return 200 and user data on successful login", async () => {
      const mockUser = {
        id: 1,
        fullName: "Thura",
        email: "thura@gmail.com",
        role: "USER",
      };
      (
        authService.loginUserService as unknown as AsyncMock<typeof mockUser>
      ).mockResolvedValue(mockUser);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "thura@gmail.com", password: "Password123!" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("User LogIn Successfully");
      expect(res.body.user).toEqual(mockUser);
      expect(res.body.accessToken).toBe("mock-access-token");
      expect(authService.generateToken).toHaveBeenCalledWith(
        expect.any(Object),
        "1",
      );
    });
  });
});

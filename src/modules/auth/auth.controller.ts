import type { Request, Response } from "express";
import {
  registerUserService,
  loginUserService,
  refreshTokenService,
  verifyEmailService,
  resendOtpService,
  generateToken,
} from "./auth.service.js";
import {
  CreateUserSchema,
  LogInSchema,
  VerifyEmailSchema,
  ResendOtpSchema,
} from "./auth.schema.js";

const getCookieValue = (
  req: Request,
  cookieName: string,
): string | undefined => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookie) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(cookieName.length + 1));
};

const getStatusCode = (error: unknown): number => {
  if (error instanceof Error && "statusCode" in error) {
    return Number(error.statusCode);
  }

  return 500;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Something went wrong";
};

export const registerUser = async (req: Request, res: Response) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      status: 422,
      message: "Validation Failed",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    const user = await registerUserService(parsed.data);

    // No token is issued yet: the account must verify its email before it can
    // log in, so we only confirm that the verification code has been sent.
    res.status(201).json({
      success: true,
      status: 201,
      message:
        "User Created Successfully. Please verify your email with the OTP we sent.",
      user,
    });
  } catch (error: unknown) {
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({
      success: false,
      status: statusCode,
      message: getErrorMessage(error),
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  const parsed = VerifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      status: 422,
      message: "Validation Failed",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    const user = await verifyEmailService(parsed.data);

    res.status(200).json({
      success: true,
      status: 200,
      message: "Email Verified Successfully",
      user,
    });
  } catch (error: unknown) {
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({
      success: false,
      status: statusCode,
      message: getErrorMessage(error),
    });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  const parsed = ResendOtpSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      status: 422,
      message: "Validation Failed",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    await resendOtpService(parsed.data);

    res.status(200).json({
      success: true,
      status: 200,
      message: "A new verification code has been sent to your email.",
    });
  } catch (error: unknown) {
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({
      success: false,
      status: statusCode,
      message: getErrorMessage(error),
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const parsed = LogInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      success: false,
      status: 422,
      message: "Invalid Credentials",
      errors: parsed.error.flatten(),
    });
    return;
  }

  try {
    const user = await loginUserService(parsed.data);
    const accessToken = generateToken(res, user.id.toString());

    res.json({
      success: true,
      status: 200,
      message: "User LogIn Successfully",
      user,
      accessToken,
    });
  } catch (error: unknown) {
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({
      success: false,
      status: statusCode,
      message: getErrorMessage(error),
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.["jwt"] ?? getCookieValue(req, "jwt");
  if (!refreshToken) {
    res.status(401).json({ success: false, message: "No refresh token found" });
    return;
  }

  try {
    const { accessToken } = await refreshTokenService(refreshToken);
    res.status(200).json({ message: "Access token refreshed", accessToken });
  } catch {
    res
      .status(403)
      .json({ success: false, message: "Invalid or expired refresh token" });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.["jwt"] ?? getCookieValue(req, "jwt");

  if (!refreshToken) {
    res.status(204).send();
    return;
  }

  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "none",
    secure: process.env["NODE_ENV"] === "production",
  });
  res.json({ message: "User Has Logout and cookie cleared" });
};

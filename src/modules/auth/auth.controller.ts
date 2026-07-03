import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { env } from '../../config/env.js';
import {
  registerUserService,
  loginUserService,
  refreshTokenService,
  generateToken,
} from './auth.service.js';
import { CreateUserSchema, LogInSchema } from './auth.schema.js';

const getStatusCode = (error: unknown): number => {
  if (error instanceof Error && 'statusCode' in error) {
    return Number(error.statusCode);
  }

  return 500;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Something went wrong';
};

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, status: 422, message: 'Validation Failed', errors: parsed.error.flatten() });
    return;
  }

  try {
    const user = await registerUserService(parsed.data);
    const accessToken = generateToken(res, user.id.toString());

    res.status(201).json({ success: true, status: 201, message: 'User Created Successfully', user, accessToken });
  } catch (error: unknown) {
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({ success: false, status: statusCode, message: getErrorMessage(error) });
  }
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = LogInSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, status: 422, message: 'Invalid Credentials', errors: parsed.error.flatten() });
    return;
  }

  try {
    const user = await loginUserService(parsed.data);
    const accessToken = generateToken(res, user.id.toString());

    res.json({ success: true, status: 200, message: 'User LogIn Successfully', user, accessToken });
  } catch (error: unknown) {
    const statusCode = getStatusCode(error);
    res.status(statusCode).json({ success: false, status: statusCode, message: getErrorMessage(error) });
  }
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.['jwt'];
  if (!refreshToken) {
    res.status(401).json({ success: false, message: 'No refresh token found' });
    return;
  }

  try {
    const { accessToken } = await refreshTokenService(refreshToken);
    res.status(200).json({ message: 'Access token refreshed', accessToken });
  } catch {
    res.status(403).json({ success: false, message: 'Invalid or expired refresh token' });
  }
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.cookies?.['jwt']) {
    res.status(204).send();
    return;
  }

  res.clearCookie('jwt', { httpOnly: true, sameSite: 'none', secure: env.NODE_ENV === 'production' });
  res.json({ message: 'User Has Logout and cookie cleared' });
});

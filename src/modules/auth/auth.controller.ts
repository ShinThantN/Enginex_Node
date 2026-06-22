import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { env } from '../../config/env.js';
import {
  registerUserService,
  loginUserService,
  getAllUsersService,
  getUserByIdService,
  updateUserService,
  deleteUserService,
  refreshTokenService,
  generateToken,
} from './auth.service.js';
import { CreateUserSchema, LogInSchema, UpdateUserSchema, parsePagination } from './auth.schema.js';
import { z } from 'zod';

// ၁။ getStatusCode ကို Arrow Function Syntax မှန်ကန်အောင် ပြင်ဆင်ပြီး Parameter ထည့်သွင်းထားပါတယ်
const getStatusCode = (message: string): number => {
  switch (message) {
    case "Email already existed":
    case "Email is already registered.":
      return 409; // Conflict
    case "Invalid credentials":
    case "User not found":
      return 401; // Unauthorized သို့မဟုတ် 404
    default:
      return 500; // ပြဿနာတစ်ခုခုရှိရင် Default 500 ပြန်မယ်
  }
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Something went wrong';
};

const userIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

// ၂။ registerUser ထဲမှာ try/catch ထည့်ပြီး Error dynamic ဖြစ်အောင် ပြင်ဆင်ထားပါတယ်
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = CreateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ success: false, status: 422, message: 'Validation Failed', errors: parsed.error.flatten() });
    return;
  }

  try {
    const savedUser = await registerUserService(parsed.data);
    const accessToken = generateToken(res, savedUser.id.toString());
    const user = await getUserByIdService(savedUser.id);

    res.status(201).json({ success: true, status: 201, message: 'User Created Successfully', user, accessToken });
  } catch (error: unknown) {
    // အကယ်၍ Service ကနေ Email တူတဲ့ Error ပစ်လိုက်ရင် 409 ပြန်ပေးပါလိမ့်မယ်
    const message = getErrorMessage(error);
    const statusCode = getStatusCode(message);
    res.status(statusCode).json({ 
      success: false, 
      status: statusCode, 
      message
    });
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
    const message = getErrorMessage(error);
    const statusCode = getStatusCode(message);
    res.status(statusCode).json({ success: false, status: statusCode, message });
  }
});

export const getAllUser = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query);
  const result = await getAllUsersService(pagination.page, pagination.limit);
  res.status(200).json({ success: true, status: 200, message: 'User Displayed', ...result });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const parsed = userIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(422).json({ success: false, status: 422, message: 'Invalid user ID', errors: parsed.error.flatten() });
    return;
  }

  try {
    const user = await getUserByIdService(parsed.data.id);
    res.status(200).json({ success: true, status: 200, message: 'User Data Displayed', data: user });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = getStatusCode(message);
    res.status(statusCode).json({ success: false, status: statusCode, message });
  }
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const parsedId = userIdParamsSchema.safeParse(req.params);
  const parsedBody = UpdateUserSchema.safeParse(req.body);

  if (!parsedId.success || !parsedBody.success) {
    res.status(422).json({ success: false, status: 422, message: 'Validation Failed' });
    return;
  }

  try {
    const user = await updateUserService(parsedId.data.id, parsedBody.data);
    res.status(200).json({ success: true, status: 200, message: 'User Updated Successfully', data: user });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = getStatusCode(message);
    res.status(statusCode).json({ success: false, status: statusCode, message });
  }
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = userIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(422).json({ success: false, status: 422, message: 'Invalid user ID' });
    return;
  }

  try {
    await deleteUserService(parsed.data.id);
    res.status(200).json({ success: true, status: 200, message: 'User Deleted Successfully' });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = getStatusCode(message);
    res.status(statusCode).json({ success: false, status: statusCode, message });
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

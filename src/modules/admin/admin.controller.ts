import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import {
  deleteUserService,
  getAllUsersService,
  getUserByIdService,
  updateUserService,
} from './admin.service.js';
import { parsePagination, UpdateUserSchema, UserIdParamsSchema } from './admin.schema.js';

const getErrorStatus = (error: unknown) => {
  return error instanceof Error && 'statusCode' in error ? Number(error.statusCode) : 500;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Something went wrong';
};

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const pagination = parsePagination(req.query);
  const result = await getAllUsersService(pagination.page, pagination.limit);
  res.status(200).json({ success: true, status: 200, message: 'User Displayed', ...result });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const parsed = UserIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(422).json({ success: false, status: 422, message: 'Invalid user ID', errors: parsed.error.flatten() });
    return;
  }

  try {
    const user = await getUserByIdService(parsed.data.id);
    res.status(200).json({ success: true, status: 200, message: 'User Data Displayed', data: user });
  } catch (error: unknown) {
    const status = getErrorStatus(error);
    res.status(status).json({ success: false, status, message: getErrorMessage(error) });
  }
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const parsedId = UserIdParamsSchema.safeParse(req.params);
  const parsedBody = UpdateUserSchema.safeParse(req.body);

  if (!parsedId.success || !parsedBody.success) {
    res.status(422).json({ success: false, status: 422, message: 'Validation Failed' });
    return;
  }

  try {
    const user = await updateUserService(parsedId.data.id, parsedBody.data);
    res.status(200).json({ success: true, status: 200, message: 'User Updated Successfully', data: user });
  } catch (error: unknown) {
    const status = getErrorStatus(error);
    res.status(status).json({ success: false, status, message: getErrorMessage(error) });
  }
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const parsed = UserIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(422).json({ success: false, status: 422, message: 'Invalid user ID' });
    return;
  }

  try {
    await deleteUserService(parsed.data.id);
    res.status(200).json({ success: true, status: 200, message: 'User Deleted Successfully' });
  } catch (error: unknown) {
    const status = getErrorStatus(error);
    res.status(status).json({ success: false, status, message: getErrorMessage(error) });
  }
});

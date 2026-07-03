import type { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { prisma } from '../../shared/config/index.js';

const getErrorStatus = (error: unknown) => {
  return error instanceof Error && 'statusCode' in error ? Number(error.statusCode) : 500;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Something went wrong';
};

class TeamError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, TeamError.prototype);
  }
}

const ensureTeamUser = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      profileImage: true,
      teamProfile: true,
    },
  });

  if (!user) throw new TeamError('User not found', 404);
  if (user.role !== 'COMPANY') throw new TeamError('Team profile is only available for COMPANY users', 403);

  return user;
};

export const getTeamProfile = asyncHandler(async (req: Request, res: Response) => {
  try {
    const profile = await ensureTeamUser(req.user!.id);
    res.status(200).json({ success: true, status: 200, message: 'Team Profile Displayed', data: profile });
  } catch (error: unknown) {
    const status = getErrorStatus(error);
    res.status(status).json({ success: false, status, message: getErrorMessage(error) });
  }
});

export const updateTeamProfile = asyncHandler(async (req: Request, res: Response) => {
  try {
    await ensureTeamUser(req.user!.id);

    const { companyName, description, website, location, verified } = req.body;
    await prisma.teamProfile.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        companyName,
        description,
        website,
        location,
        verified,
      },
      update: {
        companyName,
        description,
        website,
        location,
        verified,
      },
    });

    const profile = await ensureTeamUser(req.user!.id);
    res.status(200).json({ success: true, status: 200, message: 'Team Profile Updated Successfully', data: profile });
  } catch (error: unknown) {
    const status = getErrorStatus(error);
    res.status(status).json({ success: false, status, message: getErrorMessage(error) });
  }
});

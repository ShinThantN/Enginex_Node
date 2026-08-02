import { Prisma } from '../../../generated/prisma/client.ts';
import { prisma } from '../../shared/config/prisma.ts';
import { AppError } from '../../shared/utils/utils.ts';

export const getAllUsersService = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const [users, totalUsers] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        profileImage: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  return {
    data: users,
    meta: { total: totalUsers, page, limit, totalPages: Math.ceil(totalUsers / limit) },
  };
};

export const getUserByIdService = async (id: number) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      profileImage: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new AppError('User not found', 404);
  return user;
};

export const updateUserService = async (id: number, updateData: any) => {
  const { name, role, phone, profileImage, status } = updateData;

  try {
    return await prisma.user.update({
      where: { id },
      data: {
        fullName: name,
        role,
        phone,
        profileImage,
        status,
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true, status: true, profileImage: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('User not found for update', 404);
    }
    throw error;
  }
};

export const deleteUserService = async (id: number) => {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new AppError('User not found for deletion', 404);
    }
    throw error;
  }
};

import { prisma } from "../../shared/config/prisma.ts";
import type {
  UpdateProfileInput,
  SearchQueryInput,
  CreateProjectInput,
} from "./client.validator.ts";

export async function getClientProfile(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      profileImage: true,
      status: true,
      role: true,
      clientProfile: true,
    },
  });
}

export async function updateClientProfile(
  userId: number,
  data: UpdateProfileInput,
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      phone: data.phone ?? null,
      clientProfile: {
        upsert: {
          create: {
            bio: data.bio ?? null,
            avatarUrl: data.avatarUrl ?? null,
            location: data.location ?? null,
          },
          update: {
            bio: data.bio ?? null,
            avatarUrl: data.avatarUrl ?? null,
            location: data.location ?? null,
          },
        },
      },
    },
    include: { clientProfile: true },
  });
}

export async function searchEngineersAndTeams(query: SearchQueryInput) {
  const { q, type, specialization, location, page, limit } = query;
  const skip = (page - 1) * limit;

  const results: { engineers?: unknown[]; teams?: unknown[] } = {};

  if (!type || type === "engineer") {
    results.engineers = await prisma.engineerProfile.findMany({
      where: {
        ...(q ? { user: { fullName: { contains: q } } } : {}),
        ...(specialization ? { specialization } : {}),
        ...(location ? { location: { contains: location } } : {}),
      },
      include: {
        user: {
          select: { id: true, fullName: true, profileImage: true },
        },
      },
      skip,
      take: limit,
    });
  }

  if (!type || type === "team") {
    results.teams = await prisma.teamProfile.findMany({
      where: {
        ...(q ? { companyName: { contains: q } } : {}),
        ...(location ? { location: { contains: location } } : {}),
      },
      include: {
        user: {
          select: { id: true, fullName: true, profileImage: true },
        },
      },
      skip,
      take: limit,
    });
  }

  return results;
}

export async function getEngineerProfile(id: number) {
  return prisma.engineerProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
      experiences: true,
      portfolios: true,
    },
  });
}

export async function getTeamProfile(id: number) {
  return prisma.teamProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
      teamMembers: {
        include: {
          engineerProfile: {
            include: {
              user: {
                select: { id: true, fullName: true, profileImage: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function saveFavorite(
  userId: number,
  engineerProfileId: number,
) {
  const engineerProfile = await prisma.engineerProfile.findUnique({
    where: { id: engineerProfileId },
  });
  if (!engineerProfile) return null;

  const existing = await prisma.favorite.findFirst({
    where: { clientId: userId, engineerProfileId },
  });
  if (existing) return existing;

  const clientProfile = await prisma.clientProfile.findUnique({
    where: { userId },
  });

  return prisma.favorite.create({
    data: {
      clientId: userId,
      engineerProfileId,
      ...(clientProfile ? { clientProfileId: clientProfile.id } : {}),
    },
  });
}

export async function getFavorites(userId: number) {
  return prisma.favorite.findMany({
    where: { clientId: userId },
    include: {
      engineerProfile: {
        include: {
          user: {
            select: { id: true, fullName: true, profileImage: true },
          },
        },
      },
    },
  });
}

export async function createProject(
  clientId: number,
  data: CreateProjectInput,
) {
  return prisma.project.create({
    data: {
      clientId,
      title: data.title,
      description: data.description ?? null,
      imageUrl: data.imageUrl ?? null,
      budgetMin: data.budgetMin ?? null,
      budgetMax: data.budgetMax ?? null,
      location: data.location ?? null,
      visibility: data.visibility ?? null,
      assignmentType: data.assignmentType ?? null,
      status: "OPEN",
    },
  });
}

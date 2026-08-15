import { prisma } from "../../shared/config/index.ts";
import { AppError } from "../auth/auth.service.ts";
import type {
  UpdateProfileInput,
  SearchQueryInput,
  CreateProjectInput,
  UpdateProjectInput,
  ReviewProjectApplicationInput,
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

export async function saveFavorite(userId: number, engineerProfileId: number) {
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

export async function removeFavorite(
  userId: number,
  engineerProfileId: number,
) {
  return prisma.favorite.deleteMany({
    where: { clientId: userId, engineerProfileId },
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

export async function getClientProjects(clientId: number) {
  return prisma.project.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      budgetMin: true,
      budgetMax: true,
      location: true,
      status: true,
      selectedEngineerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateClientProject(
  clientId: number,
  projectId: number,
  data: UpdateProjectInput,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
  });

  if (!project) {
    throw new AppError("Project not found or you do not own it", 404);
  }

  const updatePayload: {
    title?: string | null;
    description?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    location?: string | null;
    selectedEngineerId?: number | null;
    status?: "OPEN" | "ASSIGNED";
  } = {};

  if (data.title !== undefined) updatePayload.title = data.title;
  if (data.description !== undefined)
    updatePayload.description = data.description;
  if (data.budgetMin !== undefined) updatePayload.budgetMin = data.budgetMin;
  if (data.budgetMax !== undefined) updatePayload.budgetMax = data.budgetMax;
  if (data.location !== undefined) updatePayload.location = data.location;

  if (data.selectedEngineerId !== undefined) {
    updatePayload.selectedEngineerId = data.selectedEngineerId;
    updatePayload.status = data.selectedEngineerId ? "ASSIGNED" : "OPEN";
  }

  return prisma.project.update({
    where: { id: projectId },
    data: updatePayload,
    select: {
      id: true,
      title: true,
      description: true,
      budgetMin: true,
      budgetMax: true,
      location: true,
      status: true,
      selectedEngineerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteClientProject(clientId: number, projectId: number) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
    select: { id: true },
  });

  if (!project) {
    throw new AppError("Project not found or you do not own it", 404);
  }

  await prisma.project.delete({ where: { id: projectId } });
}

export async function getProjectApplications(
  clientId: number,
  projectId: number,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
    select: { id: true },
  });

  if (!project) {
    throw new AppError("Project not found or you do not own it", 404);
  }

  return prisma.projectResponse
    .findMany({
      where: {
        projectId,
        responseType: "APPLICATION",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        projectId: true,
        engineerProfileId: true,
        status: true,
        proposedPrice: true,
        message: true,
        createdAt: true,
        engineerProfile: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                profileImage: true,
              },
            },
            specialization: true,
            location: true,
            availabilityStatus: true,
          },
        },
      },
    })
    .then((applications) =>
      applications.map((application) => ({
        ...application,
        engineer: application.engineerProfile
          ? {
              id: application.engineerProfile.id,
              user: application.engineerProfile.user,
              specialization: application.engineerProfile.specialization,
              location: application.engineerProfile.location,
              availabilityStatus:
                application.engineerProfile.availabilityStatus,
            }
          : null,
      })),
    );
}

export async function reviewProjectApplication(
  clientId: number,
  projectId: number,
  applicationId: number,
  data: ReviewProjectApplicationInput,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, clientId },
    select: { id: true, status: true, selectedEngineerId: true },
  });

  if (!project) {
    throw new AppError("Project not found or you do not own it", 404);
  }

  const application = await prisma.projectResponse.findFirst({
    where: {
      id: applicationId,
      projectId,
      responseType: "APPLICATION",
    },
    select: {
      id: true,
      engineerProfileId: true,
      status: true,
    },
  });

  if (!application) {
    throw new AppError("Application not found", 404);
  }

  const applicationStatus = data.status;

  const updatedApplication = await prisma.projectResponse.update({
    where: { id: applicationId },
    data: {
      status: applicationStatus,
    },
  });

  if (applicationStatus === "ACCEPTED") {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        selectedEngineerId: application.engineerProfileId ?? null,
        status: "ASSIGNED",
      },
    });
  }

  return updatedApplication;
}

export async function assignProjectToEngineer(
  projectId: number,
  engineerProfileId: number,
) {
  return prisma.project.update({
    where: { id: projectId },
    data: {
      selectedEngineerId: engineerProfileId,
      status: "ASSIGNED",
    },
  });
}

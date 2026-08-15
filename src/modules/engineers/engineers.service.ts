import { AppError } from "../auth/auth.service.js";
import type { prisma as sharedPrisma } from "../../shared/config/index.js";
import type {
  AvailabilityStatus,
  EngineerSpecialization,
  Prisma,
} from "../../../generated/prisma/client.ts";

type PrismaClientInstance = typeof sharedPrisma;
type EngineerPortfolioInput = {
  title?: string | undefined;
  overview?: string | undefined;
  description?: string | undefined;
  imageUrl?: string | undefined;
  projectLink?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
};

type EngineerProfileInput = {
  name?: string | undefined;
  phone?: string | undefined;
  profileImage?: string | undefined;
  specialization?: string | undefined;
  bio?: string | undefined;
  avatarUrl?: string | undefined;
  yearsOfExperience?: number | undefined;
  availabilityStatus?: AvailabilityStatus | undefined;
  hourlyRate?: number | undefined;
  location?: string | undefined;
  tuVerified?: boolean | undefined;
  portfolios?: EngineerPortfolioInput[] | undefined;
};

type ProjectApplicationInput = {
  message?: string | undefined;
  proposedPrice?: number | undefined;
};

let engineerPrisma: PrismaClientInstance | undefined;

const getEngineerPrisma = async () => {
  if (engineerPrisma) return engineerPrisma;
  const config = await import("../../shared/config/index.js");
  return config.prisma;
};

export const setEngineerPrismaForTests = (
  prismaClient: PrismaClientInstance,
) => {
  engineerPrisma = prismaClient;
};

const engineerSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  profileImage: true,
  engineerProfile: {
    include: {
      experiences: true,
      portfolios: true,
    },
  },
} as const;

const projectSelect = {
  id: true,
  title: true,
  description: true,
  imageUrl: true,
  budgetMin: true,
  budgetMax: true,
  location: true,
  visibility: true,
  assignmentType: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
    },
  },
} as const;

const companySelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  profileImage: true,
  status: true,
  teamProfile: true,
} as const;

const buildPortfolioCreateData = (
  engineerProfileId: number,
  portfolio: EngineerPortfolioInput,
): Prisma.EngineerPortfolioUncheckedCreateInput => {
  return {
    engineerProfileId,
    ...(portfolio.title !== undefined ? { title: portfolio.title } : {}),
    ...(portfolio.overview !== undefined
      ? { overview: portfolio.overview }
      : {}),
    ...(portfolio.description !== undefined
      ? { description: portfolio.description }
      : {}),
    ...(portfolio.imageUrl !== undefined
      ? { imageUrl: portfolio.imageUrl }
      : {}),
    ...(portfolio.projectLink !== undefined
      ? { projectLink: portfolio.projectLink }
      : {}),
    ...(portfolio.startDate !== undefined
      ? { startDate: new Date(portfolio.startDate) }
      : {}),
    ...(portfolio.endDate !== undefined
      ? { endDate: new Date(portfolio.endDate) }
      : {}),
  };
};

const buildUserUpdateData = (
  profileData: EngineerProfileInput,
): Prisma.UserUpdateInput => ({
  ...(profileData.name !== undefined ? { fullName: profileData.name } : {}),
  ...(profileData.phone !== undefined ? { phone: profileData.phone } : {}),
  ...(profileData.profileImage !== undefined
    ? { profileImage: profileData.profileImage }
    : {}),
});

const getEngineerSpecialization = (
  specialization?: string,
): EngineerSpecialization | undefined => {
  if (specialization === undefined) return undefined;
  if (
    ["CIVIL", "ARCHITECT", "MECHANICAL", "ELECTRICAL"].includes(specialization)
  ) {
    return specialization as EngineerSpecialization;
  }

  throw new AppError("Invalid engineer specialization", 422);
};

const buildEngineerProfileCreateData = (
  userId: number,
  profileData: EngineerProfileInput,
): Prisma.EngineerProfileUncheckedCreateInput => {
  const specialization = getEngineerSpecialization(profileData.specialization);

  return {
    userId,
    ...(specialization !== undefined ? { specialization } : {}),
    ...(profileData.bio !== undefined ? { bio: profileData.bio } : {}),
    ...(profileData.avatarUrl !== undefined
      ? { avatarUrl: profileData.avatarUrl }
      : {}),
    ...(profileData.yearsOfExperience !== undefined
      ? { yearsOfExperience: profileData.yearsOfExperience }
      : {}),
    ...(profileData.availabilityStatus !== undefined
      ? { availabilityStatus: profileData.availabilityStatus }
      : {}),
    ...(profileData.hourlyRate !== undefined
      ? { hourlyRate: profileData.hourlyRate }
      : {}),
    ...(profileData.location !== undefined
      ? { location: profileData.location }
      : {}),
    ...(profileData.tuVerified !== undefined
      ? { tuVerified: profileData.tuVerified }
      : {}),
  };
};

const buildEngineerProfileUpdateData = (
  profileData: EngineerProfileInput,
): Prisma.EngineerProfileUncheckedUpdateInput => {
  const specialization = getEngineerSpecialization(profileData.specialization);

  return {
    ...(specialization !== undefined ? { specialization } : {}),
    ...(profileData.bio !== undefined ? { bio: profileData.bio } : {}),
    ...(profileData.avatarUrl !== undefined
      ? { avatarUrl: profileData.avatarUrl }
      : {}),
    ...(profileData.yearsOfExperience !== undefined
      ? { yearsOfExperience: profileData.yearsOfExperience }
      : {}),
    ...(profileData.availabilityStatus !== undefined
      ? { availabilityStatus: profileData.availabilityStatus }
      : {}),
    ...(profileData.hourlyRate !== undefined
      ? { hourlyRate: profileData.hourlyRate }
      : {}),
    ...(profileData.location !== undefined
      ? { location: profileData.location }
      : {}),
    ...(profileData.tuVerified !== undefined
      ? { tuVerified: profileData.tuVerified }
      : {}),
  };
};

const buildProjectApplicationData = (
  projectId: number,
  engineerProfileId: number,
  applicationData: ProjectApplicationInput,
): Prisma.ProjectResponseUncheckedCreateInput => ({
  projectId,
  engineerProfileId,
  responseType: "APPLICATION",
  status: "PENDING",
  ...(applicationData.message !== undefined
    ? { message: applicationData.message }
    : {}),
  ...(applicationData.proposedPrice !== undefined
    ? { proposedPrice: applicationData.proposedPrice }
    : {}),
});

export const getEngineerProfileService = async (userId: number) => {
  const prisma = await getEngineerPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: engineerSelect,
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "ENGINEER")
    throw new AppError(
      "Engineer profile is only available for ENGINEER users",
      403,
    );

  return user;
};

const getEngineerProfileRecord = async (userId: number) => {
  const prisma = await getEngineerPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      engineerProfile: {
        select: { id: true },
      },
    },
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "ENGINEER")
    throw new AppError(
      "Engineer operations are only available for ENGINEER users",
      403,
    );
  if (!user.engineerProfile)
    throw new AppError("Engineer profile not found", 404);

  return user.engineerProfile;
};

export const updateEngineerProfileService = async (
  userId: number,
  profileData: EngineerProfileInput,
) => {
  const prisma = await getEngineerPrisma();
  await getEngineerProfileService(userId);

  await prisma.user.update({
    where: { id: userId },
    data: buildUserUpdateData(profileData),
  });

  await prisma.engineerProfile.upsert({
    where: { userId },
    create: buildEngineerProfileCreateData(userId, profileData),
    update: buildEngineerProfileUpdateData(profileData),
  });

  if (profileData.portfolios) {
    const engineerProfile = await getEngineerProfileRecord(userId);

    await prisma.$transaction([
      prisma.engineerPortfolio.deleteMany({
        where: { engineerProfileId: engineerProfile.id },
      }),
      ...profileData.portfolios.map((portfolio) =>
        prisma.engineerPortfolio.create({
          data: buildPortfolioCreateData(engineerProfile.id, portfolio),
        }),
      ),
    ]);
  }

  return getEngineerProfileService(userId);
};

export const updateEngineerStatusService = async (
  userId: number,
  availabilityStatus: AvailabilityStatus,
) => {
  const prisma = await getEngineerPrisma();
  await getEngineerProfileService(userId);

  await prisma.engineerProfile.upsert({
    where: { userId },
    create: {
      userId,
      availabilityStatus,
    },
    update: {
      availabilityStatus,
    },
  });

  return getEngineerProfileService(userId);
};

export const getDirectProjectsService = async (userId: number) => {
  const prisma = await getEngineerPrisma();
  const engineerProfile = await getEngineerProfileRecord(userId);

  return prisma.project.findMany({
    where: {
      selectedEngineerId: engineerProfile.id,
      assignmentType: "DIRECT",
    },
    orderBy: { createdAt: "desc" },
    select: projectSelect,
  });
};

export const getOpenProjectsService = async (userId: number) => {
  const prisma = await getEngineerPrisma();
  await getEngineerProfileRecord(userId);

  return prisma.project.findMany({
    where: {
      status: "OPEN",
      selectedEngineerId: null,
      visibility: "PUBLIC",
      assignmentType: "OPEN",
    },
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
};

export const getEngineerApplicationsService = async (userId: number) => {
  const prisma = await getEngineerPrisma();
  const engineerProfile = await getEngineerProfileRecord(userId);

  return prisma.projectResponse.findMany({
    where: {
      engineerProfileId: engineerProfile.id,
      responseType: "APPLICATION",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      projectId: true,
      status: true,
      proposedPrice: true,
      message: true,
      createdAt: true,
    },
  });
};

export const applyToProjectService = async (
  userId: number,
  projectId: number,
  applicationData: ProjectApplicationInput,
) => {
  const prisma = await getEngineerPrisma();
  const engineerProfile = await getEngineerProfileRecord(userId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      status: true,
      visibility: true,
      assignmentType: true,
      selectedEngineerId: true,
    },
  });

  if (!project) throw new AppError("Project not found", 404);
  if (project.status !== "OPEN")
    throw new AppError("Project is not open for applications", 409);
  if (project.visibility !== "PUBLIC" || project.assignmentType !== "OPEN") {
    throw new AppError(
      "Project is not available for solo engineer applications",
      403,
    );
  }

  const existingApplication = await prisma.projectResponse.findFirst({
    where: {
      projectId,
      engineerProfileId: engineerProfile.id,
      responseType: "APPLICATION",
    },
  });

  if (existingApplication)
    throw new AppError("You have already applied to this project", 409);

  return prisma.projectResponse.create({
    data: buildProjectApplicationData(
      projectId,
      engineerProfile.id,
      applicationData,
    ),
    include: {
      project: {
        select: projectSelect,
      },
    },
  });
};

export const getCompaniesService = async (userId: number) => {
  const prisma = await getEngineerPrisma();
  await getEngineerProfileService(userId);

  return prisma.user.findMany({
    where: {
      role: "COMPANY",
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    select: companySelect,
  });
};

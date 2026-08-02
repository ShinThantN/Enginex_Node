import { prisma } from "../../shared/config/prisma.ts";
import { AppError } from "../../shared/utils/utils.ts";
import type {
  CreateTeamMemberInput,
  TeamMemberDecisionInput,
  UpdateTeamProfileInput,
} from "./teams.schema.ts";

const teamProfileSelect = {
  id: true,
  userId: true,
  companyName: true,
  description: true,
  website: true,
  location: true,
  verified: true,
  ratingAverage: true,
  createdAt: true,
  updatedAt: true,
} as const;

const memberInclude = {
  engineerProfile: {
    select: {
      id: true,
      specialization: true,
      user: { select: { id: true, fullName: true, email: true, profileImage: true } },
    },
  },
  teamProfile: { select: { id: true, companyName: true, userId: true } },
} as const;

async function getCompanyUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "COMPANY") throw new AppError("Company access required", 403);
  return user;
}

async function getOwnedTeamProfile(userId: number) {
  await getCompanyUser(userId);
  const profile = await prisma.teamProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError("Team profile not found", 404);
  return profile;
}

export async function getTeamProfile(userId: number) {
  await getCompanyUser(userId);
  return prisma.teamProfile.findUnique({
    where: { userId },
    select: teamProfileSelect,
  });
}

export async function updateTeamProfile(
  userId: number,
  input: UpdateTeamProfileInput,
) {
  await getCompanyUser(userId);
  const profileData = {
    ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.website !== undefined ? { website: input.website } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
  };

  return prisma.teamProfile.upsert({
    where: { userId },
    create: { userId, ...profileData },
    update: profileData,
    select: teamProfileSelect,
  });
}

export async function getTeamMembers(userId: number) {
  const teamProfile = await getOwnedTeamProfile(userId);
  return prisma.teamMember.findMany({
    where: { teamProfileId: teamProfile.id },
    orderBy: { id: "desc" },
    include: memberInclude,
  });
}

export async function inviteTeamMember(
  userId: number,
  input: CreateTeamMemberInput,
) {
  const teamProfile = await getOwnedTeamProfile(userId);
  const engineer = await prisma.engineerProfile.findUnique({
    where: { id: input.engineerProfileId },
    include: { user: { select: { role: true } } },
  });

  if (!engineer || engineer.user.role !== "ENGINEER") {
    throw new AppError("Engineer profile not found", 404);
  }

  const existing = await prisma.teamMember.findFirst({
    where: {
      teamProfileId: teamProfile.id,
      engineerProfileId: input.engineerProfileId,
    },
  });
  if (existing) throw new AppError("Engineer is already invited to this team", 409);

  return prisma.teamMember.create({
    data: {
      teamProfileId: teamProfile.id,
      engineerProfileId: input.engineerProfileId,
      ...(input.roleInTeam !== undefined ? { roleInTeam: input.roleInTeam } : {}),
      approvalStatus: "PENDING",
    },
    include: memberInclude,
  });
}

export async function removeTeamMember(userId: number, memberId: number) {
  const teamProfile = await getOwnedTeamProfile(userId);
  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, teamProfileId: teamProfile.id },
    select: { id: true },
  });
  if (!member) throw new AppError("Team member not found", 404);

  await prisma.teamMember.delete({ where: { id: member.id } });
}

async function getEngineerProfileForUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, engineerProfile: { select: { id: true } } },
  });
  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "ENGINEER") throw new AppError("Engineer access required", 403);
  if (!user.engineerProfile) throw new AppError("Engineer profile not found", 404);
  return user.engineerProfile;
}

export async function getMyTeamInvitations(userId: number) {
  const engineerProfile = await getEngineerProfileForUser(userId);
  return prisma.teamMember.findMany({
    where: { engineerProfileId: engineerProfile.id, approvalStatus: "PENDING" },
    orderBy: { id: "desc" },
    include: memberInclude,
  });
}

export async function decideTeamInvitation(
  userId: number,
  memberId: number,
  input: TeamMemberDecisionInput,
) {
  const engineerProfile = await getEngineerProfileForUser(userId);
  const member = await prisma.teamMember.findFirst({
    where: { id: memberId, engineerProfileId: engineerProfile.id },
    select: { id: true, approvalStatus: true },
  });
  if (!member) throw new AppError("Team invitation not found", 404);
  if (member.approvalStatus !== "PENDING") {
    throw new AppError("Team invitation has already been decided", 409);
  }

  return prisma.teamMember.update({
    where: { id: member.id },
    data: {
      approvalStatus: input.approvalStatus,
      ...(input.approvalStatus === "APPROVED" ? { joinedAt: new Date() } : {}),
    },
    include: memberInclude,
  });
}

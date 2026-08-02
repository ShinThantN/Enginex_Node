import { z } from "zod";

export const UpdateTeamProfileSchema = z
  .object({
    companyName: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(10_000).optional(),
    website: z.string().url().max(500).optional(),
    location: z.string().trim().min(1).max(255).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required",
  });

export const CreateTeamMemberSchema = z.object({
  engineerProfileId: z.coerce.number().int().positive(),
  roleInTeam: z.string().trim().min(1).max(100).optional(),
});

export const TeamMemberIdParamsSchema = z.object({
  memberId: z.coerce.number().int().positive(),
});

export const TeamMemberDecisionSchema = z.object({
  approvalStatus: z.enum(["APPROVED", "REJECTED"]),
});

export type UpdateTeamProfileInput = z.infer<typeof UpdateTeamProfileSchema>;
export type CreateTeamMemberInput = z.infer<typeof CreateTeamMemberSchema>;
export type TeamMemberDecisionInput = z.infer<typeof TeamMemberDecisionSchema>;

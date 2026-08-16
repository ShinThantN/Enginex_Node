import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().max(500).optional(),
  location: z.string().max(255).optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  type: z.enum(["engineer", "team"]).optional(),
  specialization: z
    .enum(["CIVIL", "ARCHITECT", "MECHANICAL", "ELECTRICAL"])
    .optional(),
  location: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const saveFavoriteSchema = z.object({
  engineerProfileId: z.number().int().positive(),
});

export const createProjectSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  imageUrl: z.string().url().max(500).optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  location: z.string().max(255).optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  assignmentType: z.enum(["OPEN", "DIRECT"]).optional(),
});

export const updateProjectSchema = z.object({
  selectedEngineerId: z.number().int().positive().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  location: z.string().max(255).optional(),
});

export const reviewProjectApplicationSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type SaveFavoriteInput = z.infer<typeof saveFavoriteSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ReviewProjectApplicationInput = z.infer<
  typeof reviewProjectApplicationSchema
>;

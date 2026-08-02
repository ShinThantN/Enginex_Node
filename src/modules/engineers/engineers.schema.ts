import { z } from 'zod';

const DateStringSchema = z.string().datetime().or(z.string().date());

const PortfolioSchema = z.object({
  id: z.number().int().positive().optional(),
  title: z.string().min(1).optional(),
  overview: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  projectLink: z.string().url().optional(),
  startDate: DateStringSchema.optional(),
  endDate: DateStringSchema.optional(),
});

export const UpdateEngineerProfileSchema = z.object({
  name: z.string().min(3).optional(),
  phone: z.string().min(1).optional(),
  profileImage: z.string().url().optional(),
  specialization: z.enum(['CIVIL', 'ARCHITECT', 'MECHANICAL', 'ELECTRICAL']).optional(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  availabilityStatus: z.enum(['AVAILABLE', 'BUSY', 'ON_PROJECT']).optional(),
  hourlyRate: z.number().min(0).optional(),
  location: z.string().min(1).optional(),
  tuVerified: z.boolean().optional(),
  portfolios: z.array(PortfolioSchema).optional(),
});

export const UpdateEngineerStatusSchema = z.object({
  availabilityStatus: z.enum(['AVAILABLE', 'BUSY', 'ON_PROJECT']),
});

export const ProjectIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const ApplyToProjectSchema = z.object({
  message: z.string().max(2000).optional(),
  proposedPrice: z.number().min(0).optional(),
});

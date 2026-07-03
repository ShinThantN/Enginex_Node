import { z } from 'zod';

export const UserIdParamsSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(3).optional(),
  role: z.enum(['CLIENT', 'ENGINEER', 'COMPANY', 'SUPER_ADMIN']).optional(),
  phone: z.string().min(1).optional(),
  profileImage: z.string().url().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
});

export const parsePagination = (query: unknown) => {
  const schema = z.object({
    page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 10)),
  });

  const parsed = schema.safeParse(query);
  return parsed.success ? parsed.data : { page: 1, limit: 10 };
};

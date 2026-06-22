import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(3, { message: 'name must be at least 3 characters long' }),
  email: z.string().email({ message: 'Please provide a valid email address' }),
  password: z.string().min(6, { message: 'password must be at least 6 characters long' }),

  role: z.enum(['CLIENT', 'ENGINEER', 'TEAM'], { message: 'Role must be either CLIENT, ENGINEER or TEAM' }),
});

export const LogInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(3).optional(),
  role: z.enum(['CLIENT', 'ENGINEER', 'TEAM']).optional(),
});

export const parsePagination = (query: any) => {
  const schema = z.object({
    page: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: z.string().optional().transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 10)),
  });
  const parsed = schema.safeParse(query);
  return parsed.success ? parsed.data : { page: 1, limit: 10 };
};
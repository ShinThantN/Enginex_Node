import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(3, { message: 'name must be at least 3 characters long' }),
  email: z.string().email({ message: 'Please provide a valid email address' }),
  password: z.string().min(6, { message: 'password must be at least 6 characters long' }),

  role: z.enum(['CLIENT', 'ENGINEER', 'COMPANY'], {
    message: 'Role must be CLIENT, ENGINEER, or COMPANY',
  }),
});

export const LogInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

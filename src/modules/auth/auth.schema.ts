import { z } from 'zod';
import { OTP_LENGTH } from './otp.config.js';

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

export const VerifyEmailSchema = z.object({
  email: z.string().email({ message: 'Please provide a valid email address' }),
  otp: z
    .string()
    .trim()
    .length(OTP_LENGTH, {
      message: `OTP must be exactly ${OTP_LENGTH} digits`,
    })
    .regex(/^\d+$/, { message: 'OTP must contain only digits' }),
});

export const ResendOtpSchema = z.object({
  email: z.string().email({ message: 'Please provide a valid email address' }),
});

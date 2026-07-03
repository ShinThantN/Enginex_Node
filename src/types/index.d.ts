import type { UserRole } from '../../generated/prisma/enums.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role?: UserRole;
      };
    }
  }
}

export {};

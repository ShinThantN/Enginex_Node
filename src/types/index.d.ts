import type { UserRole } from "../../generated/prisma/enums.ts";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: UserRole;
        role?: UserRole;
      };
    }
  }
}

export {};

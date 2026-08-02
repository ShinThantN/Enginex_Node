import type { UserRole } from "../../generated/prisma/enums.ts";

export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: UserRole;
      };
    }
  }
}

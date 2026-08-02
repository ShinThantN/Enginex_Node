import type { UserRole } from "../../generated/prisma/enums.ts";

export {};
<<<<<<< HEAD
import type { UserRole } from "../../generated/prisma/enums.js";
=======
>>>>>>> 816de5150c036884b880a027e7c35893cd198fd1

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: UserRole;
<<<<<<< HEAD
        role?: UserRole;
=======
>>>>>>> 816de5150c036884b880a027e7c35893cd198fd1
      };
    }
  }
}
<<<<<<< HEAD

export {};
=======
>>>>>>> 816de5150c036884b880a027e7c35893cd198fd1

import type { User as AppUser } from "../schema";

declare global {
  namespace Express {
    interface User extends AppUser {}

    interface Request {
      isAuthenticated(): boolean;
      user?: User;
    }
  }
}

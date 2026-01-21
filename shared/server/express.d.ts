import "express";

declare global {
  namespace Express {
    interface User {
      id?: number | string;
      role?: string;
      [key: string]: unknown;
    }

    interface Request {
      user?: User;
      isAuthenticated?: () => boolean;
    }
  }
}

export {};
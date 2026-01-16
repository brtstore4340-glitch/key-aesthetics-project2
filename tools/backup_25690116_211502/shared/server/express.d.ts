/**
 * Express Request typing augmentation.
 * Keeps backend auth-related properties typed without sprinkling `any`.
 */
export {};

declare global {
  namespace Express {
    interface User {
      // Extend this shape to match your auth user payload if needed.
      [key: string]: unknown;
    }

    interface Request {
      isAuthenticated?: () => boolean;
      user?: User;
    }
  }
}

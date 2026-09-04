// types/express.d.ts

import type { ClerkUser } from "./userType.ts";

declare global {
  namespace Express {
    interface Request {
      user?: ClerkUser;
    }
  }
}

export {};

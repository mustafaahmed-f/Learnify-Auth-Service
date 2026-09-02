import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";

export function checkAuth(req: Request, res: Response, next: NextFunction) {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    return res.status(401).json({
      error: "Unauthenticated. Login first please.",
    });
  }

  next();
}

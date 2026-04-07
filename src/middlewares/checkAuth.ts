import { NextFunction, Request, Response } from "express";

export function checkAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!(req as any).auth || !(req as any).auth().userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return next();
  };
}

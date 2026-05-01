import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { validRoles } from "../utils/constants/validRoles.js";

export async function checkRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { sessionClaims } = getAuth(req);
    const userMetaData = sessionClaims?.userMetadata as { role: string };
    const role = userMetaData?.role as (typeof validRoles)[number];

    if (!roles.includes(role))
      return res.status(403).json({ message: "Unauthorized !!" });

    next();
  };
}

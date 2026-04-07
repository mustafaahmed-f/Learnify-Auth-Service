import { NextFunction, Request, Response } from "express";
import { prisma } from "../services/prismaClient.js";
import { handlePrismaError } from "../utils/helperMethods/handlePrismaError.js";
import { clerkClient } from "@clerk/express";
import { validRoles } from "../utils/constants/validRoles.js";
import { checkIdAndUser } from "../utils/helperMethods/checkIdAndUser.js";

export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  //todo : add a step to allow only admin or payment service to use this api
  try {
    const user = await checkIdAndUser(req);
    const { id: userId, clerkId } = user;
    const newRole = req.body?.role;

    if (!newRole || newRole.length === 0)
      return res.status(400).json({ message: "Role is required !!" });

    if (!validRoles.includes(newRole))
      return res.status(400).json({ message: "Invalid role !!" });

    const result = await prisma.user.update({
      where: {
        clerkId,
        id: userId,
      },
      data: {
        role: newRole,
      },
    });

    if (!result) return res.status(404).json({ message: "User not found !!" });

    await clerkClient.users.updateUserMetadata(clerkId, {
      publicMetadata: {
        role: newRole,
      },
    });

    return res.status(200).json({ message: "Role updated successfully !!" });
  } catch (error) {
    console.log(error);
    return res.status(handlePrismaError(error).status).json({
      message: handlePrismaError(error).message,
    });
  }
}

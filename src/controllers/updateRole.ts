import { NextFunction, Request, Response } from "express";
import { prisma } from "../services/prismaClient.js";
import { handlePrismaError } from "../utils/helperMethods/handlePrismaError.js";
import { clerkClient } from "@clerk/express";

export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  //todo : add a step to allow only admin or payment service to use this api
  try {
    const userId = req.body.id;
    const clerkId = req.body.clerkId;
    const newRole = req.body.role;

    const user = await prisma.user.update({
      where: {
        clerkId,
        id: userId,
      },
      data: {
        role: newRole,
      },
    });

    if (!user) {
      return next(new Error("User not found"));
    }

    await clerkClient.users.updateUserMetadata(clerkId, {
      publicMetadata: {
        role: newRole,
      },
    });

    return res.status(200).json({ message: "Role updated successfully !!" });
  } catch (error) {
    console.log(error);
    return next(new Error(handlePrismaError(error).message));
  }
}

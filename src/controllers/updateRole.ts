import { NextFunction, Request, Response } from "express";
import { prisma } from "../services/prismaClient.js";
import { handlePrismaError } from "../utils/helperMethods/handlePrismaError.js";
import { clerkClient } from "@clerk/express";
import { validRoles } from "@mustafahmed1997/learnify-backend";

export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  //todo : add a step to allow only admin or payment service to use this api
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Unauthenticated. Login first please." });
    }

    const newRole = req.body?.role;
    const targetUser = req.body?.targetUser; //* The User's id whose role need to be updated

    //todo : add a validation using zod instead of these two conditions ..

    if (!newRole || newRole.length === 0)
      return res.status(400).json({ message: "Role is required !!" });

    if (!validRoles.includes(newRole))
      return res.status(400).json({ message: "Invalid role !!" });

    //===========================================

    const updatedUser = await prisma.user.update({
      where: {
        id: targetUser,
      },
      data: {
        role: newRole,
      },
    });

    if (!updatedUser)
      return res
        .status(404)
        .json({ message: "User not found or failed to update role !!" });

    await clerkClient.users.updateUserMetadata(updatedUser.clerkId, {
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

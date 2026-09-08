import { clerkClient } from "@clerk/express";
import { getJsonResponse } from "@mustafahmed1997/learnify-backend";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../services/prismaClient.js";
import { handlePrismaError } from "../utils/helperMethods/handlePrismaError.js";

export async function updateRole(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const newRole = req.body?.role;
    const targetUser = req.body?.targetUser; //* The User's id whose role need to be updated

    //===========================================

    //todo : we want to prevent returning instructor back to student ..

    const updatedUser = await prisma.user.update({
      where: {
        id: targetUser,
      },
      data: {
        role: newRole,
      },
    });

    if (!updatedUser)
      return res.status(404).json(
        getJsonResponse({
          error: "User not found or failed to update role !!",
        }),
      );

    await clerkClient.users.updateUserMetadata(updatedUser.clerkId, {
      publicMetadata: {
        role: newRole,
      },
    });

    return res
      .status(200)
      .json(getJsonResponse({ message: "Role updated successfully !!" }));
  } catch (error) {
    console.log(error);
    return res.status(handlePrismaError(error).status).json({
      message: handlePrismaError(error).message,
    });
  }
}

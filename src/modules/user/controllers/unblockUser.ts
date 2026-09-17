import { AppError, handlePrismaError } from "@mustafahmed1997/learnify-backend";
import { NextFunction, Request, Response } from "express";

export async function unblockUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
  } catch (error) {
    console.log(`unblockUser : ${error}`);
    const prismaError = handlePrismaError(error);
    return next(new AppError(prismaError.message, prismaError.status));
  }
}

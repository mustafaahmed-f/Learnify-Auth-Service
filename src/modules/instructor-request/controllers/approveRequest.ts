import { AppError, handlePrismaError } from "@mustafahmed1997/learnify-backend";
import { NextFunction, Request, Response } from "express";

export async function approveRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
  } catch (error) {
    console.log(`cancelRequest : ${error}`);
    const prismaError = handlePrismaError(error);
    return next(new AppError(prismaError.message, prismaError.status));
  }
}

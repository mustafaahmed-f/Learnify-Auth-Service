import { AppError, handlePrismaError } from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';

export async function getAllRequests(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
    } catch (error) {
        console.log(`getAllRequests : ${error}`);
        const prismaError = handlePrismaError(error);
        return next(new AppError(prismaError.message, prismaError.status));
    }
}

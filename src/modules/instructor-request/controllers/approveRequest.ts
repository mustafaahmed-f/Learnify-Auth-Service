import { AppError, handlePrismaError } from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';

export async function approveRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        //* Only callable if status == pending
    } catch (error) {
        console.log(`approveRequest : ${error}`);
        const prismaError = handlePrismaError(error);
        return next(new AppError(prismaError.message, prismaError.status));
    }
}

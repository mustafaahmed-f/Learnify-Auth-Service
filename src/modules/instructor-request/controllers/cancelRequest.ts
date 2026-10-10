import { AppError, handlePrismaError } from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';

export async function cancelRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        //* Can only cancel request if it is pending and only by owner
    } catch (error) {
        console.log(`cancelRequest : ${error}`);
        const prismaError = handlePrismaError(error);
        return next(new AppError(prismaError.message, prismaError.status));
    }
}

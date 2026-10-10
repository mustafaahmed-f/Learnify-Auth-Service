import { AppError, handlePrismaError } from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';

export async function submitRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        /**
     ** This is how we will check if user can resend request:
     ** const cooldownEndsAt =
     **  latestRequest.decidedAt!.getTime() +
     **  10 * 24 * 60 * 60 * 1000;

     **   const canSubmit = Date.now() >= cooldownEndsAt;

     */
    } catch (error) {
        console.log(`cancelRequest : ${error}`);
        const prismaError = handlePrismaError(error);
        return next(new AppError(prismaError.message, prismaError.status));
    }
}

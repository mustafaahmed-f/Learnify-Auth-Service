import { AppError, handlePrismaError } from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';

export async function getSingleRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        //todo : here we should check if the role is student so the owner is the only
        // todo : student allowed to access this endpoint. but if user is admin allow it wihtout any checks
    } catch (error) {
        console.log(`getSingleRequest : ${error}`);
        const prismaError = handlePrismaError(error);
        return next(new AppError(prismaError.message, prismaError.status));
    }
}

import {
    AppError,
    ClerkUser,
    handlePrismaError,
} from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../../services/prismaClient.js';

export async function editRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const user = req.user as ClerkUser;
        const userId = user.userMetadata.dbUserId;
        const message = req.body.message;

        const editedRequest = await prisma.$transaction(async (tx) => {});
    } catch (error) {
        console.log(`editRequest : ${error}`);
        const prismaError = handlePrismaError(error);
        return next(new AppError(prismaError.message, prismaError.status));
    }
}

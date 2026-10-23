import {
    AppError,
    getJsonResponse,
    handlePrismaError,
} from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../../services/prismaClient.js';

export async function cancelRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const requestId = req.params.requestId;
        const userId = req.user?.userMetadata?.dbUserId;

        await prisma.instructorRequest.delete({
            where: {
                id: requestId,
                userId: userId,
                status: 'PENDING',
            },
        });

        return res.status(200).json(
            getJsonResponse({
                success: false,
                message: 'Request cancelled successfully',
            })
        );
    } catch (error) {
        console.log(`cancelRequest : ${error}`);
        const prismaError = handlePrismaError(error);
        return next(new AppError(prismaError.message, prismaError.status));
    }
}

import {
    AppError,
    getJsonResponse,
    handleCaughtError,
} from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../../services/prismaClient.js';

export async function getMyRequests(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const userId = req.user?.userMetadata?.dbUserId;
        console.log('User  : ', req.user);

        const requests = await prisma.instructorRequest.findMany({
            where: {
                userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!requests || requests.length === 0) {
            throw new AppError('No requests found', 404);
        }

        return res.status(200).json(
            getJsonResponse({
                success: true,
                message: 'Requests retrieved successfully',
                data: requests,
            })
        );
    } catch (error) {
        console.log(`getMyRequests : ${error}`);
        return handleCaughtError(error, next);
    }
}

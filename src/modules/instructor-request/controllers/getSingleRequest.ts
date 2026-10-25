import {
    ClerkUser,
    getJsonResponse,
    handleCaughtError,
} from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../../services/prismaClient.js';

export async function getSingleRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const user = req.user as ClerkUser;
        const userId = user.userMetadata.dbUserId;
        const requestId = req.params.requestId;

        const request = await prisma.instructorRequest.findUniqueOrThrow({
            where: {
                id: requestId,
                ...(!user.userMetadata.roles.includes('ADMIN') && {
                    userId,
                }),
            },
        });

        return res.status(200).json(
            getJsonResponse({
                success: true,
                message: 'Request retrieved successfully',
                data: request,
            })
        );
    } catch (error) {
        console.log(`getSingleRequest : ${error}`);
        return handleCaughtError(error, next);
    }
}

import {
    AppError,
    getJsonResponse,
    handleCaughtError,
} from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../../services/prismaClient.js';
import { StatusCodes } from 'http-status-codes';

export async function cancelRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const requestId = req.params.requestId;
        const userId = req.user?.userMetadata?.dbUserId;

        const result = await prisma.$transaction(async (tx) => {
            const requests = await tx.$queryRaw<
                { id: string; status: string }[]
            >`
            SELECT id,status from \`instructorRequest\` where id = ${requestId} AND userId = ${userId} FOR UPDATE`;

            const request = requests[0];

            if (!request) {
                throw new AppError(
                    'Request not found !',
                    StatusCodes.NOT_FOUND
                );
            }

            if (request.status !== 'PENDING') {
                throw new AppError(
                    'Request is not pending and cannot be cancelled',
                    StatusCodes.BAD_REQUEST
                );
            }

            return await tx.instructorRequest.delete({
                where: {
                    id: requestId,
                    userId: userId,
                    status: 'PENDING',
                },
            });
        });

        return res.status(200).json(
            getJsonResponse({
                success: true,
                message: 'Request cancelled successfully',
            })
        );
    } catch (error) {
        console.log(`cancelRequest : ${error}`);
        console.log('cancelRequest : End of error');
        return handleCaughtError(error, next);
    }
}

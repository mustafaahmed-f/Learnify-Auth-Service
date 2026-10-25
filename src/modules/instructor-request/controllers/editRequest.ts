import {
    AppError,
    ClerkUser,
    getJsonResponse,
    handleCaughtError,
    handlePrismaError,
} from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';
import { prisma } from '../../../services/prismaClient.js';
import { StatusCodes } from 'http-status-codes';

export async function editRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const user = req.user as ClerkUser;
        const userId = user.userMetadata.dbUserId;
        const requestId = req.params.requestId;
        const message = req.body.message;

        const editedRequest = await prisma.$transaction(async (tx) => {
            //* 1. Lock the user row first to disallow race conditions
            //* with submit request api.
            const users = await tx.$queryRaw<{ id: string }[]>`
                            SELECT id
                            FROM \`User\`
                            WHERE id = ${userId}
                            FOR UPDATE
                        `;

            if (users.length === 0) {
                throw new AppError('User not found', StatusCodes.NOT_FOUND);
            }

            //* 2. Lock the request row to prevent concurrent modifications.
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

            //* 3. Check if the request is still pending.
            if (request.status !== 'PENDING') {
                throw new AppError(
                    'Request is not pending and cannot be edited',
                    StatusCodes.BAD_REQUEST
                );
            }

            return await tx.instructorRequest.update({
                where: {
                    id: requestId,
                    userId: userId,
                    status: 'PENDING',
                },
                data: {
                    message: message,
                    isEdited: true,
                },
            });
        });

        return res.status(200).json(
            getJsonResponse({
                success: true,
                message: 'Request edited successfully',
                data: editedRequest,
            })
        );
    } catch (error) {
        console.log(`editRequest : ${error}`);
        console.log('editRequest : End of error');
        return handleCaughtError(error, next);
    }
}

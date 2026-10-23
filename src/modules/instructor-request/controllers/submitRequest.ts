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

export async function submitRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const user = req.user as ClerkUser;
        const userId = user.userMetadata.dbUserId;
        const message = req.body.message;

        const newRequest = await prisma.$transaction(async (tx) => {
            const users = await tx.$queryRaw<{ id: string }[]>`
            SELECT id FROM \`User\` WHERE id = ${userId} FOR UPDATE`;

            if (users.length === 0) {
                throw new AppError('No users found !', StatusCodes.NOT_FOUND);
            }

            const numOfRequests = await tx.instructorRequest.count({
                where: {
                    userId,
                },
            });

            if (numOfRequests >= 2) {
                throw new AppError(
                    'You have reached the maximum number of requests',
                    StatusCodes.BAD_REQUEST
                );
            }

            const firstRequest = await tx.instructorRequest.findFirst({
                where: {
                    userId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            if (firstRequest) {
                switch (firstRequest?.status) {
                    case 'PENDING':
                        throw new AppError(
                            'You have a pending request !',
                            StatusCodes.BAD_REQUEST
                        );
                        break;

                    case 'APPROVED':
                        throw new AppError(
                            'You are already an instructor ! If you still have no instructor access, please contact support !',
                            StatusCodes.BAD_REQUEST
                        );

                    case 'REJECTED':
                        if (!firstRequest.decidedAt) {
                            //todo : use unified error logger;
                            console.log(
                                `This request ${firstRequest.id} has no decidedAt field`
                            );
                            throw new AppError(
                                'Something went wrong !',
                                StatusCodes.INTERNAL_SERVER_ERROR
                            );
                        }
                        const tenDayPeriod =
                            new Date(firstRequest.decidedAt).getTime() +
                            10 * 24 * 60 * 60 * 1000;
                        const canSubmit = Date.now() >= tenDayPeriod;
                        if (!canSubmit) {
                            const waitHours = Math.ceil(
                                (tenDayPeriod - Date.now()) / (1000 * 60 * 60)
                            );
                            throw new AppError(
                                `You cannot submit a new request yet. Please wait ${waitHours} hours after your last rejection.`,
                                StatusCodes.BAD_REQUEST
                            );
                        }

                    default:
                        break;
                }
            }

            //* Create new request
            return tx.instructorRequest.create({
                data: {
                    userId,
                    message,
                    pendingKey: userId,
                },
            });
        });

        return res.status(StatusCodes.CREATED).json(
            getJsonResponse({
                success: true,
                message: 'Request submitted successfully',
                data: newRequest,
            })
        );
    } catch (error) {
        return handleCaughtError(error, next);
    }
}

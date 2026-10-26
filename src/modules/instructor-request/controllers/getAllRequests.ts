import {
    getJsonResponse,
    handleCaughtError,
    orderByObject,
    pagination,
} from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';
import { requestFiltration } from '../utils/requestFiltration.js';
import { instructorRequestStatus } from '../types/instructorRequestStatus.js';
import { prisma } from '../../../services/prismaClient.js';

export async function getAllRequests(
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.log('Called api !!');
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const { skip, limit: paginatedLimit } = pagination(page, limit);

        const startCreationDate = req.query.startCreationDate as
            string | undefined;
        const endCreationDate = req.query.endCreationDate as string | undefined;
        const status = req.query.status as instructorRequestStatus | undefined;
        const userId = req.query.userId as string | undefined;

        const filtrationObject = requestFiltration({
            startCreationDate,
            endCreationDate,
            status,
            userId,
        });

        const sort = (req.query.sort as string) || '-createdAt';
        const sortableFields = ['createdAt', 'updatedAt'];
        const orderBy = orderByObject(sort, sortableFields);

        const [requests, totalResults] = await Promise.all([
            prisma.instructorRequest.findMany({
                where: filtrationObject,
                skip,
                take: paginatedLimit,
                orderBy,
            }),

            prisma.instructorRequest.count({
                where: filtrationObject,
            }),
        ]);

        return res.status(200).json(
            getJsonResponse({
                success: true,
                message: 'Requests retrieved successfully',
                data: {
                    requests,
                    pagination: {
                        page,
                        limit: paginatedLimit,
                        totalResults,
                        totalPages: Math.ceil(totalResults / paginatedLimit),
                        hasNextPage:
                            page < Math.ceil(totalResults / paginatedLimit),
                        hasPreviousPage: page > 1,
                    },
                },
            })
        );
    } catch (error) {
        console.log(`getAllRequests : ${error}`);
        return handleCaughtError(error, next);
    }
}

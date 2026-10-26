import { instructorRequestWhereInput } from '../../../generated/prisma/models.js';

type filtrationParams = {
    userId?: string;
    status?: 'PENDING' | 'APPROVED' | 'REJECTED';
    startCreationDate?: string;
    endCreationDate?: string;
};

export function requestFiltration({
    userId,
    status,
    startCreationDate,
    endCreationDate,
}: filtrationParams) {
    const filtration: instructorRequestWhereInput = {};

    if (userId) {
        filtration.userId = userId;
    }

    if (status) {
        filtration.status = status;
    }

    if (startCreationDate || endCreationDate) {
        filtration.createdAt = {
            ...(startCreationDate && { gte: new Date(startCreationDate) }),
            ...(endCreationDate && {
                lt: new Date(
                    new Date(endCreationDate).getTime() + 24 * 60 * 60 * 1000
                ),
            }),
        };
    }

    return filtration;
}

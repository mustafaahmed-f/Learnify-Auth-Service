import z from 'zod';

export const getAllRequestsQuerySchema = z
    .object({
        page: z
            .string()
            .regex(/^\d+$/)
            .refine((val) => Number(val) >= 1, 'Page must be at least 1')
            .optional(),
        limit: z
            .string()
            .regex(/^\d+$/)
            .refine(
                (val) => Number(val) >= 1 && Number(val) <= 25,
                'Limit must be between 1 and 25'
            )
            .optional(),
        startCreationDate: z.iso.date().optional(),
        endCreationDate: z.iso.date().optional(),
        status: z
            .enum(['pending', 'approved', 'rejected'])
            .transform((status) => status.toUpperCase())
            .optional(),
        sort: z
            .string('')
            .regex(
                /^-?[a-zA-Z][a-zA-Z0-9]*(\/-?[a-zA-Z][a-zA-Z0-9]*)*$/,
                'Invalid sort format'
            )
            .optional(),
        userId: z
            .string()
            .regex(/^c[a-z0-9]{24}$/, 'Invalid user ID format')
            .optional(),
    })
    .strict()
    .refine(
        ({ startCreationDate, endCreationDate }) => {
            if (!startCreationDate || !endCreationDate) {
                return true;
            }

            return (
                new Date(startCreationDate).getTime() <=
                new Date(endCreationDate).getTime()
            );
        },
        {
            message:
                'startCreationDate must be before or equal to endCreationDate',
            path: ['endCreationDate'],
        }
    );

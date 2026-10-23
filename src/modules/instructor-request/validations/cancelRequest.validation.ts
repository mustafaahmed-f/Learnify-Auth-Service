import { requiredFieldMsg } from '@mustafahmed1997/learnify-backend';
import z from 'zod';

export const cancelRequestParamsSchema = z
    .object({
        requestId: z
            .string()
            .min(1, requiredFieldMsg('requestId is required !')),
    })
    .strict();

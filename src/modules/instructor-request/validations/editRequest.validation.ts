import {
    maxLengthMsg,
    requiredFieldMsg,
} from '@mustafahmed1997/learnify-backend';
import z from 'zod';

export const editRequestParamsSchema = z
    .object({
        requestId: z.string().min(1, requiredFieldMsg('requestId is required')),
    })
    .strict();

export const editRequestBodySchema = z
    .object({
        message: z
            .string()
            .min(1, requiredFieldMsg('message is required'))
            .max(500, maxLengthMsg(500))
            .trim(),
    })
    .strict();

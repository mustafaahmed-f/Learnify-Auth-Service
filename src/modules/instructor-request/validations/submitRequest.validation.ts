import {
    maxLengthMsg,
    requiredFieldMsg,
} from '@mustafahmed1997/learnify-backend';
import z from 'zod';

export const submitRequestBodySchema = z
    .object({
        message: z
            .string('message must be a string')
            .min(1, requiredFieldMsg('message is required'))
            .max(1000, maxLengthMsg(1000))
            .trim(),
    })
    .strict();

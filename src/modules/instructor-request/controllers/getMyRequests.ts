import { handleCaughtError } from '@mustafahmed1997/learnify-backend';
import { NextFunction, Request, Response } from 'express';

export async function getMyRequests(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        //* Callable by owner only ( each student can have at most two requests )
    } catch (error) {
        console.log(`getMyRequests : ${error}`);
        return handleCaughtError(error, next);
    }
}

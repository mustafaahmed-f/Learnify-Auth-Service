import { NextFunction, Request, Response } from "express";
import { getJsonResponse } from "./getJsonResponse.js";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err) {
    if ((req as any).validationErrorArr) {
      return res.status(err.cause || 500).json({
        message: "Validation Error",
        error: (req as any).validationErrorArr.map((err: any) => err.message),
      });
    }
    return res
      .status(err.cause || 400)
      .json(getJsonResponse({ error: err.message }));
  }
};

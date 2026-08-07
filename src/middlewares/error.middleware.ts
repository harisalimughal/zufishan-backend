// Central error handler — last middleware registered in app.ts. Catches
// everything thrown/passed to next(err) (including ApiError from
// utils/apiError.ts) and formats one consistent JSON error response.
//
// TODO:
// - export function errorHandler(err, req, res, next) {...}

import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  console.error(err);

  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

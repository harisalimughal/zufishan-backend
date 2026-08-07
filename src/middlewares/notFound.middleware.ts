// Catches requests to unmatched routes — registered right after all routes,
// right before errorHandler in app.ts.
//
// TODO:
// - export function notFound(req, res, next) { next(new ApiError(404, ...)) }

import { Request, Response, NextFunction } from "express";

export const notFound = (req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

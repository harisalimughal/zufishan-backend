// Wraps async controller functions so rejected promises are forwarded to
// next(err) automatically, instead of every controller needing its own
// try/catch.
//
// TODO:
// - export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

import { Request, Response, NextFunction } from "express";

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

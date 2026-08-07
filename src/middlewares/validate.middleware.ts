// Generic validation middleware — runs a validator schema (see
// src/validators) against req.body/query/params and returns 400 on failure,
// so controllers never have to validate input themselves.
//
// TODO:
// - export const validate = (schema: ZodSchema) => (req, res, next) => {...}

import { Request, Response, NextFunction } from "express";

export const validate =
  (_schema: unknown) => (_req: Request, _res: Response, next: NextFunction) => {
    next();
  };

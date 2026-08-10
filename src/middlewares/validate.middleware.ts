import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";

type ValidationSource = "body" | "params" | "query";

export const validate = (
  schema: ZodSchema,
  source: ValidationSource = "body"
) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      let dataToValidate: unknown;

      switch (source) {
        case "params":
          dataToValidate = req.params;
          break;

        case "query":
          dataToValidate = req.query;
          break;

        case "body":
        default:
          dataToValidate = req.body;
          break;
      }

      await schema.parseAsync(dataToValidate);

      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });

        return;
      }

      next(error);
    }
  };
};
// Custom error class carrying an HTTP status code, thrown from
// controllers/services/repositories and caught by error.middleware.ts.
//
// TODO:
// - export class ApiError extends Error { statusCode: number; constructor(statusCode, message) {...} }

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.statusCode = statusCode;
    this.name = "ApiError";

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { ApiError } from '../utils/apiError'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.path}`)
  next(error)
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  }, 'Error occurred')

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    })
  }

  const statusCode = (err as any).statusCode || 500
  const message = statusCode === 500 ? 'Internal server error' : err.message

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
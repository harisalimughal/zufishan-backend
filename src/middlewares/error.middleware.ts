import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'
import { ApiError } from '../utils/apiError'
import { prisma } from '../config/prisma'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.path}`)
  next(error)
}

// The Prisma Query Engine (a separate Rust process/library) can panic on some
// hosts — e.g. "PANIC: timer has gone away" after the process is frozen and
// resumed by a resource-constrained host. Once that happens, every
// subsequent query fails until the engine is respawned. Rather than leaving
// the whole app broken until someone manually restarts it, force a
// disconnect so Prisma lazily spins up a fresh engine on the next query.
const isPrismaEnginePanic = (err: Error) =>
  err.name === 'PrismaClientRustPanicError' || /PANIC:/.test(err.message)

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  }, 'Error occurred')

  if (isPrismaEnginePanic(err)) {
    logger.fatal('Prisma engine panic detected — forcing reconnect for the next request')
    prisma.$disconnect().catch((disconnectErr) => {
      logger.error({ error: disconnectErr }, 'Failed to disconnect Prisma after engine panic')
    })
  }

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
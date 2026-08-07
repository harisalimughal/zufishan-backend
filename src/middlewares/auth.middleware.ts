import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
      })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      })
    }

    ;(req as any).user = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    })
  }
}
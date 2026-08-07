import jwt from 'jsonwebtoken'
import { env } from '../config/env'

// Cast to string with fallback
const JWT_SECRET = env.JWT_SECRET as string || 'fallback-secret-key-for-development-only'
const JWT_EXPIRES_IN = String(env.JWT_EXPIRES_IN || '7d')

interface TokenPayload {
  id: string
  email: string
  role: string
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' } as jwt.SignOptions)
}

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}
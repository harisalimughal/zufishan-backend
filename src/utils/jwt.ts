import jwt from 'jsonwebtoken'
import { env } from '../config/env'

// JWT secret is required by env validation - no fallback
const JWT_SECRET = env.JWT_SECRET
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

// ✅ Add missing function for reset tokens
export const generateTokenWithExpiry = (payload: TokenPayload, expiresIn: string): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions)
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
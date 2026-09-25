// Augments Express's Request type so req.user is typed after
// auth.middleware attaches it via verifyToken().

import { Request } from 'express'
import { Role } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: Role
      }
    }
  }
}

// Kept for the marketplace controllers; req.user now comes from the global augmentation.
export type AuthenticatedRequest = Request

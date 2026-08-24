// Augments Express's Request type so req.user is typed after
// auth.middleware attaches it via verifyToken().

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

export {}

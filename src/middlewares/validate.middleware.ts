import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

type ValidationSource = 'body' | 'params' | 'query'

export const validate = (schema: ZodSchema, source: ValidationSource = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let dataToValidate: any
      
      switch (source) {
        case 'params':
          dataToValidate = req.params
          break
        case 'query':
          dataToValidate = req.query
          break
        case 'body':
        default:
          dataToValidate = req.body
          break
      }
      
      await schema.parseAsync(dataToValidate)
      return next()
    } catch (error: any) {
      if (error.issues) {
        const errors = error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors,
        })
      }
      return next(error)
    }
  }
}
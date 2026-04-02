import { type Request, type Response, type NextFunction, type RequestHandler } from 'express'
import { type ZodSchema, type ZodError } from 'zod'

export function validate<T>(schema: ZodSchema<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const errors = (result.error as ZodError).flatten().fieldErrors
      res.status(400).json({ error: 'Validation failed', details: errors })
      return
    }
    req.body = result.data as T
    next()
  }
}

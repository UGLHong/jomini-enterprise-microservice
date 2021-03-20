import { Request, Response, NextFunction } from 'express'

export function asyncRoute (func) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      return await func(req, res, next)
    } catch (e) {
      console.error(e)
      next(e)
    }
  }
}

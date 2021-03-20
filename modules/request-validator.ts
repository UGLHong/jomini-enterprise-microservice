import { validationResult } from 'express-validator'
import { Request, Response, NextFunction } from 'express'

export function validateReq () {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    } else {
      next()
    }
  }
}

export function filterReqBody (...whitelistedKey: Array<string>) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = Object.keys(req.body).reduce((acc, key) => {
      if (whitelistedKey.includes(key)) {
        acc[key] = req.body[key]
      }

      return acc
    }, {})

    next()
  }
}

export * from 'express-validator'

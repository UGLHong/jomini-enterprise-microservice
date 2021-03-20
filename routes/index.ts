import express from 'express'
import cors from 'cors'
import { admin } from '@modules/firebase'
import userRouter from '@routes/user'

const rootRouter = express.Router()
const allowedOrigins = process.env.CORS_ALLOWED_ORIGIN ? process.env.CORS_ALLOWED_ORIGIN.split(' ') : null

// /* GET home page. */
rootRouter.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' })
})

export function registerRoute (app) {
  app.use(
    cors({
      origin: function (origin, callback) {
        // allow requests with no origin
        // (like mobile apps or curl requests)
        if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
          return callback(null, true)
        }

        const msg =
          'The CORS policy for this site does not ' +
          'allow access from the specified Origin.'
        return callback(new Error(msg), false)
      }
    })
  )

  // authenticate with firebase auth
  app.use(function checkAuth (req: any, res, next) {
    if (req.headers.authorization) {
      admin
        .auth()
        .verifyIdToken(req.headers.authorization)
        .then((res) => {
          req.auth = res
          next()
        })
        .catch(() => {
          if (process.env.NODE_ENV !== 'development') {
            res.status(403).send('Unauthorized')
          } else {
            req.auth = {}
            next()
          }
        })
    } else {
      if (process.env.NODE_ENV !== 'development') {
        res.status(403).send('Unauthorized')
      } else {
        req.auth = {}
        next()
      }
    }
  })

  app.use(rootRouter)
  app.use(userRouter)
}

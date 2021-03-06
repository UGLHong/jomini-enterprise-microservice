import createError from 'http-errors'
import express from 'express'
import path from 'path'
import cookieParser from 'cookie-parser'
import logger from 'morgan'

import { registerRoute } from '@routes'
// import { registerDatabase } from '@database'
import { registerFirebase } from '@modules/firebase'
import compression from 'compression'
import axios from 'axios'
import { initSharedBrowser } from '@modules/puppeteer'

axios.interceptors.response.use((response) => {
  return response.data
}, err => { throw err })

const app = express()

// constantly send http request so router won't mark it as inactive and drop its connection
// causing it unable to receive request externally
setInterval(() => {
  axios.post('https://google.com').catch(err => {
    return err
  })
}, 30000)

// these must come before routes
app.use(compression())
app.use(logger('dev'))
app.use(cookieParser() as any)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// registerDatabase()
registerFirebase()
registerRoute(app)

// init puppeteer shared browser
initSharedBrowser()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

app.use(express.static(path.join(__dirname, 'public')))

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404))
})

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

export default app

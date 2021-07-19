import express from 'express'
import { body, validateReq } from '@modules/request-validator'
import { asyncRoute } from '@helper'
import { getBankScreenshot, sendMLBBDiamond, getSmileOneData } from '@modules/puppeteer'
import { admin } from '@modules/firebase'

const router = express.Router()

router.post(
  '/puppeteer/sendDiamond',
  body('splitOrders').isArray({ min: 1 }),
  asyncRoute(async (req, res, next) => {
    try {
      const processResult = await sendMLBBDiamond(req.body.splitOrders)

      return res.send({
        status: 'success',
        data: processResult
      })
    } catch (err) {
      return res.status(500).send({
        status: 'fail',
        data: {
          orders: [],
          successfulOrders: [],
          failedOrders: [],
          message: err.message
        },
        message: err.message
      })
    }
  })
)

router.post(
  '/puppeteer/getBankSS',
  body('orderId').isString().notEmpty(),
  validateReq(),
  asyncRoute(async (req, res, next) => {
    const screenshotUrls: Array<string> = []
    try {
      const { status, data } = await getBankScreenshot()

      if (status === 'success' && data.fileBuffers && data.fileBuffers.length > 0) {
        const bucket = admin.storage().bucket()

        for (let i = data.fileBuffers.length; i > 0; i--) {
          const fileBuffer = data.fileBuffers[i - 1]
          const file = bucket.file(`order/${req.body.orderId}/mbb-ss-${i}.jpeg`)
          await file.save(fileBuffer, { gzip: true })
          await file.makePublic()
          screenshotUrls.push(await file.publicUrl())
        }
      }

      return res.send({
        status: 'success',
        data: {
          screenshotUrls,
          currentBalance: data.currentBalance
        }
      })
    } catch (err) {
      console.error(err)
      return res.status(500).send({
        status: 'fail',
        message: err.message
      })
    }
  })
)

router.post(
  '/puppeteer/getSmileOneData',
  asyncRoute(async (req, res, next) => {
    try {
      const result = await getSmileOneData()

      return res.send(result)
    } catch (err) {
      console.error(err)
      return res.status(500).send({
        status: 'fail',
        message: err.message
      })
    }
  })
)

export default router

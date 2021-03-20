import express from 'express'
import { getRepository, UserEntity } from '@database'
import { body, filterReqBody, validateReq } from '@modules/request-validator'
import { asyncRoute } from '~/helper'

// import admin from 'firebase-admin'
const router = express.Router()

// get user ( self )
router.get('/user/me', asyncRoute(async (req, res, next) => {
  res.send(await getRepository(UserEntity).findOne({ id: req.auth.uid }))
}))

// create user ( self )
router.post(
  '/user/me',
  body('name').isString().isLength({ min: 1, max: 50 }),
  body('contactNumbers').isArray({ min: 1 }),
  body('photos').isArray(),
  validateReq(),
  filterReqBody('name', 'contactNumbers', 'photos'),
  asyncRoute(async (req, res, next) => {
    const newUser = new UserEntity()

    const createdUser = await getRepository(UserEntity).save({
      ...newUser,
      ...req.body,
      id: req.auth.uid,
      email: req.auth.email
    })

    res.send(createdUser)
  })
)

export default router

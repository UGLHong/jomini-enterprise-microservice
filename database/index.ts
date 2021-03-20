import 'reflect-metadata'
import { createConnection } from 'typeorm'
import UserEntity from '@database/entity/user'
import PaymentEntity from '@database/entity/payment'

export async function registerDatabase({ dropSchema = false, synchronize = true } = {}) {
  return createConnection({
    type: 'postgres',
    host: process.env.DB_HOST, // os.environ.get('DB_HOST'),
    username: process.env.DB_USERNAME, // os.environ.get('DB_USERNAME'),
    password: process.env.DB_PASSWORD, // os.environ.get('DB_PASSWORD'),
    database: process.env.DB_NAME,
    dropSchema,
    synchronize,
    migrations: ['migration/*.ts'],
    entities: [UserEntity, PaymentEntity],
    logging: (process.env.DB_LOGGING === 'true')
  }).then(connection => {
  }).catch(err => {
    console.log('Database connection error: ', err)
  })
}

export * from 'typeorm'
export {
  UserEntity,
  PaymentEntity
}

import admin from 'firebase-admin'

import serviceAccount from '~/jomini-enterprise-firebase-adminsdk-credentials.json'

export function registerFirebase () {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  })
}

export {
  admin
}

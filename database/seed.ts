import { registerDatabase } from '@database'
const { performance } = require('perf_hooks')
registerDatabase({
  dropSchema: true,
  synchronize: true
}).then(() => {
  const venuePromise: Array<Promise<any>> = []
  const startPerf = performance.now()
  console.log('Start seeding... ', startPerf)

  for (let j = 0; j < 50; j++) {

  }
  Promise.all(venuePromise).then(() => {
    const endPerf = performance.now()
    console.log('Seeding done! took ' + ((endPerf - startPerf) / 1000) + ' seconds!')
  }).catch(e => {
    console.log('Seeding fail with error: ', e)
  })
})

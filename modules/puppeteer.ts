import { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
const { performance } = require('perf_hooks')

// puppeteer.use(require('puppeteer-extra-plugin-anonymize-ua')())
puppeteer.use(StealthPlugin())

export enum ErrorString {
  // eslint-disable-next-line no-unused-vars
  INVALID_ID = 'invalid-id',
  // eslint-disable-next-line no-unused-vars
  OTHERS = 'others',
}

// do not change unless smile.one change !
const DIAMOND_IDENTIFIER = {
  86: {
    idx: 1,
    text: 'Diamond×78+8'
  },
  172: {
    idx: 2,
    text: 'Diamond×156+16'
  },
  257: {
    idx: 3,
    text: 'Diamond×234+23'
  },
  706: {
    idx: 4,
    text: 'Diamond×625+81'
  },
  2195: {
    idx: 5,
    text: 'Diamond×1860+335'
  },
  3688: {
    idx: 6,
    text: 'Diamond×3099+589'
  },
  5532: {
    idx: 7,
    text: 'Diamond×4649+883'
  },
  9288: {
    idx: 8,
    text: 'Diamond×7740+1548'
  },
  starlight: {
    idx: 9,
    text: 'Membro Estrela'
  },
  0: {
    idx: 10,
    text: 'Passagem do crepúsculo'
  },
  starlightplus: {
    idx: 11,
    text: 'Starlight Member Plus'
  }
}

const browserWidth = 1280
const browserHeight = 768

const puppeteerConfig = {
  // use default chromium-browser, rather than Puppeteer's chrome which might not work on the PI's ARM architecture.
  ...(process.env.NODE_ENV !== 'development' && { executablePath: 'chromium-browser' }),
  headless: process.env.PUPPETEER_HEADLESS !== 'false',
  args: [`--window-size=${browserWidth},${browserHeight}`, '--no-sandbox', '--disable-features=site-per-process']
}

async function screenshotDOMElement (page, opts: {path?: string, selector: string, padding?: number }) {
  // const padding = opts.padding !== undefined ? opts.padding : 0
  const path = 'path' in opts ? opts.path : null
  const selector = opts.selector

  if (!selector) { throw Error('Please provide a selector.') }

  const elementHandle = await page.$(selector)

  // const { x, y, width, height } = await elementHandle.boundingBox()

  return await elementHandle.screenshot({
    path,
    type: 'jpeg',
    quality: 70
    // clip: {
    //   x: x - padding,
    //   y: y - padding,
    //   width: width + padding * 2,
    //   height: height + padding * 2
    // }
  })
}

export async function getBankScreenshot (): Promise<{ status: string, message?: string, data: { fileBuffers?: Array<any> }}> {
  return new Promise((resolve, reject) => {
    let browser: Browser
    async function start () {
      const startTime = performance.now()

      try {
        browser = await puppeteer.launch(puppeteerConfig)
      } catch (err) {
        resolve({
          status: 'fail',
          message: err.message,
          data: {}
        })
      }

      async function maybankPersonalSS () {
        try {
          const maybankPage = await browser.newPage()
          await maybankPage.setViewport({
            width: browserWidth,
            height: browserHeight
          })

          let retryCount = 0
          let successfullyLoaded = false

          while (!successfullyLoaded) {
            try {
              await maybankPage.goto('https://www.maybank2u.com.my/home/m2u/common/login.do', {
                waitUntil: 'networkidle0',
                timeout: 15000
              })
              successfullyLoaded = true
            } catch (err) {
              console.log(err)

              if (retryCount < 5) {
                console.log(`Retrying ${retryCount + 1} time...`)
                retryCount++
              } else {
                throw err
              }
            }
          }

          await maybankPage.type('#username', process.env.MBB_ID as any, { delay: 10 })

          await maybankPage.click('.LoginUsername---login-button---3Fl8E.LoginUsername---login-input-button---3yVaU')

          await maybankPage.waitForSelector('#root > div > div > div.Header---container---kBsDt > div:nth-child(2) > div > div > div > div > div:nth-child(2) > div.modal-footer > div > div.col-lg-6.col-md-6.col-sm-6.col-xs-12.SecurityPhrase---right-btn-container---32k8- > button', { visible: true })

          await maybankPage.waitForTimeout(200)

          await maybankPage.click('#root > div > div > div.Header---container---kBsDt > div:nth-child(2) > div > div > div > div > div:nth-child(2) > div.modal-footer > div > div.col-lg-6.col-md-6.col-sm-6.col-xs-12.SecurityPhrase---right-btn-container---32k8- > button')

          await maybankPage.waitForTimeout(200)

          await maybankPage.type('#my-password-input', process.env.MBB_PASSWORD as any, { delay: 10 })

          await Promise.all([
            maybankPage.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for login to dashboard')),
            maybankPage.waitForSelector('#scrollToDashboard > div.Dashboard---container---2yC4Z > div.Dashboard---contentContainer---1JCRb > div:nth-child(3) > div.Dashboard---backgroundTile---LJ_N1 > div > div:nth-child(1) > div > div > div:nth-child(2) > div', { visible: true }),
            maybankPage.click('#root > div > div > div.Header---container---kBsDt > div:nth-child(2) > div > div > div > div > div:nth-child(2) > div.modal-footer > div > div.col-lg-5.col-md-5.col-sm-5.col-xs-12.SecurityPhrase---right-btn-container---32k8- > button')
          ])

          await maybankPage.waitForTimeout(200)

          await Promise.all([
            maybankPage.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for loading account history')),
            maybankPage.click('#scrollToDashboard > div.Dashboard---container---2yC4Z > div.Dashboard---contentContainer---1JCRb > div:nth-child(3) > div.Dashboard---backgroundTile---LJ_N1 > div > div:nth-child(1) > div > div > div:nth-child(2) > div')
          ])

          await maybankPage.waitForTimeout(500)

          const fileBuffer = await screenshotDOMElement(maybankPage, {
            selector: '.details---contentContainer---1GjpS'
          })

          console.log('Maybank personal screenshot successful !!')
          console.log('Time taken for the whole process: ', ((performance.now() - startTime) / 1000).toFixed(3), ' sec')

          await maybankPage.close()

          return {
            status: 'success',
            data: {
              fileBuffer
            }
          }
        } catch (err) {
          console.log('Maybank personal screenshot failed !!')
          console.log(err)

          return {
            status: 'fail',
            message: err.message,
            data: {}
          }
        }
      }

      async function maybankBusinessSS () {
        console.log('Start to get maybank business acc screenshot...')
        try {
          const maybankPage = await browser.newPage()
          await maybankPage.setViewport({
            width: browserWidth,
            height: browserHeight
          })

          let retryCount = 0
          let successfullyLoaded = false

          while (!successfullyLoaded) {
            try {
              await maybankPage.goto('https://www.maybank2u.com.my/mbb/m2u/common/M2ULogin.do?action=Login', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
              })
              successfullyLoaded = true
            } catch (err) {
              console.log(err)

              if (retryCount < 5) {
                console.log(`Retrying ${retryCount + 1} time...`)
                retryCount++
              } else {
                throw err
              }
            }
          }

          const iframeHandle = await maybankPage.$('html > frameset > frame')

          if (iframeHandle === null) {
            throw new Error('iFrame not found')
          }

          const frame = await iframeHandle.contentFrame()

          if (frame === null) {
            throw new Error('Frame not found')
          }

          await frame.waitForNavigation({
            waitUntil: 'networkidle2'
          }).catch(() => new Error('Timeout waiting for login iframe to load'))

          await frame.waitForTimeout(100)

          await frame.type('#input-rounded', process.env.MBB_BUSINESS_ID as any, { delay: 10 })

          await frame.waitForTimeout(50)

          await Promise.all([
            frame.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for avatar confirmation button')),
            frame.waitForSelector('#login > div.loginMainCanvas > div.paddingdiv > form > div > table > tbody > tr > td:nth-child(5)', { visible: true }),
            frame.click('#replacement-4')
          ])

          await frame.waitForTimeout(50)

          await Promise.all([
            frame.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for login password input')),
            frame.waitForSelector('#input-rounded', { visible: true }),
            frame.click('#login > div.loginMainCanvas > div.paddingdiv > form > div > table > tbody > tr > td:nth-child(5)')
          ])

          await frame.waitForTimeout(50)

          await frame.type('#input-rounded', process.env.MBB_BUSINESS_PASSWORD as any, { delay: 10 })

          await Promise.all([
            frame.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for login to dashboard')),
            frame.waitForSelector('#mainNav > li.mNav2 > a', { visible: true }),
            frame.click('#replacement-1')
          ])

          console.log('Logged into maybank business acc...')

          await frame.waitForTimeout(1000)

          const popupShown = await frame.$('#cboxClose')

          if (popupShown) {
            console.log('Popup detected, closing...')
            await frame.click('#cboxClose')
          }

          await frame.waitForTimeout(1500)

          await Promise.all([
            frame.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for loading account tab')),
            frame.waitForSelector('#mainContent > div.tableWrap > table > tbody > tr > td.account > a', { visible: true }),
            frame.click('#mainNav > li.mNav2 > a')
          ])

          await frame.waitForTimeout(50)

          await Promise.all([
            frame.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for loading account details page')),
            frame.waitForSelector('#mainContent > ul > li.tLink5 > a', { visible: true }),
            frame.click('#mainContent > div.tableWrap > table > tbody > tr > td.account > a')
          ])

          await frame.waitForTimeout(50)

          await Promise.all([
            frame.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout waiting for loading account history page')),
            frame.waitForSelector('#mainContent > div', { visible: true }),
            frame.click('#mainContent > ul > li.tLink5 > a')
          ])

          await frame.waitForTimeout(100)

          const fileBuffer = await screenshotDOMElement(frame, {
            selector: '#mainContent > div'
          })

          await maybankPage.close()

          console.log('Maybank business screenshot successful !!')
          console.log('Time taken for the whole process: ', ((performance.now() - startTime) / 1000).toFixed(3), ' sec')
          return {
            status: 'success',
            message: '',
            data: {
              fileBuffer
            }
          }
        } catch (err) {
          console.log('Maybank business screenshot failed !!')
          console.log(err)

          return {
            status: 'fail',
            message: err.message,
            data: {}
          }
        }
      }

      const result = await Promise.all([
        maybankBusinessSS()
        // maybankPersonalSS()
      ])

      await browser.close()

      const mappedResult = result.reduce((acc, res) => {
        if (res.status === 'success') {
          acc.status = 'success'
          acc.data.fileBuffers.push(res.data.fileBuffer)
        }

        acc.message = res.message

        return acc
      }, {
        status: 'fail',
        message: '',
        data: {
          fileBuffers: [] as Array<any>
        }
      })

      resolve(mappedResult)
    }

    start()
  })
}

export async function sendMLBBDiamond (allOrder: Array<any> = []): Promise<{
  orders: Array<{
    idx: number,
    id: string,
    server: string,
    amount: number
  }>,
  successfulOrders: Array<{
    idx: number,
    id: string,
    server: string,
    amount: number
  }>,
  failedOrders: Array<{
    idx: number,
    id: string,
    server: string,
    amount: number,
    err: string
  }>,
  message?: string
}> {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()

    const successfulOrders: any = []
    const failedOrders: any = []

    const mappedOrders = allOrder.map((data, idx) => ({ ...data, idx }))

    let browser: Browser

    async function processOrder () {
      try {
        browser = await puppeteer.launch(puppeteerConfig)
        console.log('Order to process: ', mappedOrders)

        const smileLoginPage = await browser.newPage()
        await smileLoginPage.setViewport({
          width: browserWidth,
          height: browserHeight
        })

        console.log('Opening login page...')

        let retryCount = 0
        let successfullyLoaded = false

        while (!successfullyLoaded) {
          try {
            await smileLoginPage.goto('https://www.smile.one/customer/account/login', {
              waitUntil: 'networkidle0',
              timeout: 15000
            })
            successfullyLoaded = true
          } catch (err) {
            console.log(err)
            await smileLoginPage.waitForTimeout(1500)
            if (retryCount < 5) {
              console.log(`Retrying ${retryCount + 1} time...`)
              retryCount++
            } else {
              throw err
            }
          }
        }

        await smileLoginPage.waitForSelector('#login-form > div > div > div.cont-login > div.formas.google.login_method_m.google_login', { visible: true })

        console.log('Click login with google ...')

        const [googleAuthPopupPage] = await Promise.all([
          new Promise((resolve, reject) => {
            const timeOut = setTimeout(() => {
              reject(new Error('Timeout waiting for google auth page to popup'))
            }, 10000)

            smileLoginPage.once('popup', page => {
              clearTimeout(timeOut)
              resolve(page)
            })
          }),
          smileLoginPage.click('#login-form > div > div > div.cont-login > div.formas.google.login_method_m.google_login')
        ]) as Array<Page>

        await smileLoginPage.close()

        const googleAuthPage = await browser.newPage()

        await googleAuthPage.setViewport({
          width: browserWidth,
          height: browserHeight
        })

        console.log('Google auth URL: ', googleAuthPopupPage.url())

        await googleAuthPage.goto(googleAuthPopupPage.url(), {
          waitUntil: 'networkidle0'
        })

        googleAuthPopupPage.close()

        await googleAuthPage.waitForTimeout(500)

        console.log('Entering google id...')

        await googleAuthPage.type('#identifierId', process.env.SMILEONE_GOOGLE_ID as any, { delay: 60 })

        await Promise.all([
          googleAuthPage.waitForNavigation({
            waitUntil: 'networkidle0'
          }).catch(() => new Error('Timeout after entering google auth email')),
          googleAuthPage.click('#identifierNext'),
          googleAuthPage.waitForSelector('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', { visible: true }),
          googleAuthPage.waitForTimeout(200)
        ])

        console.log('Entering google password...')

        await googleAuthPage.type('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', process.env.SMILEONE_GOOGLE_PW as any, { delay: 60 })

        console.log('Waiting for google auth popup page to close')

        await Promise.all([
          googleAuthPage.waitForNavigation({
            waitUntil: 'networkidle0'
          }).catch(() => new Error('Timeout after entering google auth password')),
          googleAuthPage.click('#passwordNext')
        ])

        await googleAuthPage.waitForTimeout(300)

        if (googleAuthPage.url().includes('https://www.smile.one/customer/google/loginv')) {
          // login success
          console.log('Google login success')
        } else {
          // 'https://accounts.google.com/signin/v2/challenge' <--- when additional verification needed
          console.log('Waiting for verification to be successful and be redirected')

          await googleAuthPage.waitForNavigation({
            waitUntil: 'networkidle0'
          }).catch(() => new Error('Google login additional security verification failed ( timeout after 40 second )'))
        }

        console.log('Google verification and login success')

        await googleAuthPage.close()

        console.log('Opening diamond page...')

        mappedOrders.forEach(async orderData => {
          const mlbbDiamondPage = await browser.newPage()

          mlbbDiamondPage.once('dialog', async dialog => {
            const dialogMsg = dialog.message()
            console.log(`[${orderData.id}] (ERR) Dialog shown with message: ${dialogMsg}`)

            const alreadyExist = failedOrders.some(fail => fail.idx === orderData.idx)
            if (!alreadyExist) {
              if (dialogMsg.includes('exist')) {
                failedOrders.push({
                  ...orderData,
                  err: 'ID does not exist'
                })
              } else {
                failedOrders.push({
                  ...orderData,
                  err: `Other error message from Smile.One popup: ${dialogMsg}`
                })
              }
            }

            await dialog.dismiss()
            mlbbDiamondPage.close()
          })

          try {
            await mlbbDiamondPage.goto('https://www.smile.one/merchant/mobilelegends', {
              waitUntil: 'networkidle2'
            })

            console.log(`[${orderData.id}] Opening page to process: ${orderData.id} - ${orderData.server} | ${orderData.amount}`)

            await mlbbDiamondPage.waitForTimeout(250)

            // This is to close any stupid popup modal
            await mlbbDiamondPage.mouse.click(0, 0)
            await mlbbDiamondPage.mouse.click(0, 0)

            await mlbbDiamondPage.waitForTimeout(250)

            console.log(`[${orderData.id}] Entering ID...`)
            await mlbbDiamondPage.type('#puseid', orderData.id.toString(), { delay: 15 })

            console.log(`[${orderData.id}] Entering Server...`)
            await mlbbDiamondPage.type('#pserverid', orderData.server.toString(), { delay: 15 })

            await mlbbDiamondPage.waitForTimeout(100)

            console.log(`[${orderData.id}] Verifying Diamond / Package exist and selected correctly: ${orderData.amount}`)
            const diamondBtn = await mlbbDiamondPage.$(`body > div.main-container > div.container > div > div.pc-content > div.pc-contain > div.pc-diamant > ul > li:nth-child(${DIAMOND_IDENTIFIER[orderData.amount].idx}) > .DiamantPrice`)
            const textContent = await diamondBtn?.evaluate(el => el.innerText.replace(/[ \n]*/g, ''))
            console.log('Clicked button val: ', textContent, DIAMOND_IDENTIFIER[orderData.amount].text)
            if (diamondBtn && textContent && textContent.length > 0 && textContent === DIAMOND_IDENTIFIER[orderData.amount].text) {
              await mlbbDiamondPage.waitForTimeout(100)
              console.log(`[${orderData.id}] Verify Diamond / Package successful: ${orderData.amount}`)

              console.log(`[${orderData.id}] Selected Diamond / Package: ${orderData.amount}`)

              await diamondBtn.click()

              await mlbbDiamondPage.waitForTimeout(100)

              const selectedDiamondBtn = await mlbbDiamondPage.$('body > div.main-container > div.container > div > div.pc-content > div.pc-contain > div.pc-diamant > ul > li.active > .DiamantPrice')
              const selectedTextContext = await selectedDiamondBtn?.evaluate(el => el.innerText.replace(/[ \n]*/g, ''))

              if (!(selectedDiamondBtn && selectedTextContext && selectedTextContext.length > 0 && selectedTextContext === DIAMOND_IDENTIFIER[orderData.amount].text)) {
                throw new Error('Selected wrong diamond amount on Smile.One !! STOP USING THE SYSTEM AND PROCESS MANUALLY UNTIL PROBLEM RESOLVED !! ')
              }

              console.log(`[${orderData.id}] Diamond / Package selected correctly: ${orderData.amount}`)

              await mlbbDiamondPage.waitForTimeout(100)

              await mlbbDiamondPage.click('body > div.main-container > div.container > div > div.pc-content > div.pc-contain > div.pc-nav > div > div.sectionNav-list > div.sectionNav-cartao.smilecoin > p')
              console.log(`[${orderData.id}] Selected Smile Coin payment method...`)

              await mlbbDiamondPage.waitForTimeout(100)

              await Promise.all([
                mlbbDiamondPage.waitForNavigation({
                  waitUntil: 'networkidle0'
                }).catch(() => new Error('Timeout after clicked pay ! Check Smile.one order history !( timeout after 40 second )')),
                // IMPORTANT: click on pay button
                mlbbDiamondPage.click('#Nav-btnpc')
              ])

              await mlbbDiamondPage.waitForTimeout(200)

              console.log('After Payment URL: ', mlbbDiamondPage.url(), mlbbDiamondPage.url().includes('https://www.smile.one/message/success'))

              if (mlbbDiamondPage.url().includes('https://www.smile.one/message/success')) {
                successfulOrders.push(orderData)
                console.log(`[${orderData.id}] Order completed successfully ^_^ !`)
              } else if (mlbbDiamondPage.url().includes('https://www.smile.one/customer/recharge')) {
                throw new Error('Not enough smile coins to buy diamond !')
              } else {
                throw new Error(`Redirected to random URL, check Smile.One order history ! URL: ${mlbbDiamondPage.url()}`)
              }

              mlbbDiamondPage.close()
            } else {
              console.log(`[${orderData.id}] (ERR) Fail to verify Diamond / Package for : ${orderData.id} - ${orderData.server} | ${orderData.amount}... skipping`)
              throw new Error('Fail to confirm that the clicked diamond amount is correct, maybe MLBB updated their diamond amount / price')
            }
          } catch (e) {
            console.log(`[${orderData.id}] (ERR) Process error with message: ${e}`)

            const alreadyExist = failedOrders.some(fail => fail.idx === orderData.idx)
            if (!alreadyExist) {
              failedOrders.push({
                ...orderData,
                err: e.message
              })
            }
            mlbbDiamondPage.close()
          }
        })

        let interval: any = () => {}
        let timeout: any = () => {}

        function closeBrowser (message = '') {
          browser.close()
          clearInterval(interval)
          clearTimeout(timeout)
          console.log('Time taken for the whole process: ', ((performance.now() - startTime) / 1000).toFixed(3), ' sec')
          resolve({
            orders: mappedOrders,
            successfulOrders,
            failedOrders,
            message
          })
        }

        interval = setInterval(async () => {
          if (successfulOrders.length + failedOrders.length >= mappedOrders.length) {
            console.log('----------------- All order ----------------------------- ')
            mappedOrders.forEach(all => {
              console.log(`ID: ${all.id} (${all.server})`)
              console.log(`DM: ${all.amount}`)
              console.log('________________________________')
            })
            console.log('----------------- Successful order ----------------------- ')
            successfulOrders.forEach(successful => {
              console.log(`ID: ${successful.id} (${successful.server})`)
              console.log(`DM: ${successful.amount}`)
              console.log('________________________________')
            })
            console.log('----------------- Failed order --------------------------- ')
            failedOrders.forEach(failed => {
              console.log(`ID: ${failed.id} (${failed.server})`)
              console.log(`DM: ${failed.amount}`)
              console.log(`REASON: ${failed.err}`)
              console.log('________________________________')
            })
            console.log('----------------- End of order --------------------------- ')

            closeBrowser(failedOrders.length > 0 ? failedOrders[0].err : '')
          }
        }, 1000)
        timeout = setTimeout(() => {
          closeBrowser('Puppeteer timeout after 3 minutes')
        }, 180000)
      } catch (e) {
        console.error(e)

        console.log('Unexpected puppeteer error !!')

        browser.close()

        resolve({
          orders: mappedOrders,
          successfulOrders,
          failedOrders,
          message: e.message
        })
      }
    }

    processOrder()
  })
}

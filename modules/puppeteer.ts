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
    pid: 13,
    text: 'Diamond×78+8'
  },
  172: {
    idx: 2,
    pid: 23,
    text: 'Diamond×156+16'
  },
  257: {
    idx: 3,
    pid: 25,
    text: 'Diamond×234+23'
  },
  706: {
    idx: 4,
    pid: 26,
    text: 'Diamond×625+81'
  },
  2195: {
    idx: 5,
    pid: 27,
    text: 'Diamond×1860+335'
  },
  3688: {
    idx: 6,
    pid: 28,
    text: 'Diamond×3099+589'
  },
  5532: {
    idx: 7,
    pid: 29,
    text: 'Diamond×4649+883'
  },
  9288: {
    idx: 8,
    pid: 30,
    text: 'Diamond×7740+1548'
  },
  starlight: {
    idx: 9,
    pid: 32,
    text: 'Membro Estrela'
  },
  0: {
    idx: 10,
    pid: 33,
    text: 'Passagem do crepúsculo'
  },
  starlightplus: {
    idx: 11,
    pid: 34,
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

let sharedBrowser: Browser

export async function initSharedBrowser () {
  try {
    sharedBrowser = await puppeteer.launch(puppeteerConfig)

    // login smile.one once during intialization
    const page = await sharedBrowser.newPage()

    await page.setViewport({
      width: browserWidth,
      height: browserHeight
    })

    const googleAuthURL = 'https://accounts.google.com/o/oauth2/auth/identifier?response_type=code&redirect_uri=https%3A%2F%2Fwww.smile.one%2Fcustomer%2Fgoogle%2Floginv&client_id=198333726333-tpjiv3fnii5pg0tmmnogp0g8ct7fhl3b.apps.googleusercontent.com&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&access_type=offline&approval_prompt=auto&flowName=GeneralOAuthFlow'

    console.log('Google auth URL: ', googleAuthURL)

    await page.goto(googleAuthURL, {
      waitUntil: 'networkidle0'
    })

    await page.waitForTimeout(200)

    if (page.url().includes('https://www.smile.one/customer/google/loginv')) {
      // login success
      console.log('Already logged in previously...')
    } else {
      console.log('Entering google id...')

      await page.type('#identifierId', process.env.SMILEONE_GOOGLE_ID as any, { delay: 60 })

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle0'
        }).catch(() => new Error('Timeout after entering google auth email')),
        page.click('#identifierNext'),
        page.waitForSelector('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', { visible: true })
      ])

      page.waitForTimeout(200)

      console.log('Entering google password...')

      await page.type('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', process.env.SMILEONE_GOOGLE_PW as any, { delay: 60 })

      console.log('Waiting for google auth popup page to close')

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle2'
        }).catch(() => new Error('Timeout after entering google auth password')),
        page.click('#passwordNext')
      ])

      await page.waitForTimeout(100)

      if (page.url().includes('https://www.smile.one/customer/google/loginv')) {
        // login success
        console.log('Google login success')
      } else {
        // 'https://accounts.google.com/signin/v2/challenge' <--- when additional verification needed
        console.log('Waiting for verification to be successful and be redirected')

        await page.waitForNavigation({
          waitUntil: 'networkidle0'
        }).catch(() => new Error('Google login additional security verification failed ( timeout after 40 second )'))
      }

      console.log('Google verification and login success')
    }

    await page.close()

    await getBackstreetGamerData()
  } catch (err) {
    console.log('Shared browser initialization failed ... !! ', err)
  }
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

export async function getBankScreenshot (): Promise<{ status: string, message?: string, data: { fileBuffers?: Array<any>, currentBalance: string }}> {
  return new Promise((resolve, reject) => {
    let browser: Browser
    const allBrowserPage: Array<Page> = []

    async function start () {
      const startTime = performance.now()

      try {
        browser = await getBrowser(sharedBrowser)
        sharedBrowser = browser
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
          allBrowserPage.push(maybankPage)

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
          allBrowserPage.push(maybankPage)

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

          const currentBalanceElem = await frame.waitForSelector('#mainContent > div.tableWrap > table > tbody > tr > td:nth-child(2)')

          const currentBalance = await currentBalanceElem?.evaluate(el => el.innerText.replace(/[RMrm,]*/g, ''))

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
              fileBuffer,
              currentBalance
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

      // await browser.close()
      allBrowserPage.forEach(pageInstance => pageInstance.isClosed() ? '' : pageInstance.close())

      const mappedResult = result.reduce((acc, res) => {
        if (res.status === 'success') {
          acc.status = 'success'
          acc.data.fileBuffers.push(res.data.fileBuffer)
          acc.data.currentBalance = res.data.currentBalance
        }

        acc.message = res.message

        return acc
      }, {
        status: 'fail',
        message: '',
        data: {
          fileBuffers: [] as Array<any>,
          currentBalance: ''
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
    const allBrowserPage: Array<Page> = []

    let browser: Browser

    async function processOrder () {
      try {
        browser = await getBrowser(sharedBrowser)
        sharedBrowser = browser

        console.log('Order to process: ', mappedOrders)

        const googleAuthPage = await browser.newPage()
        allBrowserPage.push(googleAuthPage)

        await googleAuthPage.setViewport({
          width: browserWidth,
          height: browserHeight
        })

        const googleAuthURL = 'https://accounts.google.com/o/oauth2/auth/identifier?response_type=code&redirect_uri=https%3A%2F%2Fwww.smile.one%2Fcustomer%2Fgoogle%2Floginv&client_id=198333726333-tpjiv3fnii5pg0tmmnogp0g8ct7fhl3b.apps.googleusercontent.com&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&access_type=offline&approval_prompt=auto&flowName=GeneralOAuthFlow'

        console.log('Google auth URL: ', googleAuthURL)

        await googleAuthPage.goto(googleAuthURL, {
          waitUntil: 'networkidle0'
        })

        await googleAuthPage.waitForTimeout(200)

        if (googleAuthPage.url().includes('https://www.smile.one/customer/google/loginv')) {
          // login success
          console.log('Already logged in previously...')
        } else {
          console.log('Entering google id...')

          await googleAuthPage.type('#identifierId', process.env.SMILEONE_GOOGLE_ID as any, { delay: 60 })

          await Promise.all([
            googleAuthPage.waitForNavigation({
              waitUntil: 'networkidle0'
            }).catch(() => new Error('Timeout after entering google auth email')),
            googleAuthPage.click('#identifierNext'),
            googleAuthPage.waitForSelector('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', { visible: true })
          ])

          googleAuthPage.waitForTimeout(200)

          console.log('Entering google password...')

          await googleAuthPage.type('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', process.env.SMILEONE_GOOGLE_PW as any, { delay: 60 })

          console.log('Waiting for google auth popup page to close')

          await Promise.all([
            googleAuthPage.waitForNavigation({
              waitUntil: 'networkidle2'
            }).catch(() => new Error('Timeout after entering google auth password')),
            googleAuthPage.click('#passwordNext')
          ])

          await googleAuthPage.waitForTimeout(100)

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
        }

        // const pageCookies = await googleAuthPage._client.send('Network.getAllCookies')
        // const cookiePHPSESSID = pageCookies.cookies.find(cookie => cookie.domain === 'www.smile.one' && cookie.name === 'PHPSESSID')
        // console.log(pageCookies, cookiePHPSESSID)

        await googleAuthPage.close()

        console.log('Opening diamond page...')

        mappedOrders.forEach(async (orderData, index) => {
          const waitTime = index * 10 * 1000

          await new Promise((resolve) => {
            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] wait for ${waitTime / 1000} seconds...`)
            setTimeout(resolve, waitTime)
          })

          const mlbbDiamondPage = await browser.newPage()
          allBrowserPage.push(mlbbDiamondPage)

          // last time they use this popup
          mlbbDiamondPage.once('dialog', async dialog => {
            const dialogMsg = dialog.message()
            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] (ERR) Dialog shown with message: ${dialogMsg}`)

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
                  err: `Error popup shown, message: ${dialogMsg}`
                })
              }
            }

            await dialog.dismiss()
            mlbbDiamondPage.close().catch(() => {})
          })

          // now they use custom popup
          mlbbDiamondPage
            .waitForSelector('.smileOneAlert-popUpbody')
            .then(async e => {
              const popupTextContent = await e?.evaluate(el => el.innerText.replace(/[ \n]*/g, ''))

              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] (ERR) Dialog shown with message: ${popupTextContent}`)

              const alreadyExist = failedOrders.some(fail => fail.idx === orderData.idx)
              if (!alreadyExist) {
                if (popupTextContent.includes('exist')) {
                  failedOrders.push({
                    ...orderData,
                    err: 'ID does not exist'
                  })
                } else {
                  failedOrders.push({
                    ...orderData,
                    err: `Error popup shown, message: ${popupTextContent}`
                  })
                }
              }

              mlbbDiamondPage.close().catch(() => {})
            }).catch(() => {
              console.log('Custom modal listener terminated')
              return null
            })

          try {
            // console.log(`[${orderData.id} | ${index} | ${orderData.amount}] wait for ${waitTime / 1000} seconds...`)
            // await mlbbDiamondPage.waitForTimeout(waitTime)

            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Opening page to process: ${orderData.id} - ${orderData.server} | ${orderData.amount}`)
            await mlbbDiamondPage.goto('https://www.smile.one/merchant/mobilelegends', {
              waitUntil: 'networkidle2'
            })

            const userIdInput = await mlbbDiamondPage.$('#user_id')
            const userServerInput = await mlbbDiamondPage.$('#zone_id')

            // clear the original value inside, else it will somehow start to check id again and hang
            const userIdOriVal = await userIdInput?.evaluate(x => {
              const oriVal = x.value
              x.value = ''
              return oriVal
            })
            const userServerOriVal = await userServerInput?.evaluate(x => {
              const oriVal = x.value
              x.value = ''
              return oriVal
            })

            await mlbbDiamondPage.waitForTimeout(500)

            const popupElemCancel = await mlbbDiamondPage.$('#smileone-notifi-cancel')
            const isShown = await mlbbDiamondPage?.evaluate(() => {
              const btn = document.querySelector('#notifi_div')
              if (btn) {
                const styleString = getComputedStyle(btn)
                return styleString.display === 'block'
              } else {
                return false
              }
            })

            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] SPA popover show up? : ${isShown}`)
            if (isShown) {
              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Close SPA popover...`)
              await popupElemCancel?.click()
            }

            await mlbbDiamondPage.waitForTimeout(300)

            // This is to close any stupid popup modal
            await mlbbDiamondPage.mouse.click(0, 0)
            await mlbbDiamondPage.mouse.click(0, 0)

            await mlbbDiamondPage.waitForTimeout(300)

            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Previous ID server value... ${userIdOriVal} | ${userServerOriVal}`)

            // this is needed to highlight all previous input to replace it
            await userIdInput?.click({ clickCount: 4 })

            await mlbbDiamondPage.waitForTimeout(50)

            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Entering ID...`)
            await mlbbDiamondPage.type('#user_id', orderData.id.toString(), { delay: 30 })

            // this is needed to highlight all previous input to replace it
            await userServerInput?.click({ clickCount: 4 })

            await mlbbDiamondPage.waitForTimeout(100)

            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Entering Server...`)
            await mlbbDiamondPage.type('#zone_id', orderData.server.toString(), { delay: 30 })

            await mlbbDiamondPage.waitForTimeout(200)

            await mlbbDiamondPage.mouse.click(0, 0)
            await mlbbDiamondPage.mouse.click(0, 0)
            await mlbbDiamondPage.mouse.click(0, 0)

            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Verify amount exist: ${orderData.amount}`)
            const diamondBtn = await mlbbDiamondPage.$(`body > div.main-container > div.mainContainer > div > div.prdctCol1 > div.box2 > div > ul > li:nth-child(${DIAMOND_IDENTIFIER[orderData.amount].idx})`)
            const textContent = await diamondBtn?.evaluate(el => el.innerText.replace(/[ \n]*/g, ''))

            if (diamondBtn && textContent && textContent.length > 0 && textContent.includes(DIAMOND_IDENTIFIER[orderData.amount].text)) {
              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Amount exist: ${textContent}`)

              try {
                await mlbbDiamondPage.waitForSelector('body > div.smileOneAlert-popUpShadowArea', {
                  visible: true,
                  timeout: 10000
                })

                await mlbbDiamondPage.waitForSelector('body > div.smileOneAlert-popUpShadowArea', {
                  hidden: true,
                  timeout: 20000
                })
              } catch (err) {
                console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Wait for ID check on entering ID but didn't hapen or timeout...`)
              }

              await mlbbDiamondPage.waitForTimeout(300)

              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Select amount: ${orderData.amount}`)

              await diamondBtn.click()

              await mlbbDiamondPage.waitForTimeout(200)

              const selectedDiamondBtn = await mlbbDiamondPage.$('body > div.main-container > div.mainContainer > div > div.prdctCol1 > div.box2 > div > ul > li.active')
              const selectedTextContext = await selectedDiamondBtn?.evaluate(el => el.innerText.replace(/[ \n]*/g, ''))

              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Verify amount selection: `, DIAMOND_IDENTIFIER[orderData.amount].text, selectedTextContext, selectedTextContext.includes(DIAMOND_IDENTIFIER[orderData.amount].text))

              if (!(selectedDiamondBtn && selectedTextContext && selectedTextContext.length > 0 && selectedTextContext.includes(DIAMOND_IDENTIFIER[orderData.amount].text))) {
                throw new Error('Selected wrong diamond amount on Smile.One !! STOP USING THE SYSTEM AND PROCESS MANUALLY UNTIL PROBLEM RESOLVED !! ')
              }

              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Amount selection verified: ${orderData.amount}`)

              await mlbbDiamondPage.waitForTimeout(100)

              await mlbbDiamondPage.click('body > div.main-container > div.mainContainer > div > div.prdctCol1 > div.box3 > div > div > div.sectionNav-list > div.sectionNav-cartao.smilecoin > span.cartao-logo.logo-fc')

              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Select payment method...`)

              await mlbbDiamondPage.waitForTimeout(100)

              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Click pay...`)

              await Promise.all([
                mlbbDiamondPage.waitForNavigation({
                  waitUntil: 'networkidle2'
                }).catch(() => new Error('Timeout after clicked pay ! Check Smile.one order history !( timeout after 40 second )')),
                // IMPORTANT: click on pay button
                mlbbDiamondPage.click('body > div.main-container > div.mainContainer > div > div.prdctCol1 > div.box3 > div > div > div.sectionNav-list > div.Nav-btn')
              ])

              await mlbbDiamondPage.waitForTimeout(200)

              console.log('After Payment URL: ', mlbbDiamondPage.url(), mlbbDiamondPage.url().includes('https://www.smile.one/message/success'))

              if (mlbbDiamondPage.url().includes('https://www.smile.one/message/success')) {
                successfulOrders.push(orderData)
                console.log(`[${orderData.id} | ${index} | ${orderData.amount}] Order completed successfully ^_^ !`)
              } else if (mlbbDiamondPage.url().includes('https://www.smile.one/customer/recharge')) {
                throw new Error('Not enough smile coins to buy diamond !')
              } else {
                throw new Error(`Redirected to random URL, check Smile.One order history ! URL: ${mlbbDiamondPage.url()}`)
              }

              mlbbDiamondPage.close().catch(() => {})
            } else {
              console.log(`[${orderData.id} | ${index} | ${orderData.amount}] (ERR) Fail to verify Diamond / Package for : ${orderData.id} - ${orderData.server} | ${orderData.amount}... skipping`)
              throw new Error('Fail to confirm that the clicked diamond amount is correct, maybe MLBB updated their diamond amount / price')
            }
          } catch (e) {
            console.log(`[${orderData.id} | ${index} | ${orderData.amount}] (ERR) Process error with message: ${e}`)

            const alreadyExist = failedOrders.some(fail => fail.idx === orderData.idx)
            if (!alreadyExist) {
              failedOrders.push({
                ...orderData,
                err: e.message
              })
            }

            mlbbDiamondPage.close().catch(() => {})
          }
        })

        let interval: any = () => {}
        let timeout: any = () => {}

        function closeBrowser (message = '') {
          // browser.close()
          allBrowserPage.forEach(pageInstance => pageInstance.isClosed() ? '' : pageInstance.close())

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
              console.log(' ')
            })
            console.log('----------------- Successful order ----------------------- ')
            successfulOrders.forEach(successful => {
              console.log(`ID: ${successful.id} (${successful.server})`)
              console.log(`DM: ${successful.amount}`)
              console.log(' ')
            })
            console.log('----------------- Failed order --------------------------- ')
            failedOrders.forEach(failed => {
              console.log(`ID: ${failed.id} (${failed.server})`)
              console.log(`DM: ${failed.amount}`)
              console.log(`REASON: ${failed.err}`)
              console.log(' ')
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

        console.log('Unexpected puppeteer error. Message: ', e)

        // browser.close()
        allBrowserPage.forEach(pageInstance => pageInstance.isClosed() ? '' : pageInstance.close())

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

async function getBrowser (sharedBrowser: Browser | undefined = undefined) {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    console.log('Reuse existing shared browser !!!')
    return sharedBrowser
  } else {
    if (sharedBrowser && sharedBrowser.close) {
      await sharedBrowser.close()
      console.log('Close previous shared browser !!!')
    }

    console.log('Created a new shared browser !!!')
    return puppeteer.launch(puppeteerConfig)
  }
}

export async function getSmileOneData () {
  const allBrowserPage: Array<Page> = []
  try {
    const browser = await getBrowser(sharedBrowser)
    sharedBrowser = browser

    const page = await browser.newPage()
    allBrowserPage.push(page)

    await page.setViewport({
      width: browserWidth,
      height: browserHeight
    })

    const googleAuthURL = 'https://accounts.google.com/o/oauth2/auth/identifier?response_type=code&redirect_uri=https%3A%2F%2Fwww.smile.one%2Fcustomer%2Fgoogle%2Floginv&client_id=198333726333-tpjiv3fnii5pg0tmmnogp0g8ct7fhl3b.apps.googleusercontent.com&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email&access_type=offline&approval_prompt=auto&flowName=GeneralOAuthFlow'

    console.log('Google auth URL: ', googleAuthURL)

    await page.goto(googleAuthURL, {
      waitUntil: 'networkidle0'
    })

    await page.waitForTimeout(200)

    if (page.url().includes('https://www.smile.one/customer/google/loginv')) {
      // login success
      console.log('Already logged in previously...')
    } else {
      console.log('Entering google id...')

      await page.type('#identifierId', process.env.SMILEONE_GOOGLE_ID as any, { delay: 60 })

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle0'
        }).catch(() => new Error('Timeout after entering google auth email')),
        page.click('#identifierNext'),
        page.waitForSelector('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', { visible: true })
      ])

      page.waitForTimeout(200)

      console.log('Entering google password...')

      await page.type('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', process.env.SMILEONE_GOOGLE_PW as any, { delay: 60 })

      console.log('Waiting for google auth popup page to close')

      await Promise.all([
        page.waitForNavigation({
          waitUntil: 'networkidle2'
        }).catch(() => new Error('Timeout after entering google auth password')),
        page.click('#passwordNext')
      ])

      await page.waitForTimeout(100)

      if (page.url().includes('https://www.smile.one/customer/google/loginv')) {
        // login success
        console.log('Google login success')
      } else {
        // 'https://accounts.google.com/signin/v2/challenge' <--- when additional verification needed
        console.log('Waiting for verification to be successful and be redirected')

        await page.waitForNavigation({
          waitUntil: 'networkidle0'
        }).catch(() => new Error('Google login additional security verification failed ( timeout after 40 second )'))
      }

      console.log('Google verification and login success')
    }

    await page.goto('https://www.smile.one/merchant/mobilelegends', {
      waitUntil: 'networkidle2'
    })

    await page.waitForTimeout(100)

    const pageCookies = await page._client.send('Network.getAllCookies')
    const cookiePHPSESSID = pageCookies.cookies.find(cookie => cookie.domain === 'www.smile.one' && cookie.name === 'PHPSESSID')
    const csrfInputElem = await page.$('input[name="_csrf"]')
    const csrf = await page.evaluate(x => x.value, csrfInputElem)

    // get https://www.smile.one/merchant/mobilelegends amount pid
    const pageAmountBtn = await page.$$('body > div.main-container > div.mainContainer > div > div.prdctCol1 > div.box2 > div > ul > li')
    const amountBtnData = await Promise.all(pageAmountBtn.map(li => {
      return li.evaluate(res => ({ id: res.id, text: res.textContent }))
    }))
    const productIdMap = Object.keys(DIAMOND_IDENTIFIER).reduce((acc: any, amount: any) => {
      const matchedElem = amountBtnData.find((btnData: any) => {
        return btnData.text.includes(DIAMOND_IDENTIFIER[amount].text)
      })

      acc[amount] = matchedElem && matchedElem.id
        ? {
            pid: matchedElem.id
          }
        : { pid: '' }

      return acc
    }, {})

    console.log('Cookie: ', cookiePHPSESSID?.value)
    console.log('CSRF: ', csrf)
    console.log('Product ID: ', productIdMap)

    if (Object.values(productIdMap).some((pidData: any) => pidData.pid === '')) {
      return {
        status: 'fail',
        phpsessid: cookiePHPSESSID?.value,
        csrf,
        productIdMap,
        message: 'some / all pid missing, smile.one might have made changes to their website ! Please check'
      }
    }

    if (!cookiePHPSESSID?.value) {
      return {
        status: 'fail',
        phpsessid: cookiePHPSESSID?.value,
        csrf,
        productIdMap,
        message: 'authentication cookie (PHPSESSID) missing, smile.one might have made changes to their website ! Please check'
      }
    }

    allBrowserPage.forEach(pageInstance => pageInstance.isClosed() ? '' : pageInstance.close())

    return {
      status: 'success',
      phpsessid: cookiePHPSESSID?.value,
      csrf,
      productIdMap
    }
  } catch (err) {
    console.log('Err: ', err)

    allBrowserPage.forEach(pageInstance => pageInstance.isClosed() ? '' : pageInstance.close())

    return {
      status: 'fail',
      phpsessid: null,
      csrf: null,
      productIdMap: {},
      message: err.message
    }
  }
}

export async function getBackstreetGamerData () {
  const allBrowserPage: Array<Page> = []
  try {
    console.log('Start to login BSG...')
    const browser = await getBrowser(sharedBrowser)
    sharedBrowser = browser

    const page = await browser.newPage()
    allBrowserPage.push(page)

    await page.setViewport({
      width: browserWidth,
      height: browserHeight
    })

    console.log('Load BSG login page...')

    await page.goto('https://backstreetgamer.com/login', {
      timeout: 90000,
      waitUntil: 'networkidle2'
    })

    await page.waitForTimeout(200)

    if (page.url().includes('/login')) {
      // login required

      console.log('Typing BSG ID...')
      await page.type('#sign_in_form > div:nth-child(1) > input.identity', process.env.BSG_ID as any, { delay: 30 })
      page.waitForTimeout(100)
      console.log('Typing BSG PW...')
      await page.type('#sign_in_form > div:nth-child(2) > input.password', process.env.BSG_PW as any, { delay: 30 })

      console.log('Logging in...')

      await page.click('#sign_in_form > div:nth-child(3) > input.form-submit-sign-in')

      console.log('Check login status...')

      const popupTextContent = await page.waitForSelector('body > div.sweet-alert.showSweetAlert.visible', { visible: true })
        .then(async e => {
          return await e?.evaluate(el => el.textContent)
        })

      if (popupTextContent.toLowerCase().indexOf('success') === -1) {
        throw new Error('Fail to login to BSG')
      }

      console.log('Login to Backstreet gamers successfully...')
    } else {
      console.log('Already logged in previously...')
    }

    await page.waitForTimeout(200)

    const pageCookies = await page._client.send('Network.getAllCookies')
    const cookieCISysSessions = pageCookies.cookies.find(cookie => cookie.domain === 'backstreetgamer.com' && cookie.name === 'ci_sys_sessions')

    if (!cookieCISysSessions?.value) {
      return {
        status: 'fail',
        ciSysSessions: cookieCISysSessions?.value,
        message: 'authentication cookie (ci_sys_sessions) missing, BSG might have made changes to their website ! Please check'
      }
    }

    allBrowserPage.forEach(pageInstance => pageInstance.isClosed() ? '' : pageInstance.close())

    return {
      status: 'success',
      ciSysSessions: cookieCISysSessions?.value
    }
  } catch (err) {
    console.log('Err: ', err)

    allBrowserPage.forEach(pageInstance => pageInstance.isClosed() ? '' : pageInstance.close())

    return {
      status: 'fail',
      ciSysSessions: null,
      message: err.message
    }
  }
}

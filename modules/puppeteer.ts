import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
const { performance } = require('perf_hooks');

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
    text: 'Diamond×86'
  },
  172: {
    idx: 2,
    text: 'Diamond×172'
  },
  257: {
    idx: 3,
    text: 'Diamond×257'
  },
  706: {
    idx: 4,
    text: 'Diamond×706'
  },
  2195: {
    idx: 5,
    text: 'Diamond×2195'
  },
  3688: {
    idx: 6,
    text: 'Diamond×3688'
  },
  5532: {
    idx: 7,
    text: 'Diamond×5532'
  },
  9288: {
    idx: 8,
    text: 'Diamond×9288'
  },
  starlight: {
    idx: 9,
    text: 'Membro Estrela'
  },
  twilight: {
    idx: 9,
    text: 'Passagem do crepúsculo'
  },
  starlightplus: {
    idx: 10,
    text: 'Starlight Member Plus'
  }
}

async function getNewPopupPageUrl(url, browser) {
  const pages = await browser.pages()
  let foundPageUrl = ''

  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i]
    if (page.url().includes(url)) {
      foundPageUrl = page.url()
      break
    }
  }
  return foundPageUrl
}

export async function sendDiamond(allOrder = [{
  id: 123123123,
  server: 1322,
  amount: 86
}]) {
  new Promise((resolve, reject) => {
    const startTime = performance.now()


    let foundPageUrl = ''

    const successfulOrder: any = []
    const failedOrder: any = []

    const mappedOrders = allOrder.map((data, idx) => ({ ...data, idx }))

    async function process() {
      const browserWidth = 1280
      const browserHeight = 768
      const browser = await puppeteer.launch({
        headless: true,
        args: [`--window-size=${browserWidth},${browserHeight}`, '--no-sandbox']
      } as any)

      await browser.on('targetcreated', async () => {
        if (!foundPageUrl) {
          console.log('Google auth popup shown...')
          foundPageUrl = await getNewPopupPageUrl('https://accounts.google.com/', browser)
        }
      })

      console.log('Script starting...')

      console.log('Order to process: ', mappedOrders)

      const page = await browser.newPage()
      await page.setViewport({
        width: browserWidth,
        height: browserHeight
      })

      console.log('Opening login page...')

      await page.goto('https://www.smile.one/customer/account/login', {
        waitUntil: 'networkidle0'
      })

      await page.waitForTimeout(200)

      await page.waitForSelector('#login-form > div > div > div.cont-login > div.formas.google.login_method_m.google_login', { visible: true })

      console.log('Click login with google ...')

      await page.click('#login-form > div > div > div.cont-login > div.formas.google.login_method_m.google_login')

      console.log('Waiting to get google sign in auth URL ...')

      await page.waitForTimeout(1000)

      const loginPage = await browser.newPage()

      await loginPage.setViewport({
        width: browserWidth,
        height: browserHeight
      })

      console.log('Opening google sign in auth url : ', foundPageUrl)

      await loginPage.goto(foundPageUrl, {
        waitUntil: 'networkidle2'
      })

      console.log('Entering id...')

      await loginPage.type('#identifierId', 'jominigaming@gmail.com', { delay: 80 })

      await Promise.all([
        loginPage.click('#identifierNext'),
        loginPage.waitForNavigation({
          waitUntil: 'networkidle0'
        }),
        loginPage.waitForSelector('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', { visible: true }),
        loginPage.waitForTimeout(1000)
      ])

      console.log('Entering password...')

      await loginPage.type('#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input', 'Jomini0428', { delay: 80 })

      await Promise.all([
        loginPage.click('#passwordNext'),
        loginPage.waitForNavigation({
          waitUntil: 'networkidle0'
        })
      ])

      await loginPage.close()

      console.log('Opening all diamond page...')

      mappedOrders.forEach(async orderData => {
        const reloadPage = await browser.newPage()

        try {
          reloadPage.once('dialog', async dialog => {
            const dialogMsg = dialog.message()
            console.log(`[${orderData.id}] (ERR) Dialog shown with message: ${dialogMsg}`)

            const alreadyExist = failedOrder.some(fail => fail.idx === orderData.idx)
            if (!alreadyExist) {
              if (dialogMsg.includes('exist')) {
                failedOrder.push({
                  ...orderData,
                  err: ErrorString.INVALID_ID
                })
              } else {
                failedOrder.push({
                  ...orderData,
                  err: ErrorString.OTHERS
                })
              }
            }

            await dialog.dismiss()
          })
        } catch (e) {
          console.log(`[${orderData.id}] (ERR) Dialog error with message: ${e}`)
          const alreadyExist = failedOrder.some(fail => fail.idx === orderData.idx)
          if (!alreadyExist) {
            failedOrder.push({
              ...orderData,
              err: ErrorString.OTHERS
            })
          }
        }

        try {
          await reloadPage.goto('https://www.smile.one/merchant/mobilelegends', {
            waitUntil: 'networkidle0'
          })

          console.log(`[${orderData.id}] Opening page to process: ${orderData.id} - ${orderData.server} | ${orderData.amount}`)

          console.log(`[${orderData.id}] Entering ID...`)
          await reloadPage.type('#puseid', orderData.id.toString(), { delay: 100 })

          console.log(`[${orderData.id}] Entering Server...`)
          await reloadPage.type('#pserverid', orderData.server.toString(), { delay: 100 })

          console.log(`[${orderData.id}] Verifying Diamond / Package: ${orderData.amount}`)
          const diamondbtn = await reloadPage.$(`body > mate > div.main-container > div.container > div > div.pc-content > div.pc-contain > div.pc-diamant > ul > li:nth-child(${DIAMOND_IDENTIFIER[orderData.amount].idx})`)
          const textContent = await diamondbtn?.$x(`//*[contains(text(), '${DIAMOND_IDENTIFIER[orderData.amount].text}')]`)

          if (diamondbtn && textContent && textContent.length > 0) {
            console.log(`[${orderData.id}] Verify Diamond / Package successful: ${orderData.amount}`)
            await diamondbtn.click()
            console.log(`[${orderData.id}] Selected Diamond / Package: ${orderData.amount}`)

            await reloadPage.click('body > mate > div.main-container > div.container > div > div.pc-content > div.pc-contain > div.pc-nav > div > div.sectionNav-list > div.sectionNav-cartao.smilecoin > p')
            console.log(`[${orderData.id}] Selected SmileCoin payment method...`)

            await reloadPage.waitForTimeout(1000)
            // IMPORTANT: click on pay button
            await reloadPage.click('#Nav-btnpc')
            console.log(`[${orderData.id}] Clicked pay !!!!`)

            await Promise.all([
              reloadPage.waitForTimeout(500),
              reloadPage.waitForNavigation({
                waitUntil: 'networkidle2'
              }),
              reloadPage.waitForSelector('body > div.main-container > div > div > div > div > div.btnsuccess')
            ])

            console.log(`[${orderData.id}] Order completed successfully ^_^ !`)
            successfulOrder.push(orderData)
          } else {
            console.log(`[${orderData.id}] (ERR) Fail to verify Diamond / Package for : ${orderData.id} - ${orderData.server} | ${orderData.amount}... skipping`)
          }
        } catch (e) {
          console.log(`[${orderData.id}] (ERR) Process error with message: ${e}`)

          const alreadyExist = failedOrder.some(fail => fail.idx === orderData.idx)
          if (!alreadyExist) {
            failedOrder.push({
              ...orderData,
              err: ErrorString.OTHERS
            })
          }
        }
      })

      let interval: any = () => { }
      let timeout: any = () => { }

      async function closeBrowser() {
        browser.close()
        clearInterval(interval)
        clearTimeout(timeout)
        console.log('Time taken for the whole process: ', (performance.now() - startTime / 1000).toFixed(3), ' sec')
        resolve({
          orders: mappedOrders,
          successfulOrder,
          failedOrder
        })
      }

      interval = setInterval(async () => {
        if (successfulOrder.length + failedOrder.length >= mappedOrders.length) {
          console.log('----------------- All order ----------------------------- ')
          mappedOrders.forEach(all => {
            console.log(`ID: ${all.id} (${all.server})`)
            console.log(`DM: ${all.amount}`)
            console.log('________________________________')
          })
          console.log('----------------- Successful order ----------------------- ')
          successfulOrder.forEach(successful => {
            console.log(`ID: ${successful.id} (${successful.server})`)
            console.log(`DM: ${successful.amount}`)
            console.log('________________________________')
          })
          console.log('----------------- Failed order --------------------------- ')
          failedOrder.forEach(failed => {
            console.log(`ID: ${failed.id} (${failed.server})`)
            console.log(`DM: ${failed.amount}`)
            console.log(`REASON: ${failed.err}`)
            console.log('________________________________')
          })

          await closeBrowser()
        }
      }, 1000)
      timeout = setTimeout(closeBrowser, 120000)
    }

    try {
      process()
    } catch (e) {
      console.error(e)
      console.log("Main catch error !!")
      resolve({
        orders: mappedOrders,
        successfulOrder,
        failedOrder
      })
    }
  })
}

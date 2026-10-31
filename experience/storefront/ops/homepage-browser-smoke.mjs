import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const chromiumPath = process.env.CHROMIUM_PATH
const baseUrl = process.env.AFX_BASE_URL ?? 'http://127.0.0.1:3000/'
const debugPort = Number(process.env.AFX_CDP_PORT ?? 9222)
const outputDir = process.env.AFX_ARTIFACT_DIR ?? 'artifacts/design-review'

assert.ok(chromiumPath, 'CHROMIUM_PATH must point to the installed Chromium executable')

const profileDir = await mkdtemp(join(tmpdir(), 'afx-homepage-browser-'))
const browser = spawn(chromiumPath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--remote-debugging-port=' + debugPort,
  '--user-data-dir=' + profileDir,
  'about:blank',
], { stdio: 'ignore' })

let socket
let nextId = 0
const pending = new Map()

function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error('CDP command timed out: ' + method))
    }, 15000)
    pending.set(id, {
      resolve(value) {
        clearTimeout(timeout)
        resolve(value)
      },
      reject(error) {
        clearTimeout(timeout)
        reject(error)
      },
    })
    socket.send(JSON.stringify({ id, method, params }))
  })
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? 'Browser evaluation failed')
  }
  return result.result?.value
}

async function waitForPage() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const state = await evaluate('({ready:document.readyState,hasMain:Boolean(document.querySelector("main")),hasHeading:Boolean(document.querySelector("main h1")),hasSearch:Boolean(document.querySelector("input[type=search]"))})')
      if (state.ready === 'complete' && state.hasMain && state.hasHeading && state.hasSearch) return
    } catch {
      // Navigation can replace the execution context; retry until it settles.
    }
    await delay(250)
  }
  throw new Error('Homepage did not become ready with its main heading and search control')
}

async function loadLocaleAndViewport(locale, width, height) {
  await send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 768,
  })
  await send('Network.setCookie', {
    name: 'afx-locale',
    value: locale,
    url: baseUrl,
    path: '/',
    sameSite: 'Lax',
  })
  await send('Page.navigate', { url: baseUrl })
  await waitForPage()
  return evaluate('({viewportWidth:window.innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,documentHeight:document.documentElement.scrollHeight,direction:document.documentElement.dir,language:document.documentElement.lang,heading:document.querySelector("main h1")?.innerText ?? "",searchVisible:Boolean(document.querySelector("input[type=search]")?.getBoundingClientRect().width)})')
}

async function waitForDialog(expectedText) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const dialog = await evaluate('(() => { const el=document.querySelector("[role=dialog]"); return el ? el.innerText : null })()')
    if (dialog && (!expectedText || dialog.includes(expectedText))) return
    await delay(150)
  }
  throw new Error('Expected dialog did not open or was missing text: ' + (expectedText ?? 'dialog content'))
}

async function clickButtonByText(text) {
  const expression = '(() => { const target=[...document.querySelectorAll("button")].find((button)=>(button.innerText || "").replace(/\\s+/g," ").includes(' + JSON.stringify(text) + ')); if(!target)return false; target.click(); return true })()'
  const clicked = await evaluate(expression)
  assert.equal(clicked, true, 'Expected visible button: ' + text)
}

async function closeDialog() {
  const closed = await evaluate('(() => { const dialog=document.querySelector("[role=dialog]"); if(!dialog)return true; const close=[...dialog.querySelectorAll("button")].find((button)=>button.hasAttribute("aria-label") || (button.textContent || "").includes("Close")); if(!close)return false; close.click(); return true })()')
  assert.equal(closed, true, 'Dialog must expose an accessible close button')
  await delay(200)
}

async function captureFullPage(fileName) {
  const metrics = await send('Page.getLayoutMetrics')
  const size = metrics.cssContentSize ?? metrics.contentSize
  const width = Math.max(1, Math.ceil(size.width))
  const height = Math.max(1, Math.ceil(size.height))
  const image = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })
  await writeFile(join(outputDir, fileName), Buffer.from(image.data, 'base64'))
}

async function waitForDebugger() {
  const endpoint = 'http://127.0.0.1:' + debugPort + '/json/version'
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(endpoint)
      if (response.ok) return
    } catch {
      // Chromium is still starting.
    }
    await delay(250)
  }
  throw new Error('Chromium remote debugging endpoint did not start')
}

try {
  await waitForDebugger()
  const targetResponse = await fetch('http://127.0.0.1:' + debugPort + '/json/new?about:blank', { method: 'PUT' })
  assert.equal(targetResponse.ok, true, 'Could not create a Chromium page target')
  const target = await targetResponse.json()

  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Could not connect to Chromium DevTools')), 10000)
    socket.addEventListener('open', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
    socket.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error('Chromium DevTools WebSocket connection failed'))
    }, { once: true })
  })
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data))
    if (!message.id) return
    const operation = pending.get(message.id)
    if (!operation) return
    pending.delete(message.id)
    if (message.error) operation.reject(new Error(message.error.message))
    else operation.resolve(message.result ?? {})
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Network.enable')
  await mkdir(outputDir, { recursive: true })

  const viewports = [
    { width: 1440, height: 1000, name: 'desktop' },
    { width: 1024, height: 768, name: 'tablet-landscape' },
    { width: 768, height: 1024, name: 'tablet-portrait' },
    { width: 390, height: 844, name: 'mobile' },
  ]

  for (const viewport of viewports) {
    const result = await loadLocaleAndViewport('fa', viewport.width, viewport.height)
    assert.equal(result.direction, 'rtl', 'Persian direction failed at ' + viewport.name)
    assert.equal(result.language, 'fa', 'Persian lang failed at ' + viewport.name)
    assert.equal(result.searchVisible, true, 'Search control is missing at ' + viewport.name)
    assert.ok(
      Math.max(result.documentWidth, result.bodyWidth) <= result.viewportWidth + 1,
      'Horizontal overflow at ' + viewport.name + ': viewport=' + result.viewportWidth + ', document=' + result.documentWidth + ', body=' + result.bodyWidth
    )
    console.log('PASS FA/' + viewport.name + ': ' + result.viewportWidth + 'px, no horizontal overflow')
  }

  const english = await loadLocaleAndViewport('en', 1440, 1000)
  assert.equal(english.direction, 'ltr', 'English direction must be LTR')
  assert.equal(english.language, 'en', 'English html lang must be en')
  assert.ok(Math.max(english.documentWidth, english.bodyWidth) <= english.viewportWidth + 1, 'English desktop has horizontal overflow')
  await captureFullPage('home-en-desktop.png')
  console.log('PASS EN/desktop: LTR rendering and full-page visual capture')

  const englishMobile = await loadLocaleAndViewport('en', 390, 844)
  assert.equal(englishMobile.direction, 'ltr', 'English mobile direction must be LTR')
  assert.equal(englishMobile.language, 'en', 'English mobile lang must be en')
  assert.ok(Math.max(englishMobile.documentWidth, englishMobile.bodyWidth) <= englishMobile.viewportWidth + 1, 'English mobile has horizontal overflow')
  await captureFullPage('home-en-mobile.png')
  console.log('PASS EN/mobile: LTR rendering, no horizontal overflow and full-page visual capture')

  await loadLocaleAndViewport('fa', 1440, 1000)
  await clickButtonByText('درخواست تأمین سازمانی')
  await waitForDialog('پیش‌نویس درخواست استعلام قیمت')
  await closeDialog()
  console.log('PASS B2B RFQ preview opens and closes')

  await clickButtonByText('درخواست جایگاه تبلیغاتی')
  await waitForDialog('پیش‌نویس درخواست تبلیغات')
  await closeDialog()
  console.log('PASS advertising preview opens and closes')

  const productOpened = await evaluate("(() => { const card=document.querySelector('article[role=button]'); if(!card)return false; card.click(); return true })()")
  assert.equal(productOpened, true, 'A keyboard-accessible product card must exist')
  await waitForDialog('افزودن به سبد')
  await closeDialog()
  console.log('PASS product details dialog opens and closes')

  const cartOpened = await evaluate('(() => { const button=[...document.querySelectorAll("button[aria-label]")].find((item)=>/سبد خرید|cart/i.test(item.getAttribute("aria-label") ?? "")); if(!button)return false; button.click(); return true })()')
  assert.equal(cartOpened, true, 'Cart button must expose an accessible name')
  await waitForDialog()
  await closeDialog()
  console.log('PASS cart drawer opens and closes with an accessible dialog')

  console.log('PASS AFAGHX homepage browser smoke checks')
} finally {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close()
  browser.kill('SIGTERM')
  await delay(200)
  await rm(profileDir, { recursive: true, force: true })
}

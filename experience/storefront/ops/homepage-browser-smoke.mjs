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

async function settleVisualAssets() {
  return evaluate(`(async () => {
    await document.fonts.ready
    const originalY = window.scrollY
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    for (let y = 0; y <= maxY; y += Math.max(300, Math.floor(window.innerHeight * 0.75))) {
      window.scrollTo(0, y)
      await new Promise((resolve) => setTimeout(resolve, 90))
    }
    window.scrollTo(0, 0)
    // Image errors can trigger a React state update that replaces the failed
    // Next/Image source with its data-URI fallback. Do not snapshot the DOM
    // immediately after complete becomes true: a failed image is also
    // complete, and the fallback update may not have committed yet.
    let images = [...document.images]
    for (let attempt = 0; attempt < 50; attempt += 1) {
      images = [...document.images]
      const unresolved = images.some((image) => !image.complete || image.naturalWidth === 0)
      if (!unresolved) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    images = [...document.images]
    const brokenImages = images.filter((image) => !image.complete || image.naturalWidth === 0)
    const fallbackImages = images.filter((image) => image.currentSrc.startsWith('data:image/svg+xml'))
    window.scrollTo(0, originalY)
    return {
      imageCount: images.length,
      brokenImages: brokenImages.map((image) => ({ alt: image.alt, src: image.currentSrc || image.src })),
      fallbackCount: fallbackImages.length,
    }
  })()`)
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
  const imageAudit = await settleVisualAssets()
  assert.ok(imageAudit.imageCount > 0, 'Homepage must render product/category image elements')
  assert.deepEqual(imageAudit.brokenImages, [], 'Every homepage image must load or render its deterministic fallback')
  const basketAudit = await evaluate(`(() => {
    const grid = document.querySelector('[data-testid="basket-grid"]')
    if (!grid) return { count: 0, columns: 0, rows: 0 }
    const cards = [...grid.querySelectorAll(':scope > a')]
    const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length
    const rowTops = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().top)))
    return { count: cards.length, columns, rows: rowTops.size }
  })()`)
  assert.equal(basketAudit.count, 34, 'Homepage must show all 34 canonical baskets by default')
  const productSlots = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('[data-testid="basket-card"]')]
    return { cards: cards.length, slots: cards.map((card) => card.querySelectorAll('[data-testid="basket-product-slot"]').length) }
  })()`)
  assert.equal(productSlots.cards, 34, 'Every canonical basket card must be present')
  assert.deepEqual(productSlots.slots, Array(34).fill(4), 'Every basket must reserve exactly four product preview positions')
  const amazonSample = await evaluate(`(() => {
    const card = document.querySelector('[data-basket-id="electronics-components-communications"]')
    const images = [...(card?.querySelectorAll('[data-testid="basket-amazon-sample"]') ?? [])]
    return {
      count: images.length,
      hosts: images.map((image) => new URL(image.currentSrc || image.src).hostname),
      labels: images.map((image) => image.alt),
      disclosure: card?.innerText?.includes('فقط پیش‌نمایش') || card?.innerText?.toLowerCase().includes('preview only') || false
    }
  })()`)
  assert.equal(amazonSample.count, 4, 'PC accessories basket must show the four temporary Amazon-sourced sample images')
  assert.deepEqual(amazonSample.hosts, Array(4).fill('m.media-amazon.com'), 'Every temporary sample image must use the expected Amazon image host')
  assert.ok(amazonSample.labels.every(Boolean), 'Every Amazon sample image must expose descriptive localized alt text')
  assert.equal(amazonSample.disclosure, true, 'Amazon sample images must be disclosed as preview-only')

  const expectedBasketColumns = width >= 1280 ? 4 : width >= 640 ? 2 : 1
  assert.equal(basketAudit.columns, expectedBasketColumns, 'Basket directory must use the responsive 1/2/4-column layout at ' + width + 'px')
  assert.equal(basketAudit.rows, Math.ceil(34 / expectedBasketColumns), 'Basket directory row count must match its responsive column layout at ' + width + 'px')
  await auditScrollRailFocus(locale, width)
  return evaluate('({viewportWidth:window.innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,documentHeight:document.documentElement.scrollHeight,direction:document.documentElement.dir,language:document.documentElement.lang,heading:document.querySelector("main h1")?.innerText ?? "",searchVisible:Boolean(document.querySelector("input[type=search]")?.getBoundingClientRect().width),scrollCueCount:document.querySelectorAll("nav .afx-scroll-cue").length})')
}


async function auditScrollRailFocus(locale, width) {
  const railTargets = await evaluate(`(() => {
    const rails = [...document.querySelectorAll('nav .afx-scroll-cue')]
      .filter((rail) => {
        const rect = rail.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
    return rails.map((rail, railIndex) => {
      const controls = [...rail.querySelectorAll('a[href], button:not(:disabled)')]
      const targets = controls.length > 1 ? [controls[0], controls[controls.length - 1]] : controls
      return targets.map((control, targetIndex) => {
        const marker = 'afx-focus-audit-' + railIndex + '-' + targetIndex
        control.setAttribute('data-afx-focus-audit', marker)
        return { marker, label: (control.innerText || control.getAttribute('aria-label') || '').trim().slice(0, 80), edge: targetIndex === 0 ? 'first' : 'last' }
      })
    }).flat()
  })()`)
  const keyboardResults = []
  // Begin once, then follow the document's natural sequential focus order so
  // later edge targets are reached by continuing Tab rather than resetting focus.
  await evaluate('document.activeElement instanceof HTMLElement && document.activeElement.blur()')
  for (const target of railTargets) {
    // Inspect the focused element immediately; do not call HTMLElement.focus()
    // to manufacture the state.
    let result = null
    for (let tab = 0; tab < 120; tab += 1) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
      result = await evaluate(`(() => {
        const control = document.querySelector('[data-afx-focus-audit="' + ${JSON.stringify(target.marker)} + '"]')
        if (!control || document.activeElement !== control) return null
        const rail = control.closest('nav .afx-scroll-cue')
        if (!rail) return null
        const railRect = rail.getBoundingClientRect()
        const rect = control.getBoundingClientRect()
        const style = getComputedStyle(control)
        return {
          reached: true,
          focusVisible: control.matches(':focus-visible'),
          outlineVisible: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2,
          withinScrollport: rect.left >= railRect.left + 3 && rect.right <= railRect.right - 3 && rect.top >= railRect.top && rect.bottom <= railRect.bottom,
          scrollLeft: rail.scrollLeft,
          clientWidth: rail.clientWidth,
          scrollWidth: rail.scrollWidth,
          overflow: rail.scrollWidth > rail.clientWidth,
          maskImage: getComputedStyle(rail).maskImage,
          webkitMaskImage: getComputedStyle(rail).webkitMaskImage,
          scrollbarWidth: getComputedStyle(rail).scrollbarWidth
        }
      })()`)
      if (result) break
    }
    keyboardResults.push({ ...target, ...(result ?? { reached: false }) })
  }
  assert.ok(keyboardResults.length > 0, 'Visible navigation rails must have keyboard-focus targets')
  for (const control of keyboardResults) {
    assert.equal(control.reached, true, 'Sequential Tab navigation must reach rail control: ' + control.label)
    assert.equal(control.focusVisible, true, 'Actual keyboard focus must match :focus-visible: ' + control.label)
    assert.equal(control.outlineVisible, true, 'Actual keyboard focus must show an outline of at least 2px: ' + control.label)
    assert.equal(control.withinScrollport, true, 'Actual focused control must remain fully visible at rail edge: ' + control.edge + ' / ' + control.label)
    assert.equal(control.maskImage, 'none', 'Navigation rail must not mask keyboard focus with a CSS mask')
    assert.equal(control.webkitMaskImage, 'none', 'Navigation rail must not apply a WebKit mask over focused controls')
    if (width <= 1023 && control.overflow) {
      assert.ok(control.scrollbarWidth !== 'none', 'Overflowing navigation rail must expose a visible scrollbar cue')
    }
  }
  await evaluate('[...document.querySelectorAll("[data-afx-focus-audit]")].forEach((control) => control.removeAttribute("data-afx-focus-audit"))')
  console.log('PASS actual sequential keyboard focus remains visible at both rail extremes (' + locale + ', ' + width + 'px)')
}

async function auditAccessibility() {
  const audit = await evaluate(`(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
    }
    const name = (element) => {
      const labelledBy = (element.getAttribute('aria-labelledby') || '')
        .split(/\\s+/)
        .map((id) => document.getElementById(id)?.textContent || '')
        .join(' ')
      const labels = element.labels ? [...element.labels].map((label) => label.textContent || '').join(' ') : ''
      const imageAlt = [...element.querySelectorAll('img[alt]')].map((image) => image.getAttribute('alt') || '').join(' ')
      return (
        element.getAttribute('aria-label') ||
        labelledBy ||
        labels ||
        element.getAttribute('title') ||
        element.innerText ||
        element.textContent ||
        imageAlt ||
        ''
      ).replace(/\\s+/g, ' ').trim()
    }
    const buttons = [...document.querySelectorAll('button')].filter(visible)
    const links = [...document.querySelectorAll('a[href]')].filter(visible)
    const fields = [...document.querySelectorAll('input:not([type=hidden]), select, textarea')].filter(visible)
    const nestedInteractive = [...document.querySelectorAll('button button, a button, button a, a a, [role="button"] button, [role="button"] a')].length
    const duplicateIds = [...document.querySelectorAll('[id]')]
      .map((element) => element.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index)
    return {
      mainCount: document.querySelectorAll('main').length,
      h1Count: document.querySelectorAll('main h1').length,
      unnamedButtons: buttons.filter((element) => !name(element)).map((element) => element.outerHTML.slice(0, 160)),
      unnamedLinks: links.filter((element) => !name(element)).map((element) => element.outerHTML.slice(0, 160)),
      unlabeledFields: fields.filter((element) => !name(element)).map((element) => element.outerHTML.slice(0, 160)),
      imagesWithoutAlt: [...document.querySelectorAll('img:not([alt])')].filter(visible).length,
      nestedInteractive,
      duplicateIds,
    }
  })()`)
  assert.equal(audit.mainCount, 1, 'Homepage must expose exactly one main landmark')
  assert.equal(audit.h1Count, 1, 'Homepage must expose exactly one primary heading')
  assert.deepEqual(audit.unnamedButtons, [], 'Every visible button needs an accessible name')
  assert.deepEqual(audit.unnamedLinks, [], 'Every visible link needs an accessible name')
  assert.deepEqual(audit.unlabeledFields, [], 'Every visible form field needs an accessible name')
  assert.equal(audit.imagesWithoutAlt, 0, 'Every informative visible image must expose alt text')
  assert.equal(audit.nestedInteractive, 0, 'Interactive controls must not be nested')
  assert.deepEqual(audit.duplicateIds, [], 'Document IDs must be unique')
  console.log('PASS accessibility semantics: landmarks, heading, named controls, image alt and unique IDs')
  return audit
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

async function clickFeaturedTabByText(text) {
  const expression = '(() => { const group=document.querySelector("#featured-products [role=group]"); const target=group ? [...group.querySelectorAll("button")].find((button)=>(button.innerText || "").replace(/\\s+/g," ").includes(' + JSON.stringify(text) + ')) : null; if(!target)return false; target.click(); return true })()'
  const clicked = await evaluate(expression)
  assert.equal(clicked, true, 'Expected featured-product tab: ' + text)
}

async function closeDialog() {
  const closed = await evaluate('(() => { const dialog=document.querySelector("[role=dialog]"); if(!dialog)return true; const close=[...dialog.querySelectorAll("button")].find((button)=>button.hasAttribute("aria-label") || (button.textContent || "").includes("Close")); if(!close)return false; close.click(); return true })()')
  assert.equal(closed, true, 'Dialog must expose an accessible close button')
  await delay(200)
}

async function captureFullPage(fileName, viewportWidth) {
  const metrics = await send('Page.getLayoutMetrics')
  const size = metrics.cssContentSize ?? metrics.contentSize
  // Preserve the exact requested CSS viewport width. cssContentSize.width can
  // exclude the classic scrollbar gutter (for example 1009 instead of 1024),
  // which made the review artifacts differ from the named viewport.
  const width = Math.max(1, Math.ceil(viewportWidth))
  const height = Math.max(1, Math.ceil(size.height))
  const image = await send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })
  const png = Buffer.from(image.data, 'base64')
  assert.equal(png.readUInt32BE(16), viewportWidth, 'Visual artifact width must match requested CSS viewport: ' + fileName)
  await writeFile(join(outputDir, fileName), png)
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
    assert.equal(result.scrollCueCount, 1, 'The simplified header must expose one primary navigation rail at ' + viewport.name)
    assert.ok(
      Math.max(result.documentWidth, result.bodyWidth) <= result.viewportWidth + 1,
      'Horizontal overflow at ' + viewport.name + ': viewport=' + result.viewportWidth + ', document=' + result.documentWidth + ', body=' + result.bodyWidth
    )
    await captureFullPage('home-fa-' + viewport.name + '.png', viewport.width)
    console.log('PASS FA/' + viewport.name + ': ' + result.viewportWidth + 'px, no horizontal overflow')
  }

  const english = await loadLocaleAndViewport('en', 1440, 1000)
  assert.equal(english.direction, 'ltr', 'English direction must be LTR')
  assert.equal(english.language, 'en', 'English html lang must be en')
  assert.ok(Math.max(english.documentWidth, english.bodyWidth) <= english.viewportWidth + 1, 'English desktop has horizontal overflow')
  await captureFullPage('home-en-desktop.png', 1440)
  console.log('PASS EN/desktop: LTR rendering and full-page visual capture')

  for (const viewport of viewports.filter((item) => item.width === 1024 || item.width === 768)) {
    const result = await loadLocaleAndViewport('en', viewport.width, viewport.height)
    assert.equal(result.direction, 'ltr', 'English direction failed at ' + viewport.name)
    assert.equal(result.language, 'en', 'English lang failed at ' + viewport.name)
    assert.ok(
      Math.max(result.documentWidth, result.bodyWidth) <= result.viewportWidth + 1,
      'English horizontal overflow at ' + viewport.name
    )
    await captureFullPage('home-en-' + viewport.name + '.png', viewport.width)
    console.log('PASS EN/' + viewport.name + ': LTR rendering, no horizontal overflow')
  }

  const englishMobile = await loadLocaleAndViewport('en', 390, 844)
  assert.equal(englishMobile.direction, 'ltr', 'English mobile direction must be LTR')
  assert.equal(englishMobile.language, 'en', 'English mobile lang must be en')
  assert.ok(Math.max(englishMobile.documentWidth, englishMobile.bodyWidth) <= englishMobile.viewportWidth + 1, 'English mobile has horizontal overflow')
  await captureFullPage('home-en-mobile.png', 390)
  console.log('PASS EN/mobile: LTR rendering, no horizontal overflow and full-page visual capture')

  await loadLocaleAndViewport('fa', 1440, 1000)
  await auditAccessibility()

  const architectureState = await evaluate(`(() => {
    const section = document.querySelector('#architecture')
    const core = document.querySelector('#core-trust-plane-title')
    const steps = section?.querySelectorAll('ol li') ?? []
    return {
      architectureAnchor: Boolean(section),
      coreHeading: core?.innerText?.trim() ?? null,
      coreFlowSteps: steps.length,
      targetArchitectureDisclosure: section?.innerText?.includes('معماری هدف') ?? false,
    }
  })()`)
  assert.equal(architectureState.architectureAnchor, true, 'Platform architecture navigation anchor must resolve')
  assert.equal(architectureState.coreHeading, 'هسته مرکزی هویت، امنیت و حاکمیت', 'Central Core section must expose its localized heading')
  assert.equal(architectureState.coreFlowSteps, 6, 'Central Core must show the six-step request enforcement flow')
  assert.equal(architectureState.targetArchitectureDisclosure, true, 'Central Core must disclose target architecture status')
  console.log('PASS central core architecture anchor, six-step flow and target-status disclosure')

  const featuredTabs = [
    { label: 'پرفروش‌ترین‌های الکترونیک', expected: 'پرفروش‌ترین‌های الکترونیک' },
    { label: 'پیشنهادشده برای شما', expected: 'پیشنهادشده برای شما' },
    { label: 'پیشنهادهای امروز', expected: 'پیشنهادهای امروز' },
  ]
  for (const tab of featuredTabs) {
    await clickFeaturedTabByText(tab.label)
    const state = await evaluate(`(() => { const group=document.querySelector('#featured-products [role="group"]'); const selected=group ? Array.from(group.querySelectorAll("button")).find((button)=>button.getAttribute("aria-pressed")==="true") : null; const rail=document.getElementById("featured-product-rail"); return {groupLabel:group?.getAttribute("aria-label") ?? null, selected:selected?.innerText?.trim() ?? null, heading:rail?.querySelector("h2")?.innerText?.trim() ?? null, label:rail?.getAttribute("aria-label") ?? null}; })()`)
    assert.equal(state.groupLabel, 'انتخاب نوع محصولات', 'Featured tabs group must have a localized accessible name')
    assert.equal(state.selected, tab.expected, 'Featured collection tab should become selected: ' + tab.label)
    assert.equal(state.heading, tab.expected, 'Featured product rail heading should update: ' + tab.label)
    assert.equal(state.label, tab.expected, 'Featured product rail accessible label should update: ' + tab.label)
  }
  console.log('PASS featured-product tabs switch the three non-overlapping collections')

  await clickButtonByText('تعریف نیاز تأمین سازمانی')
  await waitForDialog('پیش‌نویس درخواست استعلام قیمت')
  await closeDialog()
  console.log('PASS B2B RFQ preview opens and closes')

  const adSlots = await evaluate(`(() => {
    const grid = document.querySelector('[data-testid="ad-slot-grid"]')
    const slots = [...(grid?.querySelectorAll('[data-testid="ad-slot"]') ?? [])]
    const copy = document.querySelector('#advertising')?.innerText ?? ''
    return {
      count: slots.length,
      numbered: slots.map((slot) => Number(slot.getAttribute('data-slot-number'))),
      eightHour: copy.includes('۸ ساعت'),
      fiveStar: copy.includes('۵ ستاره')
    }
  })()`)
  assert.equal(adSlots.count, 30, 'Homepage must expose exactly 30 premium advertising positions')
  assert.deepEqual(adSlots.numbered, Array.from({ length: 30 }, (_, index) => index + 1), 'Advertising positions must be numbered 01 through 30')
  assert.equal(adSlots.eightHour, true, 'Premium advertising duration must be disclosed as eight hours')
  assert.equal(adSlots.fiveStar, true, 'Premium advertising eligibility must disclose the five-star seller requirement')

  await clickButtonByText('درخواست جایگاه تبلیغاتی')
  await waitForDialog('پیش‌نویس درخواست تبلیغات')
  await closeDialog()
  console.log('PASS advertising preview opens and closes')

  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  const productFocus = await evaluate("(() => { const card=document.querySelector('button[data-product-details]'); if(!card)return null; card.focus(); const style=getComputedStyle(card); return {active:document.activeElement===card,focusVisible:card.matches(':focus-visible'),outlineStyle:style.outlineStyle,outlineWidth:style.outlineWidth,ariaLabel:card.getAttribute('aria-label')} })()")
  assert.ok(productFocus?.active, 'Product details control must be focusable by keyboard')
  assert.ok(productFocus.focusVisible, 'Product details control must expose keyboard focus-visible state')
  assert.ok(productFocus.outlineStyle !== 'none' && productFocus.outlineWidth !== '0px', 'Product details control keyboard focus must have a visible outline')
  const productOpened = await evaluate("(() => { const card=document.querySelector('button[data-product-details]'); if(!card)return false; card.click(); return true })()")
  assert.equal(productOpened, true, 'Product details control must open its dialog')
  await waitForDialog('درباره این کالا')
  await closeDialog()
  console.log('PASS product details control has visible keyboard focus and opens its dialog')

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

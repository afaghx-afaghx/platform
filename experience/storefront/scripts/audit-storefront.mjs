import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path) => readFileSync(resolve(process.cwd(), path), 'utf8')
const failures = []
const pass = (condition, message) => {
  if (condition) process.stdout.write(`PASS  ${message}\n`)
  else {
    failures.push(message)
    process.stderr.write(`FAIL  ${message}\n`)
  }
}

const taxonomyPath = 'src/lib/product-baskets.ts'
const catalogPath = 'src/lib/catalog.ts'
const directoryPath = 'src/components/home/BasketDirectory.tsx'
const routePath = 'src/app/categories/[basketId]/page.tsx'
const configPath = 'next.config.ts'
const productCardPath = 'src/components/product/ProductCard.tsx'
const productDialogPath = 'src/components/product/ProductDialog.tsx'
const marketplaceHomePath = 'src/components/MarketplaceHome.tsx'
const cartSheetPath = 'src/components/cart/CartSheet.tsx'
const sharedTaxonomyPath = '../web/public/product-taxonomy.js'

for (const path of [taxonomyPath, catalogPath, directoryPath, routePath, configPath, productCardPath, productDialogPath, marketplaceHomePath, cartSheetPath, sharedTaxonomyPath]) {
  pass(existsSync(resolve(process.cwd(), path)), `required file exists: ${path}`)
}

if (failures.length > 0) process.exit(1)

const taxonomy = read(taxonomyPath)
const catalog = read(catalogPath)
const directory = read(directoryPath)
const config = read(configPath)
const productCard = read(productCardPath)
const productDialog = read(productDialogPath)
const marketplaceHome = read(marketplaceHomePath)
const cartSheet = read(cartSheetPath)
const sharedTaxonomy = read(sharedTaxonomyPath)

const basketIds = [...taxonomy.matchAll(/\{ id: '([^']+)'/g)].map((match) => match[1])
const sharedBasketIds = [...sharedTaxonomy.matchAll(/\['([^']+)'/g)].map((match) => match[1])
const faNames = [...taxonomy.matchAll(/fa: '([^']+)'/g)].map((match) => match[1])
const enNames = [...taxonomy.matchAll(/en: '([^']+)'/g)].map((match) => match[1])
const catalogIds = new Set([...catalog.matchAll(/id: '([^']+)'/g)].map((match) => match[1]))
const productAssignments = [...taxonomy.matchAll(/productIds: \[([^\]]*)\]/g)]
  .flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((idMatch) => idMatch[1]))
const unknownProductIds = productAssignments.filter((id) => !catalogIds.has(id))
const duplicateBasketIds = basketIds.filter((id, index) => basketIds.indexOf(id) !== index)
const duplicateProductAssignments = productAssignments.filter((id, index) => productAssignments.indexOf(id) !== index)

pass(basketIds.length === 36, 'taxonomy contains exactly 36 baskets')
pass(new Set(basketIds).size === 36 && duplicateBasketIds.length === 0, 'all basket IDs are unique')
pass(
  sharedBasketIds.length === 36 && basketIds.every((id, index) => id === sharedBasketIds[index]),
  'storefront taxonomy matches the shared Experience taxonomy in exact order'
)
pass(faNames.length >= 36 && enNames.length >= 36, 'all baskets include Persian and English labels')
pass(unknownProductIds.length === 0, 'all assigned sample product IDs exist in the catalogue')
pass(duplicateProductAssignments.length === 0, 'sample products are not assigned to multiple baskets')
pass(directory.includes('Array.from({ length: 4 }'), 'every basket renders exactly four product positions')
pass(directory.includes('sm:grid-cols-2 lg:grid-cols-4'), 'responsive grid reaches four columns at desktop breakpoint')
pass(directory.includes('auditProductBaskets') && directory.includes('basketAudit.isValid'), 'runtime taxonomy integrity gate is enabled')
pass(catalog.includes("commercialStatus: 'demo' as const"), 'seeded catalogue records are explicitly marked as demo')
pass(productCard.includes("product.commercialStatus !== 'verified'"), 'product cards fail closed for unverified commercial records')
pass(productCard.includes('Demo only — not a verified offer'), 'product cards visibly disclose demo status')
pass(productDialog.includes("product.commercialStatus !== 'verified'"), 'product detail dialogs fail closed for unverified commercial records')
pass(productDialog.includes('not verified'), 'product detail dialogs disclose unverified commercial claims')
pass(marketplaceHome.includes("product.commercialStatus === 'verified'"), 'featured commercial collections exclude demo records')
pass(marketplaceHome.includes('sortCommercialProducts'), 'demo records are not ranked by seeded prices, ratings or review counts')
pass(cartSheet.includes("item.product?.commercialStatus === 'verified'"), 'cart projection excludes unverified demo records')
pass(cartSheet.includes('Remove persisted demo/unknown lines'), 'persisted demo cart lines are explicitly purged')
pass(config.includes('reactStrictMode: true'), 'React Strict Mode is enabled')
pass(config.includes('ignoreBuildErrors: false'), 'production build does not suppress TypeScript errors')
pass(
  config.includes('X-Content-Type-Options') &&
    config.includes('X-Frame-Options') &&
    config.includes('Referrer-Policy'),
  'baseline security response headers are configured'
)
pass(existsSync(resolve(process.cwd(), routePath)), 'category detail route is present')

if (failures.length > 0) {
  process.stderr.write(`\nStorefront structural audit failed: ${failures.length} check(s).\n`)
  process.exit(1)
}

process.stdout.write('\nStorefront structural audit passed. This is not a substitute for typecheck, build, browser, accessibility, security or load testing.\n')

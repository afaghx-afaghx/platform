/**
 * AFAGHX — provision the PLATFORM search service (idempotent).
 *
 *   1. Ensure index `afaghx` (primaryKey: id)
 *   2. Apply search settings (bilingual priority order)
 *   3. Ensure a least-privilege search-only key for the storefront runtime
 *
 * Run: source mini-services/meilisearch/.data/meilisearch/keys.env && bun ops/provision.ts  (cwd = workspace root)
 * The storefront itself never sees the master key — only the printed search key.
 */
import { writeFileSync } from 'node:fs'
import { meili, meiliJson, waitForTask } from './meili-client'

const INDEX = process.env.MEILISEARCH_INDEX || 'afaghx'
const KEY_NAME = 'afaghx-storefront-search (least privilege, search-only)'

const SETTINGS = {
  searchableAttributes: [
    'title.fa',
    'title.en',
    'brand',
    'description.fa',
    'description.en',
    'features.fa',
    'features.en',
  ],
  filterableAttributes: ['category', 'brand', 'discountPercent', 'price.usd', 'price.toman', 'rating', 'badge'],
  sortableAttributes: ['price.usd', 'price.toman', 'rating', 'discountPercent'],
} as const

interface KeyView {
  key: string
  name: string | null
  actions: string[]
  indexes: string[]
  expiresAt: string | null
}

async function ensureSearchKey(): Promise<KeyView> {
  const keys = await meiliJson<{ results: KeyView[] }>('GET', '/keys')
  const existing = keys.results.find((k) => k.name === KEY_NAME)
  if (existing) return existing
  return meiliJson<KeyView>('POST', '/keys', {
    name: KEY_NAME,
    description: 'Search-only key for the AFAGHX storefront runtime (experience/storefront).',
    actions: ['search'],
    indexes: [INDEX],
    expiresAt: null,
  })
}

async function main(): Promise<void> {
  // 1) index — Meilisearch ≥1.x reports a duplicate index as HTTP 202 with a
  //    FAILED indexCreation task ("Index `x` already exists"), not HTTP 409;
  //    both shapes are treated as "already exists" (idempotent provision).
  const created = await meili('POST', '/indexes', { uid: INDEX, primaryKey: 'id' })
  if (created.ok) {
    const task = (await created.json()) as { taskUid: number }
    try {
      await waitForTask(task)
      console.log(`index "${INDEX}" created (primaryKey=id)`)
    } catch (err) {
      if (!String(err).includes('already exists')) throw err
      console.log(`index "${INDEX}" already exists`)
    }
  } else if (created.status === 409) {
    console.log(`index "${INDEX}" already exists`)
  } else {
    throw new Error(`index create failed: HTTP ${created.status}`)
  }

  // 2) settings
  const settingsTask = (await meiliJson<{ taskUid: number }>(
    'PATCH',
    `/indexes/${INDEX}/settings`,
    SETTINGS
  )) as { taskUid: number }
  await waitForTask(settingsTask)
  console.log('settings applied: searchable/filterable/sortable (bilingual priority)')

  // 3) least-privilege key → written straight into the app's .env.local
  //    (masked in output; the key never lands in logs or chat).
  const key = await ensureSearchKey()
  const envFile = process.env.AFX_ENV_FILE || '/home/z/my-project/.env.local'
  const block = [
    '# AFAGHX storefront — PLATFORM search binding (managed by ops/provision.ts)',
    `MEILISEARCH_URL=http://127.0.0.1:7700`,
    `MEILISEARCH_API_KEY=${key.key}`,
    `MEILISEARCH_INDEX=${INDEX}`,
    '',
  ].join('\n')
  writeFileSync(envFile, block, { mode: 0o600 })
  console.log(`search-only key written to ${envFile} (key: ${key.key.slice(0, 6)}…${key.key.slice(-4)})`)
}

main().catch((err) => {
  console.error('PROVISION FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})

/**
 * Meilisearch API helper — tiny zero-dependency client for AFAGHX ops scripts.
 * Master key is read from MEILI_MASTER_KEY (never hardcoded, never committed).
 * Usage: source /home/z/my-project/.data/meilisearch/keys.env && bun run <script>
 */
export const MEILI_URL = process.env.MEILI_URL || 'http://127.0.0.1:7700'

function masterKey(): string {
  const key = process.env.MEILI_MASTER_KEY
  if (!key || key.length < 16) {
    throw new Error('MEILI_MASTER_KEY missing/short — source .data/meilisearch/keys.env first')
  }
  return key
}

export interface MeiliTask {
  uid: number
  status: 'enqueued' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  error?: { message: string; code: string; type: string } | null
  type: string
}

export async function meili(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<Response> {
  return fetch(new URL(path, MEILI_URL), {
    method,
    headers: {
      authorization: `Bearer ${masterKey()}`,
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

export async function meiliJson<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await meili(method, path, body)
  const json = (await res.json().catch(() => ({}))) as T & { message?: string }
  if (!res.ok) throw new Error(`meili_${res.status} ${path}: ${json.message || 'unknown'}`)
  return json
}

/** Enqueue then poll until the task settles. Throws with the task error on failure. */
export async function waitForTask(task: { taskUid: number }, timeoutMs = 30000): Promise<MeiliTask> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const t = await meiliJson<MeiliTask>('GET', `/tasks/${task.taskUid}`)
    if (t.status === 'succeeded') return t
    if (t.status === 'failed' || t.status === 'canceled') {
      throw new Error(`task ${t.uid} (${t.type}) ${t.status}: ${t.error?.message || 'unknown'}`)
    }
    if (Date.now() > deadline) throw new Error(`task ${t.uid} timeout after ${timeoutMs}ms`)
    await new Promise((r) => setTimeout(r, 120))
  }
}

/**
 * Thin KV wrapper with three backends:
 *
 *   1. Vercel KV (Upstash) — when KV_REST_API_URL + KV_REST_API_TOKEN are set (prod).
 *   2. Filesystem JSON — when KV_LOCAL_DIR is set (local dev).
 *   3. In-memory — fallback (tests, build-time). Never persists.
 *
 * We keep the API small and synchronous-looking to simplify API route code:
 *   get(key) / set(key, value) / del(key) / list(prefix) / listJson(prefix)
 *   append(listKey, entry) — atomic-ish push for audit logs (best-effort on FS/mem).
 */

// Node built-ins are loaded via lazy dynamic import so this module stays safe to
// *statically* include in client bundles (Turbopack tree-shakes the fs-backed path
// when KV_LOCAL_DIR env is absent in browser context).
type PathModule = typeof import("node:path")
type FsModule = typeof import("node:fs/promises")
let _pathMod: PathModule | null = null
let _fsMod: FsModule | null = null
async function getFs(): Promise<{ fs: FsModule; path: PathModule }> {
  if (!_fsMod) _fsMod = await import("node:fs/promises")
  if (!_pathMod) _pathMod = await import("node:path")
  return { fs: _fsMod, path: _pathMod }
}

const KV_URL = process.env.KV_REST_API_URL
const KV_TOKEN = process.env.KV_REST_API_TOKEN
const KV_LOCAL_DIR = process.env.KV_LOCAL_DIR

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[]

export interface KvClient {
  get<T extends JsonValue = JsonValue>(key: string): Promise<T | null>
  set(key: string, value: JsonValue): Promise<void>
  del(key: string): Promise<void>
  /** Return list of keys matching a prefix — supports a small subset of Upstash SCAN. */
  listKeys(prefix: string, options?: { limit?: number }): Promise<string[]>
  /** Convenience: list keys then fetch each and return as dict. */
  listJson<T extends JsonValue = JsonValue>(
    prefix: string,
    options?: { limit?: number },
  ): Promise<Array<{ key: string; value: T }>>
  /** Append an entry to a list-typed key. Used for audit logs. */
  append(listKey: string, entry: JsonValue): Promise<void>
  /** Read the full list at the given key (newest last by convention). */
  readList<T extends JsonValue = JsonValue>(listKey: string): Promise<T[]>
}

// ==================== Backend: Vercel KV (Upstash REST) ====================

async function upstashFetch(path: string, body?: unknown): Promise<unknown> {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("Vercel KV credentials missing")
  }
  const res = await fetch(`${KV_URL}${path}`, {
    method: body !== undefined ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`KV ${path} -> ${res.status}: ${text}`)
  }
  const json = (await res.json()) as { result?: unknown; error?: string }
  if (json.error) throw new Error(`KV error: ${json.error}`)
  return json.result
}

function makeUpstashClient(): KvClient {
  return {
    async get<T extends JsonValue = JsonValue>(key: string): Promise<T | null> {
      const result = (await upstashFetch(`/get/${encodeURIComponent(key)}`)) as
        | string
        | null
      if (result === null) return null
      // Upstash stores values as strings; try to JSON.parse. Also handle the
      // legacy double-wrapped form (["<stringified>"]) that earlier code wrote:
      // if parse yields a 1-element array of a string that parses as JSON, unwrap.
      try {
        const parsed = JSON.parse(result)
        if (
          Array.isArray(parsed) &&
          parsed.length === 1 &&
          typeof parsed[0] === "string"
        ) {
          try {
            return JSON.parse(parsed[0]) as T
          } catch {
            // fall through — treat as plain array
          }
        }
        return parsed as T
      } catch {
        return result as unknown as T
      }
    },
    async set(key: string, value: JsonValue): Promise<void> {
      // Upstash REST: `POST /set/<key>` with body = the raw value.
      // `upstashFetch` does `body: JSON.stringify(bodyArg)` exactly once.
      // We pass `value` itself so the final POST body is the JSON text of value.
      // DO NOT JSON.stringify here or wrap in array — that caused the bug where
      // reads returned `["<stringified>"]` and hooks saw .round = undefined.
      await upstashFetch(`/set/${encodeURIComponent(key)}`, value)
    },
    async del(key: string): Promise<void> {
      await upstashFetch(`/del/${encodeURIComponent(key)}`)
    },
    async listKeys(
      prefix: string,
      options?: { limit?: number },
    ): Promise<string[]> {
      // Upstash SCAN: /scan/0/MATCH/prefix*/COUNT/100
      const keys: string[] = []
      let cursor = "0"
      const limit = options?.limit ?? 1000
      do {
        const result = (await upstashFetch(
          `/scan/${cursor}/match/${encodeURIComponent(`${prefix}*`)}/count/100`,
        )) as [string, string[]]
        cursor = result[0]
        keys.push(...result[1])
        if (keys.length >= limit) break
      } while (cursor !== "0")
      return keys.slice(0, limit)
    },
    async listJson<T extends JsonValue = JsonValue>(
      prefix: string,
      options?: { limit?: number },
    ): Promise<Array<{ key: string; value: T }>> {
      const keys = await this.listKeys(prefix, options)
      const out: Array<{ key: string; value: T }> = []
      for (const k of keys) {
        const v = await this.get<T>(k)
        if (v !== null) out.push({ key: k, value: v })
      }
      return out
    },
    async append(listKey: string, entry: JsonValue): Promise<void> {
      // Upstash REST: POST /rpush/<key> with body = the single value to push.
      // `upstashFetch` does `body: JSON.stringify(bodyArg)` exactly once, so we
      // pass `entry` itself — the final body becomes the JSON text of entry,
      // which Upstash stores verbatim as one list element.
      // DO NOT wrap in an array — that caused the bug where reads returned
      // `[["<stringified>"]]` (audit log rendered as undefined, crashing /audit).
      await upstashFetch(`/rpush/${encodeURIComponent(listKey)}`, entry)
    },
    async readList<T extends JsonValue = JsonValue>(
      listKey: string,
    ): Promise<T[]> {
      const raw = (await upstashFetch(
        `/lrange/${encodeURIComponent(listKey)}/0/-1`,
      )) as string[]
      return raw.map((s) => {
        const parsed = JSON.parse(s)
        // Back-compat for legacy double-wrapped entries: ["<stringified>"]
        if (
          Array.isArray(parsed) &&
          parsed.length === 1 &&
          typeof parsed[0] === "string"
        ) {
          try {
            return JSON.parse(parsed[0]) as T
          } catch {
            // fall through — treat as plain array
          }
        }
        return parsed as T
      })
    },
  }
}

// ==================== Backend: Filesystem (local dev) ====================

function fsKeyPathSafe(key: string): string {
  return `${encodeURIComponent(key)}.json`
}

function makeFsClient(baseDir: string): KvClient {
  // Resolve on first use; all filesystem operations go through getFs() so Node
  // built-ins stay outside the client chunk.
  let resolvedBase: string | null = null
  async function base(): Promise<string> {
    if (resolvedBase) return resolvedBase
    const { path } = await getFs()
    resolvedBase = path.resolve(baseDir)
    return resolvedBase
  }
  async function keyPath(key: string): Promise<string> {
    const { path } = await getFs()
    return path.join(await base(), fsKeyPathSafe(key))
  }
  return {
    async get<T extends JsonValue = JsonValue>(key: string): Promise<T | null> {
      const { fs } = await getFs()
      try {
        const content = await fs.readFile(await keyPath(key), "utf8")
        return JSON.parse(content) as T
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null
        throw err
      }
    },
    async set(key: string, value: JsonValue): Promise<void> {
      const { fs } = await getFs()
      await fs.mkdir(await base(), { recursive: true })
      await fs.writeFile(
        await keyPath(key),
        JSON.stringify(value, null, 2),
        "utf8",
      )
    },
    async del(key: string): Promise<void> {
      const { fs } = await getFs()
      try {
        await fs.unlink(await keyPath(key))
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
      }
    },
    async listKeys(
      prefix: string,
      options?: { limit?: number },
    ): Promise<string[]> {
      const { fs } = await getFs()
      try {
        const entries = await fs.readdir(await base())
        const decoded = entries
          .filter((f) => f.endsWith(".json"))
          .map((f) => decodeURIComponent(f.slice(0, -".json".length)))
          .filter((k) => k.startsWith(prefix))
        decoded.sort()
        return options?.limit ? decoded.slice(0, options.limit) : decoded
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
        throw err
      }
    },
    async listJson<T extends JsonValue = JsonValue>(
      prefix: string,
      options?: { limit?: number },
    ): Promise<Array<{ key: string; value: T }>> {
      const keys = await this.listKeys(prefix, options)
      const out: Array<{ key: string; value: T }> = []
      for (const k of keys) {
        const v = await this.get<T>(k)
        if (v !== null) out.push({ key: k, value: v })
      }
      return out
    },
    async append(listKey: string, entry: JsonValue): Promise<void> {
      const existing = (await this.get<JsonValue[]>(listKey)) ?? []
      existing.push(entry)
      await this.set(listKey, existing as JsonValue)
    },
    async readList<T extends JsonValue = JsonValue>(
      listKey: string,
    ): Promise<T[]> {
      return ((await this.get<JsonValue[]>(listKey)) ?? []) as T[]
    },
  }
}

// ==================== Backend: In-Memory ====================

export function makeMemoryClient(): KvClient {
  const store = new Map<string, JsonValue>()
  const lists = new Map<string, JsonValue[]>()
  return {
    async get<T extends JsonValue = JsonValue>(key: string): Promise<T | null> {
      const v = store.get(key)
      return v === undefined ? null : (JSON.parse(JSON.stringify(v)) as T)
    },
    async set(key: string, value: JsonValue): Promise<void> {
      store.set(key, JSON.parse(JSON.stringify(value)) as JsonValue)
    },
    async del(key: string): Promise<void> {
      store.delete(key)
      lists.delete(key)
    },
    async listKeys(
      prefix: string,
      options?: { limit?: number },
    ): Promise<string[]> {
      const keys = Array.from(store.keys())
        .concat(Array.from(lists.keys()))
        .filter((k) => k.startsWith(prefix))
      keys.sort()
      const unique = Array.from(new Set(keys))
      return options?.limit ? unique.slice(0, options.limit) : unique
    },
    async listJson<T extends JsonValue = JsonValue>(
      prefix: string,
      options?: { limit?: number },
    ): Promise<Array<{ key: string; value: T }>> {
      const keys = await this.listKeys(prefix, options)
      const out: Array<{ key: string; value: T }> = []
      for (const k of keys) {
        const v = await this.get<T>(k)
        if (v !== null) out.push({ key: k, value: v })
      }
      return out
    },
    async append(listKey: string, entry: JsonValue): Promise<void> {
      const arr = lists.get(listKey) ?? []
      arr.push(JSON.parse(JSON.stringify(entry)) as JsonValue)
      lists.set(listKey, arr)
    },
    async readList<T extends JsonValue = JsonValue>(
      listKey: string,
    ): Promise<T[]> {
      const arr = lists.get(listKey) ?? []
      return JSON.parse(JSON.stringify(arr)) as T[]
    },
  }
}

// ==================== Factory ====================

let cached: KvClient | undefined

export function getKvClient(): KvClient {
  if (cached) return cached
  if (KV_URL && KV_TOKEN) {
    cached = makeUpstashClient()
  } else if (KV_LOCAL_DIR) {
    cached = makeFsClient(KV_LOCAL_DIR)
  } else {
    cached = makeMemoryClient()
  }
  return cached
}

/** Test-only: reset the module-level cache so tests can inject their own client. */
export function __resetKvClientForTests(override?: KvClient): void {
  cached = override
}

// ==================== Key builders ====================

export const KV_KEYS = {
  prizeConfig: (round: number) => `prize-config:${round}`,
  prizeConfigIndex: "prize-config:index", // sorted set of rounds (list)
  currentPrizeConfigRound: "prize-config:current-round",
  payoutRow: (round: number, addr: string) =>
    `payout-ledger:${round}:${addr.toLowerCase()}`,
  payoutIndex: (round: number) => `payout-ledger:${round}:index`,
  deployment: (id: string) => `treasury:deployment:${id}`,
  deploymentIndex: "treasury:deployment:index", // list of all ids, oldest-first
  redemption: (id: string) => `treasury:redemption:${id}`,
  redemptionIndex: "treasury:redemption:index",
  snapshot: (bucket: string) => `treasury:snapshot:${bucket}`,
  auditLog: "audit:log",
  adminNonce: (addr: string, nonce: string) =>
    `admin:nonce:${addr.toLowerCase()}:${nonce}`,
} as const

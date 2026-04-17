import { z } from "zod"

/**
 * Weekly Prize Configuration — stored in KV under key `prize-config:{round}`.
 *
 * - `round` matches `DrawState.current_round + 1` when drafted
 * - Amounts are display units (USDC) — API layer multiplies by 10^6 when building PTBs
 * - `status` is a finite state machine: only `draft`/`published` are writable
 * - `configHash` is sha256 over the amount params; UI shows it at execute-draw time
 *   as a sanity check against tampering between publish and execute
 */

export const PRIZE_STATUS = ["draft", "published", "drawn", "settled"] as const
export type PrizeStatus = (typeof PRIZE_STATUS)[number]

export const SLIDE_ID = ["grand-prize", "lucky-prize"] as const

export const prizeSlideSchema = z.object({
  id: z.enum(SLIDE_ID),
  label: z.string().min(1).max(40),
  subtitle: z.string().min(1).max(80),
  amount: z.number().nonnegative(),
  image: z.string().min(1),
  pill: z.string().min(1).max(40),
})
export type PrizeSlide = z.infer<typeof prizeSlideSchema>

export const weeklyPrizeConfigSchema = z
  .object({
    round: z.number().int().nonnegative(),
    status: z.enum(PRIZE_STATUS),

    // Required by execute_draw entry fun — DO NOT rename
    grandAmount: z.number().nonnegative(),
    luckyPool: z.number().nonnegative(),
    luckyCount: z.number().int().nonnegative(),
    luckyMin: z.number().nonnegative(),
    luckyMax: z.number().nonnegative(),

    // Display
    slides: z.array(prizeSlideSchema).min(1).max(8),

    // Schedule (ISO strings)
    drawAt: z.string().datetime(),
    snapshotAt: z.string().datetime(),

    // Audit
    publishedAt: z.string().datetime().optional(),
    publishedBy: z.string().optional(),
    configHash: z.string().length(64).optional(),

    // Optional per-round override (falls back to DrawState value on-chain)
    minQualifyingWallets: z.number().int().nonnegative().optional(),
  })
  .refine((c) => c.luckyMin <= c.luckyMax, {
    message: "luckyMin must be <= luckyMax",
    path: ["luckyMin"],
  })
  .refine(
    (c) =>
      c.luckyCount === 0 ||
      c.luckyPool === 0 ||
      c.luckyPool >= c.luckyMin * c.luckyCount,
    {
      message: "luckyPool must be >= luckyMin × luckyCount (cannot pay minimum to all winners)",
      path: ["luckyPool"],
    },
  )
  .refine(
    (c) => c.luckyCount === 0 || c.luckyPool === 0 || c.luckyPool <= c.luckyMax * c.luckyCount,
    {
      message: "luckyPool must be <= luckyMax × luckyCount (pool exceeds total max payout)",
      path: ["luckyPool"],
    },
  )
  .refine(
    (c) => {
      const snap = new Date(c.snapshotAt).getTime()
      const draw = new Date(c.drawAt).getTime()
      return snap < draw
    },
    { message: "snapshotAt must be before drawAt", path: ["snapshotAt"] },
  )

export type WeeklyPrizeConfig = z.infer<typeof weeklyPrizeConfigSchema>

/** Admin is only allowed to mutate configs in these states. */
export const MUTABLE_STATUSES: readonly PrizeStatus[] = ["draft", "published"] as const

export function isMutableStatus(s: PrizeStatus): boolean {
  return (MUTABLE_STATUSES as readonly string[]).includes(s)
}

/**
 * Valid state transitions.
 * Returns false for identity transitions so we can reject no-op writes at the API layer
 * unless fields other than status change (API layer decides).
 */
export function canTransition(from: PrizeStatus, to: PrizeStatus): boolean {
  const allowed: Record<PrizeStatus, PrizeStatus[]> = {
    draft: ["published"],
    published: ["drawn", "draft"], // allow unpublish back to draft before draw
    drawn: ["settled"],
    settled: [],
  }
  return allowed[from]?.includes(to) ?? false
}

/** Stable, deterministic JSON stringify for hash computation. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]"
  const keys = Object.keys(value as Record<string, unknown>).sort()
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  )
}

/**
 * Compute the canonical hash of prize-critical fields.
 * Used as a tamper-detection marker between publish and execute-draw.
 */
export async function computeConfigHash(
  c: Pick<
    WeeklyPrizeConfig,
    "round" | "grandAmount" | "luckyPool" | "luckyCount" | "luckyMin" | "luckyMax"
  >,
): Promise<string> {
  const payload = stableStringify({
    round: c.round,
    grandAmount: c.grandAmount,
    luckyPool: c.luckyPool,
    luckyCount: c.luckyCount,
    luckyMin: c.luckyMin,
    luckyMax: c.luckyMax,
  })
  // Prefer Web Crypto where available (Next.js edge + browsers + Node ≥ 20)
  const maybeCrypto: Crypto | undefined = (globalThis as unknown as { crypto?: Crypto }).crypto
  if (maybeCrypto?.subtle) {
    const bytes = new TextEncoder().encode(payload)
    const digest = await maybeCrypto.subtle.digest("SHA-256", bytes)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
  // Fallback to node:crypto
  const { createHash } = await import("node:crypto")
  return createHash("sha256").update(payload).digest("hex")
}

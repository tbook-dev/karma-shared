import { fetchCurrentDrawRound } from "@tbook/shared/lib/draw-round"
import { getKvClient, KV_KEYS } from "@tbook/shared/lib/kv-client"
import type { WeeklyPrizeConfig } from "@tbook/shared/lib/prize-config/schema"

export const DEFAULT_CURRENT_PRIZE_CONFIG_LIMIT = 10
export const MAX_CURRENT_PRIZE_CONFIG_LIMIT = 50

export function normalizeCurrentPrizeConfigLimit(limitRaw: string | null): number {
  const parsedLimit = limitRaw ? Number(limitRaw) : DEFAULT_CURRENT_PRIZE_CONFIG_LIMIT
  return Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(Math.floor(parsedLimit), MAX_CURRENT_PRIZE_CONFIG_LIMIT)
    : DEFAULT_CURRENT_PRIZE_CONFIG_LIMIT
}

/**
 * Returns all consecutive upcoming published prize configs, starting at
 * `current_round + 1` and stopping at the first missing/unpublished round.
 */
export async function listCurrentPublishedPrizeConfigs(
  limit = DEFAULT_CURRENT_PRIZE_CONFIG_LIMIT,
): Promise<WeeklyPrizeConfig[]> {
  const kv = getKvClient()

  let currentRound = 0
  try {
    currentRound = await fetchCurrentDrawRound()
  } catch {
    // Chain read failed — degrade to currentRound=0 so at least `prize-config:1`
    // is looked up. Prevents a hard 404 when the chain RPC is down.
    currentRound = 0
  }

  const items: WeeklyPrizeConfig[] = []
  for (let i = 1; i <= limit; i++) {
    const round = currentRound + i
    const cfg = await kv.get<WeeklyPrizeConfig>(KV_KEYS.prizeConfig(round))
    if (!cfg || cfg.status !== "published") break
    items.push(cfg)
  }

  return items
}

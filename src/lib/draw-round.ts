import { PLSA_CONTRACTS, getSuiRpcUrl } from "@tbook/shared/lib/contracts"

/**
 * Server-side helper: read `DrawState.current_round` directly from the chain via
 * JSON-RPC. Shared by the web/admin APIs so both services can determine the
 * authoritative next draw round without calling each other.
 */

async function rpc(
  url: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    cache: "no-store",
  })
  const json = (await res.json()) as { result?: unknown; error?: { message?: string } }
  if (json.error) throw new Error(`RPC ${method}: ${json.error.message ?? "unknown"}`)
  return json.result
}

let testOverride: number | null = null

export async function fetchCurrentDrawRound(rpcUrl?: string): Promise<number> {
  if (testOverride !== null) return testOverride
  const url = rpcUrl ?? getSuiRpcUrl()
  const obj = (await rpc(url, "sui_getObject", [
    PLSA_CONTRACTS.DRAW_STATE_ID,
    { showContent: true },
  ])) as { data?: { content?: { fields?: Record<string, unknown> } } }
  const fields = obj?.data?.content?.fields
  if (!fields) throw new Error("DrawState object missing content")
  return Number(fields.current_round ?? "0")
}

export function __setCurrentDrawRoundForTests(round: number | null): void {
  testOverride = round
}

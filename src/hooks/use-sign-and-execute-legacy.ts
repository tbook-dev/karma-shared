"use client"

import { useCurrentAccount, useCurrentWallet, useSuiClient } from "@mysten/dapp-kit"
import type { Transaction } from "@mysten/sui/transactions"

/**
 * Sign + execute a Transaction using the wallet's legacy
 * `sui:signAndExecuteTransactionBlock` feature.
 *
 * Why this exists (instead of the default `useSignAndExecuteTransaction` from
 * dapp-kit v1.0.4):
 *
 *   1. dapp-kit v1.0.4's `useSignAndExecuteTransaction` routes through the
 *      wallet's newer `sui:signTransaction` feature. Slush / Sui Wallet
 *      rejects requests on that path with "A valid Sui chain identifier
 *      was not provided" — even when we pass `chain: "sui:testnet"`.
 *
 *   2. The older `sui:signAndExecuteTransactionBlock` wallet feature works.
 *      This is also what `@mysten/dapp-kit@0.19` (used by tbook-vault-fe)
 *      internally calls, and it's the battle-tested path.
 *
 *   3. The `chain` string is hardcoded (not read from `process.env`). Vercel
 *      doesn't inline `NEXT_PUBLIC_SUI_NETWORK` from `vercel.json → env` into
 *      the client bundle — it only sets that for serverless runtime. We've
 *      been burned by `"sui:undefined"` in production.
 *
 * Usage:
 *   const signAndExecute = useSignAndExecuteLegacy()
 *   const result = await signAndExecute(tx)
 *
 * Swap the `CHAIN` constant below if deploying to mainnet.
 */

const CHAIN: `${string}:${string}` = "sui:testnet"

export function useSignAndExecuteLegacy() {
  const account = useCurrentAccount()
  const { currentWallet } = useCurrentWallet()
  const suiClient = useSuiClient()

  return async (tx: Transaction) => {
    if (!currentWallet) throw new Error("Wallet not connected")
    if (!account) throw new Error("No account selected")

    // Preferred: legacy feature — works with current Slush / Sui Wallet
    const legacyFeat = currentWallet.features["sui:signAndExecuteTransactionBlock"]
    if (legacyFeat) {
      return await legacyFeat.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        account,
        chain: CHAIN,
        options: { showRawEffects: true },
      })
    }

    // Fallback: newer feature. May fail with "chain identifier" on some wallets.
    const newFeat = currentWallet.features["sui:signAndExecuteTransaction"]
    if (newFeat) {
      return await newFeat.signAndExecuteTransaction({
        transaction: { toJSON: async () => await tx.toJSON({ client: suiClient as any }) },
        account,
        chain: CHAIN,
      })
    }

    throw new Error("Wallet does not support any supported signing feature")
  }
}

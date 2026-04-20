"use client"

import type React from "react"
import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { networkConfig } from "../lib/sui-config"
import { SuiJsonRpcClient } from "@mysten/sui/jsonRpc"
import "@mysten/dapp-kit/dist/index.css"

interface SuiProviderProps {
  children: React.ReactNode
}

const defaultNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as
  | "mainnet"
  | "testnet"

/**
 * Explicit client factory matching tbook-vault-fe pattern.
 * Ensures `network` is always passed to SuiJsonRpcClient (required in @mysten/sui@2.15).
 * Without this, the default factory may receive `undefined` config (race in dapp-kit 1.0.4)
 * or tree-shaking may drop the `network` field from the static config object.
 */
function createClient(name: string, config: Record<string, unknown> | undefined) {
  return new SuiJsonRpcClient({
    url: (config?.url as string) ?? `https://fullnode.${name}.sui.io:443`,
    network: name,
  })
}

export function SuiProvider({ children }: SuiProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={defaultNetwork} createClient={createClient}>
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  )
}

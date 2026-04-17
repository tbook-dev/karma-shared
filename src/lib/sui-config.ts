import { createNetworkConfig } from "@mysten/dapp-kit"

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    mainnet: {
      url: "https://fullnode.mainnet.sui.io:443",
      network: "mainnet",
    },
    testnet: {
      url: "https://fullnode.testnet.sui.io:443",
      network: "testnet",
    },
    devnet: {
      url: "https://fullnode.devnet.sui.io:443",
      network: "devnet",
    },
  })

export { networkConfig, useNetworkVariable, useNetworkVariables }

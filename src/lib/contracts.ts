// Network detection
export const isMainnet = process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet"
export const network = isMainnet ? "mainnet" : "testnet"

/**
 * Network-specific configuration
 */
interface NetworkConfig {
  PACKAGE_ID: string
  USDC_TYPE: string
  RCUSDP_TYPE: string
  VAULT_OBJECT_ID: string
  PENDING_DEPOSITS_ID: string
  PENDING_REDEEMS_ID: string
  BALANCES_ID: string
  CLAIMS_ID: string
  USER_RECORD_ID: string
  VAULT_TYPE_CONFIG_ID: string
  DEPOSIT_SETTLEMENT_STATE_ID: string
}

const TESTNET_CONFIG: NetworkConfig = {
  PACKAGE_ID:
    "0xcf7293eba9307057793d0685e4c573b12a2c2928ab60028f1d8766f1d4879c1c",
  USDC_TYPE:
    "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC",
  RCUSDP_TYPE:
    "0xebe1dce0342ac1c5d2cee823c5d9af6ea34ccca51cc95ecafcfe7b1a0dc64947::rcusdp::RCUSDP",
  VAULT_OBJECT_ID:
    "0x8a4af424533e98ce4ca52449acc5721233a81a99665add2b839bd60e1632f4e7",
  PENDING_DEPOSITS_ID:
    "0x888f69e588e7426283d9a2dfac2ffac4233efce1fb05ced22cfa58cac375eabb",
  PENDING_REDEEMS_ID:
    "0x3dc596f41ac76dd680ebfff6a8f9a2601672a008234ef5e68cfe24d16cbfb147",
  BALANCES_ID:
    "0xe157231444fd978a6e1e6f567eed9d643b803d59b5debbccb51d28e3f7ea4f6a",
  CLAIMS_ID:
    "0xe10230a23c1c0a76eb980840c983d3ac1a624373000a1517ff37b52dd890ebe7",
  USER_RECORD_ID:
    "0xabeeefe767c3b89bc9eeb84ec52462f0b293b12976ceba004921261c6b646e75",
  VAULT_TYPE_CONFIG_ID:
    "0x7982d6610aa9e024c442d7b947e399e2cf1cbdcb99aa6eb9eb65f6e6cb71701c",
  DEPOSIT_SETTLEMENT_STATE_ID:
    "0x1fd6cbbaca9c366a81d25432e13320fbf48db50b86e03e4e9798f1ebc843243f",
}

const MAINNET_CONFIG: NetworkConfig = {
  PACKAGE_ID:
    "0x785b8af4bc52d199eedf63f46dd647ea15211fb70300f2fcfdb29c2e96397767",
  USDC_TYPE:
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  RCUSDP_TYPE:
    "0x4dea4916aa61f522aca69c4e7265b8e3bdd65d3947f4fb9aaa6d87e0dfac35fd::rcusdp::RCUSDP",
  VAULT_OBJECT_ID:
    "0x43091ff2385069538025f44301e94ec7a7b09f3edb8a34e3fdb62d067fa5cd16",
  PENDING_DEPOSITS_ID:
    "0x5c25dc938ca4df3930fcf4a6c875bf25cbc304d366a7495b184ccae39dbbcca6",
  PENDING_REDEEMS_ID:
    "0xb3416a4433a943d6a440471b59cce7c8f9f555678e287fad8ef04694c1336fa7",
  BALANCES_ID:
    "0xcf23ee797902955e1ce6e4c8af40797b14b3c9e9d47e6986f69686f4e09e81cb",
  CLAIMS_ID:
    "0x98fab28280c306af4d6b99feb79f913a3f1b95f936f4334534784b86925d8468",
  USER_RECORD_ID:
    "0x3b8925ba0a3d60ad1ff477ed8312947c56c453070a530d630ce83a231531bc72",
  VAULT_TYPE_CONFIG_ID:
    "0x759c0edd69aa0b35b7334830e61a98ccad5c9a84c6a16bfad0e67d64ad6314da",
  DEPOSIT_SETTLEMENT_STATE_ID:
    "0x10fe37f728ddaac591d3b2242e2a1f52f695a990e7864519398ce2aa441e8332",
}

/**
 * Current network configuration
 */
export const SUI_CONTRACTS = isMainnet ? MAINNET_CONFIG : TESTNET_CONFIG

/**
 * Contract module names
 */
export const VAULT_MODULE = "vault"
export const VAULT_API_MODULE = "vault_api"

/**
 * USDC decimals on Sui
 */
export const USDC_DECIMALS = 6

/**
 * Deposit limits (in USDC, human-readable)
 * Testnet uses $1 minimum for testing with limited faucet tokens
 */
export const DEPOSIT_MIN = isMainnet ? 10 : 1
export const DEPOSIT_CAP = isMainnet ? 1_500 : 1_500

/**
 * Record status constants (from vault contract)
 */
export const RECORD_STATUS_PENDING = 0
export const RECORD_STATUS_COMPLETED = 1
export const RECORD_STATUS_CANCELLED = 2

/**
 * Action type constants (from vault.move)
 */
export const ACTION_DEPOSIT = 0
export const ACTION_REDEEM = 1
export const ACTION_CLAIM = 2
export const ACTION_INSTANT_REDEEM = 3
export const ACTION_WITHDRAW_RCUSDP = 4
export const ACTION_CANCEL_DEPOSIT = 5

/**
 * Helper to get full function name for contract calls
 */
export function getVaultFunction(functionName: string): string {
  return `${SUI_CONTRACTS.PACKAGE_ID}::${VAULT_API_MODULE}::${functionName}`
}

/**
 * PLSA-specific contract v3 (deployed on testnet)
 */
export const PLSA_CONTRACTS = {
  // v3.2 deployment — adds UserDeposits.time_unit_sec (admin-tunable for accelerated testing)
  // testnet currently set to 60 sec/"day" via set_time_unit; mainnet would be 86400
  PACKAGE_ID: "0x76f88299ea955a56cc3d0a21dfc1e8dc29a51ddfdf232d21a09507cd7098f951",
  ADMIN_CAP_ID: "0xdc779b757115291379abad285cb2101dfd2f6e05a533a70e3c3ec8e36a43b104",
  CONFIG_ID: "0xd8bc16121ae47b1dc39f83aa4b229c7a5a67582cedccf6fa5153260c197476b8",
  USER_DEPOSITS_ID: "0xded9389fb1c96cead84bf3b5008966df54d898c2e69f33d6eb27722b710e58d2",
  PLSA_VAULT_ID: "0xfba9bf769fbfe66b7d047d630ef25a753948a062ce7672d0ddb273c0667be946",
  REDEMPTION_REGISTRY_ID: "0xa4c67485c753410af15eb82289e9e6e8a2b346210fe04d757a6f2b6ef35c9005",
  DRAW_STATE_ID: "0xb323606cd9235e12ebf399e09ec6029f9ab27a304a15e3fb799efa2987632bea",
  DRAW_REGISTRY_ID: "0xcdc62ef804cb881df0547421b0fb1b2e67ee1b2b3f2f2a4406d4c9ce1fe4b5ee",
  REFERRAL_CONFIG_ID: "0xbcdba1b9eb1e14a3010620a8ef5ec2cfe6a17f8f3fba4e2f9db7de3ac972a64f",
  REFERRAL_REGISTRY_ID: "0xd206702a6ba3240bbc7dec7148333879dad628fdb5c9c8540d3a812612c72cee",
}

/** PendingRedemption status codes (from plsa_vault::STATUS_*) */
export const REDEMPTION_STATUS = {
  PENDING: 0,
  SETTLED: 1,
  CANCELLED: 2,
} as const

/**
 * Build a Sui explorer URL for a given tx digest. Picks network based on env.
 * Default explorer: SuiScan (works for testnet + mainnet).
 */
export function explorerTxUrl(txDigest: string): string {
  const net = isMainnet ? "mainnet" : "testnet"
  return `https://suiscan.xyz/${net}/tx/${txDigest}`
}

/**
 * Lambda API base URL
 */
export const LAMBDA_API_URL =
  process.env.NEXT_PUBLIC_LAMBDA_API_URL ??
  "https://d5a6giwxrgpzqpxktgpgufpvtq0ltxgk.lambda-url.ap-southeast-1.on.aws"

/**
 * Full RPC URL for current network.
 */
export function getSuiRpcUrl(): string {
  return `https://fullnode.${network}.sui.io:443`
}

/**
 * Sui built-in object IDs.
 */
export const SUI_CLOCK_OBJECT_ID = "0x6"
export const SUI_RANDOM_OBJECT_ID = "0x8"

/**
 * AdminCap Move type fully-qualified string (for getOwnedObjects filter).
 */
export const PLSA_ADMIN_CAP_TYPE = `${PLSA_CONTRACTS.PACKAGE_ID}::plsa_vault::AdminCap`

/**
 * Convenience re-exports.
 */
export const PLSA_PACKAGE_ID = PLSA_CONTRACTS.PACKAGE_ID
export const TBOOK_PACKAGE_ID = SUI_CONTRACTS.PACKAGE_ID

import type { PrizeSlide, WeeklyPrizeConfig } from "./schema"

/**
 * PRD §2 Phase I targets (AUM < $5M):
 *   Grand Prize $500 × 1 ; Lucky Prize pool $250 × 20 winners @ $5–$25 each
 */
export const PHASE_I_DEFAULTS = {
  grandAmount: 500,
  luckyPool: 250,
  luckyCount: 20,
  luckyMin: 5,
  luckyMax: 25,
} as const

/**
 * PRD §2 Phase II targets (AUM ≥ $5M):
 *   Grand Prize $2,000 × 1 ; Lucky Prize pool $1,000 × 60 winners
 */
export const PHASE_II_DEFAULTS = {
  grandAmount: 2000,
  luckyPool: 1000,
  luckyCount: 60,
  luckyMin: 5,
  luckyMax: 50,
} as const

export const PHASE_II_TVL_THRESHOLD = 5_000_000

export const DEFAULT_SLIDES: PrizeSlide[] = [
  {
    id: "grand-prize",
    label: "Grand Prize",
    subtitle: "1 winner takes all",
    amount: PHASE_I_DEFAULTS.grandAmount,
    image: "/Grand-Prize.png",
    pill: "Entry-weighted draw",
  },
  {
    id: "lucky-prize",
    label: "Lucky Prize",
    subtitle: "20 winners share the pool",
    amount: PHASE_I_DEFAULTS.luckyPool,
    image: "/Lucky-Prize.png",
    pill: "$5-$25 each",
  },
]

export function buildDefaultConfig(args: {
  round: number
  drawAt: string
  snapshotAt: string
  phase?: "I" | "II"
}): WeeklyPrizeConfig {
  const defaults = args.phase === "II" ? PHASE_II_DEFAULTS : PHASE_I_DEFAULTS
  const slides: PrizeSlide[] = [
    {
      id: "grand-prize",
      label: "Grand Prize",
      subtitle: "1 winner takes all",
      amount: defaults.grandAmount,
      image: "/Grand-Prize.png",
      pill: "Entry-weighted draw",
    },
    {
      id: "lucky-prize",
      label: "Lucky Prize",
      subtitle: `${defaults.luckyCount} winners share the pool`,
      amount: defaults.luckyPool,
      image: "/Lucky-Prize.png",
      pill: `$${defaults.luckyMin}-$${defaults.luckyMax} each`,
    },
  ]
  return {
    round: args.round,
    status: "draft",
    grandAmount: defaults.grandAmount,
    luckyPool: defaults.luckyPool,
    luckyCount: defaults.luckyCount,
    luckyMin: defaults.luckyMin,
    luckyMax: defaults.luckyMax,
    slides,
    drawAt: args.drawAt,
    snapshotAt: args.snapshotAt,
  }
}

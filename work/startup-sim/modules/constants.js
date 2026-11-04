/** Leaf module — no imports from other game modules (avoids ESM init cycles). */

export const STAGES = {
  GARAGE: 'garage',
  OFFICE: 'office',
  XC: 'xc',
  POST_XC: 'post_xc',
  PUBLIC: 'public'
};

/** Legacy name — IPO value is an ARR gate ($1B default), not lifetime revenue. */
export const REVENUE_GATES = {
  OFFICE: 10_000,
  XC: 100_000,
  IPO: 1_000_000_000
};

export const MODE_CONFIG = {
  career: { startingCash: 120_000, difficulty: 1 },
  sandbox: { startingCash: 500_000, difficulty: 0.75 }
};

export function fixedCostsForStage(stage) {
  if (stage === STAGES.GARAGE) return 500;
  if (stage === STAGES.OFFICE) return 2_500;
  if (stage === STAGES.PUBLIC) return 6_500;
  return 4_000;
}

export function createInitialPublicMarket() {
  return {
    ticker: null,
    sharePrice: null,
    ipoPrice: null,
    ipoMonthIndex: null,
    ipoYear: null,
    priorMonthMrr: 0,
    priceHistory: [],
    pressHeadline: null,
    pressDek: null,
    monthsPublic: 0,
    lockupMonthsRemaining: 0
  };
}

export function formatMoney(n) {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1_000_000_000) {
    return `$${(v / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(v) >= 1_000_000) {
    return `$${(v / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(v) >= 1_000) {
    return `$${(v / 1_000).toFixed(1)}k`;
  }
  return `$${Math.round(v).toLocaleString()}`;
}

/** Active desk slots to complete each month. */
export function getMonthlyTaskSlots(stage) {
  switch (stage) {
    case STAGES.GARAGE:
      return 4;
    case STAGES.OFFICE:
      return 6;
    case STAGES.XC:
      return 6;
    case STAGES.POST_XC:
      return 7;
    case STAGES.PUBLIC:
      return 8;
    default:
      return 4;
  }
}

/** How many tasks are offered on the desk before the player picks their lineup. */
export function getMonthlyTaskOfferCount(stage) {
  const slots = getMonthlyTaskSlots(stage);
  return slots + 2;
}

export function stageLabel(stage) {
  switch (stage) {
    case STAGES.GARAGE:
      return 'Garage';
    case STAGES.OFFICE:
      return 'Small office';
    case STAGES.XC:
      return 'X Combinator';
    case STAGES.POST_XC:
      return 'Scaling';
    case STAGES.PUBLIC:
      return 'Public company';
    default:
      return 'Unknown';
  }
}

import { getCategoryById } from './Categories.js';

export const STAGES = {
  GARAGE: 'garage',
  OFFICE: 'office',
  XC: 'xc',
  POST_XC: 'post_xc',
  PUBLIC: 'public'
};

export const REVENUE_GATES = {
  OFFICE: 50_000,
  XC: 500_000,
  IPO: 1_000_000_000
};

export const MODE_CONFIG = {
  career: { startingCash: 120_000, difficulty: 1 },
  sandbox: { startingCash: 500_000, difficulty: 0.75 }
};

export function createInitialState(options) {
  const mode = options.mode === 'sandbox' ? 'sandbox' : 'career';
  const modeCfg = MODE_CONFIG[mode];
  const startingCash =
    mode === 'sandbox'
      ? Number(options.sandboxCash) || modeCfg.startingCash
      : modeCfg.startingCash;

  const category = getCategoryById(options.categoryId);
  if (!category) {
    throw new Error('Invalid startup category');
  }

  return {
    version: 1,
    mode,
    company: {
      name: String(options.companyName || 'Untitled Co.').trim(),
      categoryId: category.id,
      categoryLabel: category.label
    },
    stage: STAGES.GARAGE,
    calendar: { monthIndex: 1, year: 1 },
    finance: {
      cash: startingCash,
      lifetimeRevenue: 0,
      monthlyRevenue: 0,
      valuation: null
    },
    capTable: [
      {
        id: 'founder',
        name: 'You (Founder)',
        shares: 10_000_000,
        pct: 100
      }
    ],
    flags: {
      xcUnlocked: false,
      xcAccepted: false,
      ipoUnlocked: false
    }
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

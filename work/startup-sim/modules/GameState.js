import { getCategoryById } from './Categories.js';
import { createInitialStaff } from './Staff.js';
import { createInitialSocial } from './Social.js';
import { createInitialNews } from './News.js';

export const SAVE_VERSION = 1;

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
    version: SAVE_VERSION,
    mode,
    sandboxStartingCash: mode === 'sandbox' ? startingCash : null,
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
      valuation: null,
      fixedCostsMonthly: 500
    },
    staff: createInitialStaff(),
    product: { researchLevel: 0, featureQueue: [] },
    social: createInitialSocial(),
    news: createInitialNews(),
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

export function normalizeSave(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const state = { ...raw };
  if (!state.staff?.headcountByDept) {
    state.staff = createInitialStaff();
  }
  if (!state.social) state.social = createInitialSocial();
  if (!state.news) state.news = createInitialNews();
  if (!state.product) state.product = { researchLevel: 0, featureQueue: [] };
  if (!state.finance.fixedCostsMonthly) state.finance.fixedCostsMonthly = 500;
  state.version = SAVE_VERSION;
  return state;
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

import { getCategoryById, categoryEconomics } from './Categories.js';
import { createInitialStaff } from './Staff.js';
import { createInitialSocial } from './Social.js';
import { createInitialNews } from './News.js';
import { createInitialCalendar, startMonth } from './Calendar.js';
import { recalculateCapTablePercentages } from './CapTable.js';
import { createInitialOffices } from './Offices.js';
import { createInitialXcState } from './XC.js';
import { createInitialAdvisor } from './Advisor.js';

export const SAVE_VERSION = 6;

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
    monthsPublic: 0
  };
}

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

export function fixedCostsForStage(stage) {
  if (stage === STAGES.GARAGE) return 500;
  if (stage === STAGES.OFFICE) return 2_500;
  if (stage === STAGES.PUBLIC) return 6_500;
  return 4_000;
}

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

  const economics = categoryEconomics(category);

  const state = {
    version: SAVE_VERSION,
    mode,
    sandboxStartingCash: mode === 'sandbox' ? startingCash : null,
    company: {
      name: String(options.companyName || 'Untitled Co.').trim(),
      categoryId: category.id,
      categoryLabel: category.label,
      economics
    },
    stage: STAGES.GARAGE,
    calendar: createInitialCalendar(),
    finance: {
      cash: startingCash,
      lifetimeRevenue: 0,
      monthlyRevenue: 0,
      monthlyBurn: 0,
      mrr: 0,
      valuation: null,
      fixedCostsMonthly: fixedCostsForStage(STAGES.GARAGE),
      instruments: [],
      lastRound: null
    },
    staff: createInitialStaff(),
    product: { level: 0, buzz: 0, featureQueue: [] },
    social: createInitialSocial(),
    news: createInitialNews(),
    offices: createInitialOffices(),
    xc: createInitialXcState(),
    advisor: createInitialAdvisor(),
    publicMarket: createInitialPublicMarket(),
    ending: null,
    capTable: [
      {
        id: 'founder',
        name: 'You (Founder)',
        shares: 10_000_000,
        pct: 100,
        class: 'founder'
      }
    ],
    flags: {
      xcUnlocked: false,
      xcAccepted: false,
      xcResidencyComplete: false,
      seedRoundClosed: false,
      ipoUnlocked: false,
      ipoUnlockedLogged: false,
      ipoFiled: false,
      cashedOut: false,
      xcUnlockedLogged: false,
      gameOver: false,
      gameOverReason: null
    }
  };

  startMonth(state);
  return state;
}

export function normalizeSave(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const state = { ...raw };

  if (!state.staff?.headcountByDept) {
    state.staff = createInitialStaff();
  }
  if (!state.draftHeadcountByDept && state.staff.draftHeadcountByDept) {
    /* ok */
  }
  if (!state.social) state.social = createInitialSocial();
  if (!state.news) state.news = createInitialNews();
  if (!state.product) state.product = { level: 0, buzz: 0, featureQueue: [] };
  if (!state.product.buzz && state.product.buzz !== 0) state.product.buzz = 0;
  if (!state.calendar) state.calendar = createInitialCalendar();
  if (!state.calendar.monthTasks) state.calendar.monthTasks = [];
  if (!state.calendar.log) state.calendar.log = [];
  if (!state.company.economics) {
    const cat = getCategoryById(state.company?.categoryId);
    state.company.economics = categoryEconomics(cat);
  }
  if (!state.finance.fixedCostsMonthly) {
    state.finance.fixedCostsMonthly = fixedCostsForStage(state.stage ?? STAGES.GARAGE);
  }
  if (state.finance.mrr === undefined) state.finance.mrr = state.finance.monthlyRevenue ?? 0;
  if (!state.finance.instruments) state.finance.instruments = [];
  if (state.finance.lastRound === undefined) state.finance.lastRound = null;
  if (!state.flags) state.flags = {};
  if (state.flags.gameOver === undefined) state.flags.gameOver = false;
  if (state.flags.seedRoundClosed === undefined) state.flags.seedRoundClosed = false;
  if (state.flags.xcResidencyComplete === undefined) {
    state.flags.xcResidencyComplete = Boolean(state.flags.xcAccepted && !state.xc);
  }
  if (!state.offices) state.offices = createInitialOffices();
  if (!state.xc) state.xc = createInitialXcState();
  if (!state.advisor) state.advisor = createInitialAdvisor();
  if (!state.publicMarket) state.publicMarket = createInitialPublicMarket();
  if (state.ending === undefined) state.ending = null;
  if (state.flags.ipoUnlockedLogged === undefined) state.flags.ipoUnlockedLogged = false;
  if (state.flags.ipoFiled === undefined) state.flags.ipoFiled = false;
  if (state.flags.cashedOut === undefined) state.flags.cashedOut = false;
  if (state.flags.ipoUnlocked === undefined) state.flags.ipoUnlocked = false;
  if (state.news && state.news.showArchive === undefined) state.news.showArchive = false;
  if (state.flags.xcAccepted && state.flags.xcResidencyComplete === false && !state.xc.residencyMonthsRemaining) {
    state.flags.xcResidencyComplete = true;
  }
  if (state.capTable?.length) {
    recalculateCapTablePercentages(state.capTable);
  }

  if (!state.calendar.monthTasks.length && !state.flags.gameOver) {
    startMonth(state);
  }

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

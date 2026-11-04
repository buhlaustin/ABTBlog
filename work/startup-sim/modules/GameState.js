import { getCategoryById, categoryEconomics } from './Categories.js';
import { createInitialStaff } from './Staff.js';
import { createInitialSocial } from './Social.js';
import { createInitialNews } from './News.js';
import { createInitialCalendar, startMonth } from './Calendar.js';
import { recalculateCapTablePercentages } from './CapTable.js';
import { createInitialOffices } from './Offices.js';
import { createInitialXcState } from './XC.js';
import { createInitialAdvisor } from './Advisor.js';
import { createInitialSentiment } from './Sentiment.js';
import { createCompetitorForCategory } from './Competitor.js';
import { createInitialCrisisState } from './Crisis.js';
import { applySandboxStartingStage } from './SandboxTuning.js';
import { calendarTurn } from './XC.js';
import {
  STAGES,
  REVENUE_GATES,
  MODE_CONFIG,
  fixedCostsForStage,
  formatMoney,
  stageLabel,
  createInitialPublicMarket
} from './constants.js';

export const SAVE_VERSION = 9;

export {
  STAGES,
  REVENUE_GATES,
  MODE_CONFIG,
  fixedCostsForStage,
  formatMoney,
  stageLabel,
  createInitialPublicMarket
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

  const economics = categoryEconomics(category);

  const state = {
    version: SAVE_VERSION,
    mode,
    sandboxStartingCash: mode === 'sandbox' ? startingCash : null,
    sandboxTuning: mode === 'sandbox' ? options.sandboxTuning ?? null : null,
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
    sentiment: createInitialSentiment(),
    world: { competitor: createCompetitorForCategory(category.id) },
    crisis: createInitialCrisisState(),
    meta: {
      runStartedTurn: 1,
      monthsAtIpo: null,
      hofRecorded: false,
      hofHighlights: []
    },
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
      seriesAClosed: false,
      seriesBClosed: false,
      lastDownRound: false,
      ipoUnlocked: false,
      ipoUnlockedLogged: false,
      ipoFiled: false,
      cashedOut: false,
      xcUnlockedLogged: false,
      gameOver: false,
      gameOverReason: null,
      pivotUsed: false
    }
  };

  if (mode === 'sandbox') {
    applySandboxStartingStage(state);
  }

  state.meta.runStartedTurn = calendarTurn(state);
  startMonth(state);
  return state;
}

export function normalizeSave(raw) {
  if (!raw || typeof raw !== 'object') return null;

  try {
    const state = { ...raw };

    if (!state.company || typeof state.company !== 'object') return null;
    if (!state.finance || typeof state.finance !== 'object') return null;

    if (!state.staff?.headcountByDept) {
      state.staff = createInitialStaff();
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
      if (!cat) return null;
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
    if (!state.offices) state.offices = createInitialOffices();
    if (!state.xc) state.xc = createInitialXcState();
    if (state.xc.retryAvailableTurn === undefined) state.xc.retryAvailableTurn = null;
    if (state.xc.needsFollowUpQuestion === undefined) state.xc.needsFollowUpQuestion = false;
    if (!state.advisor) state.advisor = createInitialAdvisor();
    if (!state.sentiment) state.sentiment = createInitialSentiment();
    if (!state.world?.competitor) {
      state.world = {
        competitor: createCompetitorForCategory(state.company?.categoryId ?? 'b2b-saas')
      };
    }
    if (!state.crisis) state.crisis = createInitialCrisisState();
    if (state.flags.seriesAClosed === undefined) state.flags.seriesAClosed = false;
    if (state.flags.seriesBClosed === undefined) state.flags.seriesBClosed = false;
    if (state.flags.lastDownRound === undefined) state.flags.lastDownRound = false;
    if (state.flags.pivotUsed === undefined) state.flags.pivotUsed = false;
    if (!state.meta) {
      state.meta = { runStartedTurn: 1, monthsAtIpo: null, hofRecorded: false, hofHighlights: [] };
    }
    if (state.meta.monthsAtIpo === undefined) state.meta.monthsAtIpo = null;
    if (state.meta.hofRecorded === undefined) state.meta.hofRecorded = false;
    if (!state.meta.hofHighlights) state.meta.hofHighlights = [];
    if (state.mode === 'sandbox' && state.sandboxTuning === undefined) {
      state.sandboxTuning = null;
    }
    if (!state.publicMarket) state.publicMarket = createInitialPublicMarket();
    if (state.publicMarket.lockupMonthsRemaining === undefined) {
      state.publicMarket.lockupMonthsRemaining = state.flags?.ipoFiled ? 0 : 0;
    }
    if (state.ending === undefined) state.ending = null;
    if (state.flags.ipoUnlockedLogged === undefined) state.flags.ipoUnlockedLogged = false;
    if (state.flags.ipoFiled === undefined) state.flags.ipoFiled = false;
    if (state.flags.cashedOut === undefined) state.flags.cashedOut = false;
    if (state.flags.ipoUnlocked === undefined) state.flags.ipoUnlocked = false;
    if (state.news && state.news.showArchive === undefined) state.news.showArchive = false;

    if (state.flags.xcResidencyComplete === undefined) {
      state.flags.xcResidencyComplete = false;
    }
    if (state.flags.xcAccepted && !state.flags.xcResidencyComplete) {
      const remaining = Number(state.xc?.residencyMonthsRemaining) || 0;
      if (remaining > 0) {
        state.flags.xcResidencyComplete = false;
      } else if (state.xc?.batchLabel) {
        state.flags.xcResidencyComplete = true;
      } else {
        state.xc.residencyMonthsRemaining = 3;
        state.xc.batchLabel = 'SF batch (restored save)';
        state.flags.xcResidencyComplete = false;
      }
    }

    if (state.capTable?.length) {
      recalculateCapTablePercentages(state.capTable);
    }

    if (!state.calendar.monthTasks.length && !state.flags.gameOver) {
      startMonth(state);
    }

    state.version = SAVE_VERSION;
    return state;
  } catch {
    return null;
  }
}

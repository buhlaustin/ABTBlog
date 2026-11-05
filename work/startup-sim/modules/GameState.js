import { getCategoryById, categoryEconomics } from './Categories.js';
import { createInitialStaff } from './Staff.js';
import { createInitialSocial } from './Social.js';
import { createInitialNews } from './News.js';
import { createInitialCalendar, startMonth } from './Calendar.js';
import { recalculateCapTablePercentages } from './CapTable.js';
import { createInitialOffices } from './Offices.js';
import { createInitialWorkspace, applyWorkspaceBurn, getWorkspaceTier } from './Workspace.js';
import { createInitialBoard } from './Board.js';
import { createInitialXcState, calendarTurn } from './XC.js';
import { createInitialAdvisor } from './Advisor.js';
import { createInitialSentiment } from './Sentiment.js';
import { createCompetitorForCategory } from './Competitor.js';
import { createInitialCrisisState } from './Crisis.js';
import { applySandboxStartingStage } from './SandboxTuning.js';
import { syncStageFromProgress } from './Progression.js';
import { syncLifetimeProfit } from './Finance.js';
import {
  STAGES,
  REVENUE_GATES,
  MODE_CONFIG,
  fixedCostsForStage,
  formatMoney,
  stageLabel,
  createInitialPublicMarket
} from './constants.js';

export const SAVE_VERSION = 14;

const SANDBOX_CASH_MIN = 10_000;
const SANDBOX_CASH_MAX = 1_000_000_000;

function clampSandboxStartingCash(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(SANDBOX_CASH_MIN, Math.min(SANDBOX_CASH_MAX, Math.round(n)));
}

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
      ? clampSandboxStartingCash(Number(options.sandboxCash), modeCfg.startingCash)
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
      ceoFirstName: String(options.ceoFirstName || 'Founder').trim(),
      ceoLastName: String(options.ceoLastName || '').trim(),
      categoryId: category.id,
      categoryLabel: category.label,
      economics
    },
    workspace: createInitialWorkspace(),
    growth: { campaignsThisMonth: [] },
    board: createInitialBoard(),
    stage: STAGES.GARAGE,
    calendar: createInitialCalendar(),
    finance: {
      cash: startingCash,
      lifetimeRevenue: 0,
      lifetimeExpenses: 0,
      lifetimeProfit: 0,
      monthlyRevenue: 0,
      monthlyBurn: 0,
      mrr: 0,
      arr: 0,
      valuation: null,
      fixedCostsMonthly: fixedCostsForStage(STAGES.GARAGE),
      instruments: [],
      lastRound: null
    },
    staff: createInitialStaff(),
    product: { level: 0, buzz: 0, actionsThisMonth: 0 },
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
      runSeed: Math.floor(Math.random() * 2_147_483_647),
      initialInvestmentCash: startingCash,
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
    accelerators: { joined: [], activeBoost: null },
    flags: {
      xcUnlocked: false,
      xcAccepted: false,
      xcBatchActive: false,
      xcResidencyComplete: false,
      seedRoundClosed: false,
      seriesAClosed: false,
      seriesBClosed: false,
      seriesCClosed: false,
      seriesDClosed: false,
      seriesEClosed: false,
      seriesFClosed: false,
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

  applyWorkspaceBurn(state);
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
    if (!state.product) state.product = { level: 0, buzz: 0 };
    if (!state.product.buzz && state.product.buzz !== 0) state.product.buzz = 0;
    if (state.product.actionsThisMonth === undefined) state.product.actionsThisMonth = 0;
    if (!state.calendar) state.calendar = createInitialCalendar();
    if (!state.calendar.monthTasks) state.calendar.monthTasks = [];
    if (!state.calendar.log) state.calendar.log = [];
    if (!state.calendar.recentTaskIds) state.calendar.recentTaskIds = [];
    if (!state.calendar.monthTaskOffers) state.calendar.monthTaskOffers = [];
    if (state.calendar.taskLineupConfirmed === undefined) {
      state.calendar.taskLineupConfirmed = (state.calendar.monthTasks?.length ?? 0) > 0;
    }
    if (!state.workspace) state.workspace = createInitialWorkspace();
    if (state.executives) delete state.executives;
    if (!state.growth) state.growth = { campaignsThisMonth: [] };
    if (!state.growth.campaignsThisMonth) state.growth.campaignsThisMonth = [];
    if (state.workspace && state.workspace.campusOwned === undefined) {
      state.workspace.campusOwned = getWorkspaceTier(state) === 'campus';
    }
    if (state.finance.lifetimeExpenses === undefined) state.finance.lifetimeExpenses = 0;
    if (state.finance.lifetimeProfit === undefined) {
      state.finance.lifetimeProfit =
        (state.finance.lifetimeRevenue ?? 0) - (state.finance.lifetimeExpenses ?? 0);
    }
    if (state.meta.initialInvestmentCash === undefined) {
      state.meta.initialInvestmentCash =
        state.sandboxStartingCash ?? MODE_CONFIG[state.mode === 'sandbox' ? 'sandbox' : 'career'].startingCash;
    }
    if (state.meta.runSeed === undefined) {
      state.meta.runSeed = Math.floor(Math.random() * 2_147_483_647);
    }
    if (!state.board) state.board = createInitialBoard();
    if (state.board.governanceStreak === undefined) state.board.governanceStreak = 0;
    if (state.publicMarket && state.publicMarket.guidanceBeatStreak === undefined) {
      state.publicMarket.guidanceBeatStreak = 0;
    }
    if (state.finance.arr === undefined) {
      state.finance.arr = Math.round((state.finance.mrr ?? state.finance.monthlyRevenue ?? 0) * 12);
    }
    if (!state.company.ceoFirstName) state.company.ceoFirstName = 'Founder';
    if (state.company.ceoLastName === undefined) state.company.ceoLastName = '';
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
    if (state.advisor.pending) state.advisor.pending = false;
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
    if (state.sandboxTuning?.ipoGateRevenue != null && state.sandboxTuning.ipoGateArr == null) {
      state.sandboxTuning.ipoGateArr = state.sandboxTuning.ipoGateRevenue;
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
    if (state.flags.xcUnlocked === undefined) state.flags.xcUnlocked = false;
    if (state.flags.xcAccepted === undefined) state.flags.xcAccepted = false;
    if (state.flags.xcUnlockedLogged === undefined) state.flags.xcUnlockedLogged = false;
    if (state.news && state.news.showArchive === undefined) state.news.showArchive = false;
    if (state.news && state.news.seedCelebrationShown === undefined) {
      state.news.seedCelebrationShown = false;
    }

    if (state.flags.xcResidencyComplete === undefined) {
      state.flags.xcResidencyComplete = false;
    }
    if (state.flags.xcBatchActive === undefined) {
      state.flags.xcBatchActive = Boolean(
        state.flags.xcAccepted &&
          !state.flags.xcResidencyComplete &&
          (state.xc?.residencyMonthsRemaining ?? 0) > 0
      );
    }
    if (state.flags.xcAccepted && !state.flags.xcResidencyComplete) {
      const remaining = Number(state.xc?.residencyMonthsRemaining) || 0;
      if (remaining > 0) {
        state.flags.xcResidencyComplete = false;
        state.flags.xcBatchActive = true;
      } else if (state.xc?.batchLabel) {
        state.flags.xcResidencyComplete = true;
        state.flags.xcBatchActive = false;
      } else if (!state.xc?.batchStartsTurn) {
        state.xc = state.xc ?? createInitialXcState();
        state.xc.batchStartsTurn = calendarTurn(state);
        state.flags.xcBatchActive = false;
      }
    }
    if (!state.accelerators) state.accelerators = { joined: [], activeBoost: null };
    for (const f of ['seriesCClosed', 'seriesDClosed', 'seriesEClosed', 'seriesFClosed']) {
      if (state.flags[f] === undefined) state.flags[f] = false;
    }

    if (!state.capTable?.length) {
      state.capTable = [
        {
          id: 'founder',
          name: 'You (Founder)',
          shares: 10_000_000,
          pct: 100,
          class: 'founder'
        }
      ];
    } else {
      recalculateCapTablePercentages(state.capTable);
    }

    if (state.stage === STAGES.OFFICE && state.workspace?.tier === 'garage') {
      state.workspace.tier = 'small';
      state.workspace.smallOfficeOwned = true;
      applyWorkspaceBurn(state);
    }

    if (!state.calendar.monthTasks.length && !state.flags.gameOver) {
      startMonth(state);
    }

    syncStageFromProgress(state);
    applyWorkspaceBurn(state);
    syncLifetimeProfit(state);

    state.version = SAVE_VERSION;
    return state;
  } catch {
    return null;
  }
}

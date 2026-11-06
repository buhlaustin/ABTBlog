import { getCategoryById, categoryEconomics } from './Categories.js';
import { createInitialStaff, migrateStaffHeadcount } from './Staff.js';
import { createInitialNews } from './News.js';
import { createInitialCalendar, startMonth } from './Calendar.js';
import { realClockNow, migrateLegacyCalendar, calendarTurnAt, turnToCalendar } from './GameCalendar.js';
import { migratePublicFloatCapTable, recalculateCapTablePercentages } from './CapTable.js';
import { createInitialOffices, satelliteTemplateIdFromEntry } from './Offices.js';
import { createInitialWorkspace, applyWorkspaceBurn, getWorkspaceTier } from './Workspace.js';
import { createInitialBoard } from './Board.js';
import { createInitialXcState, calendarTurn, formatXcBatchCode, nextXcBatchStart } from './XC.js';
import { createInitialSentiment } from './Sentiment.js';
import { createCompetitorForCategory } from './Competitor.js';
import { createInitialAcquisitionsState } from './Acquisitions.js';
import { createInitialCrisisState } from './Crisis.js';
import { createInitialDecisionState } from './DecisionEvents.js';
import { createInitialModifiers } from './ScenarioEffects.js';
import { createInitialLaunchState } from './LaunchLifecycle.js';
import { applySandboxStartingStage } from './SandboxTuning.js';
import { syncStageFromProgress } from './Progression.js';
import { syncLifetimeProfit } from './Finance.js';
import { createInitialFiscal, ensureFiscal } from './CorporateTax.js';
import { ensureCeoPersonalTax } from './CeoPersonalTax.js';
import {
  createInitialCeoState,
  initializeCeoPersonalFinances,
  ensureCeoPersonalBank,
  preparePersonalExpensesForMonth
} from './CeoEconomics.js';
import { createInitialCooState, hireCoo, isCooHired } from './Coo.js';
import { clampCeoBirthMonth, clampCeoBirthYear } from './CeoProfile.js';
import {
  STAGES,
  REVENUE_GATES,
  MODE_CONFIG,
  fixedCostsForStage,
  formatMoney,
  stageLabel,
  createInitialPublicMarket
} from './constants.js';

export const SAVE_VERSION = 33;

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
  const calendarStart =
    mode === 'sandbox' && options.sandboxTuning?.calendarStart
      ? options.sandboxTuning.calendarStart
      : realClockNow();

  const state = {
    version: SAVE_VERSION,
    mode,
    sandboxStartingCash: mode === 'sandbox' ? startingCash : null,
    sandboxTuning: mode === 'sandbox' ? options.sandboxTuning ?? null : null,
    company: {
      name: String(options.companyName || 'Untitled Co.').trim(),
      ceoFirstName: String(options.ceoFirstName || 'Founder').trim(),
      ceoLastName: String(options.ceoLastName || '').trim(),
      ceoBirthMonth: clampCeoBirthMonth(options.ceoBirthMonth),
      ceoBirthYear: clampCeoBirthYear(options.ceoBirthYear),
      categoryId: category.id,
      categoryLabel: category.label,
      economics
    },
    workspace: createInitialWorkspace(),
    growth: { campaignsThisMonth: [], monthCampaignOffers: [], recentCampaignIds: [] },
    board: createInitialBoard(),
    stage: STAGES.GARAGE,
    calendar: createInitialCalendar(calendarStart),
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
      lastRound: null,
      fiscal: createInitialFiscal(),
      section: 'overview'
    },
    ceo: {
      salaryAnnual: 0,
      careerSalaryPaid: 0,
      careerOwnerDraws: 0,
      drawLog: [],
      salaryPayLog: [],
      salaryChangeLog: []
    },
    staff: createInitialStaff(),
    product: { level: 0, buzz: 0, actionsThisMonth: 0 },
    news: createInitialNews(),
    offices: createInitialOffices(),
    xc: createInitialXcState(),
    coo: createInitialCooState(),
    sentiment: createInitialSentiment(),
    world: { competitor: createCompetitorForCategory(category.id), competitorAcquired: false },
    acquisitions: createInitialAcquisitionsState(),
    crisis: createInitialCrisisState(),
    decision: createInitialDecisionState(),
    modifiers: createInitialModifiers(),
    launch: createInitialLaunchState(),
    meta: {
      runStartedTurn: 1,
      runSeed: Math.floor(Math.random() * 2_147_483_647),
      initialInvestmentCash: startingCash,
      monthsAtIpo: null,
      hofRecorded: false,
      hofHighlights: [],
      calendarStartYear: calendarStart.year,
      calendarStartMonth: calendarStart.monthIndex
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
  initializeCeoPersonalFinances(state);
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
    if (!state.staff.benefitsThisMonth) {
      state.staff.benefitsThisMonth = { companyBonusPct: null, offsiteId: null, perks: [] };
    }
    migrateStaffHeadcount(state);
    if (state.ceo) {
      if (!state.ceo.section) state.ceo.section = 'overview';
      if (state.ceo.personalGivingLifetime == null) state.ceo.personalGivingLifetime = 0;
      if (!state.ceo.netWorthHistory) state.ceo.netWorthHistory = [];
      if (state.ceo.investmentBalance == null) state.ceo.investmentBalance = 0;
      if (state.ceo.careerInvestmentReturns == null) state.ceo.careerInvestmentReturns = 0;
      if (state.ceo.lastInvestmentReturn == null) state.ceo.lastInvestmentReturn = 0;
      if (state.ceo.housing?.mortgageOriginalPrincipal == null) {
        state.ceo.housing.mortgageOriginalPrincipal = 0;
      }
      ensureCeoPersonalTax(state);
    }
    if (state.staff.companyBonusAnnualMode === undefined) state.staff.companyBonusAnnualMode = false;
    if (!state.staff.optionPoolLog) state.staff.optionPoolLog = [];
    if (state.staff.optionPoolExpandedThisMonth === undefined) {
      state.staff.optionPoolExpandedThisMonth = false;
    }
    if (!state.staff.peopleSection) state.staff.peopleSection = 'staffing';
    delete state.social;
    if (!state.news) state.news = createInitialNews();
    if (!state.product) state.product = { level: 0, buzz: 0 };
    if (!state.product.buzz && state.product.buzz !== 0) state.product.buzz = 0;
    if (state.product.actionsThisMonth === undefined) state.product.actionsThisMonth = 0;
    if (!state.calendar) state.calendar = createInitialCalendar(realClockNow());
    migrateLegacyCalendar(state);
    if (!state.calendar.monthTasks) state.calendar.monthTasks = [];
    if (!state.calendar.log) state.calendar.log = [];
    if (!state.calendar.recentTaskIds) state.calendar.recentTaskIds = [];
    if (!state.calendar.monthTaskOffers) state.calendar.monthTaskOffers = [];
    if (state.meta && state.meta.deskTasksLifetime == null) state.meta.deskTasksLifetime = 0;
    if (state.calendar.taskLineupConfirmed === undefined) {
      state.calendar.taskLineupConfirmed = (state.calendar.monthTasks?.length ?? 0) > 0;
    }
    if (!state.workspace) state.workspace = createInitialWorkspace();
    if (!state.coo) state.coo = createInitialCooState();
    if (state.coo.hired === undefined) state.coo.hired = false;
    if (state.coo.capTableId === undefined) state.coo.capTableId = null;
    if (state.executives?.roster?.length && !isCooHired(state)) {
      const legacy = state.executives.roster.find((e) => e.roleTitle === 'COO');
      if (legacy?.name) {
        const parts = String(legacy.name).trim().split(/\s+/);
        hireCoo(state, {
          firstName: parts[0] ?? 'Jordan',
          lastName: parts.slice(1).join(' ') || 'Ellis',
          equityPct: 1.5
        });
      }
    }
    delete state.executives;
    if (!state.growth) state.growth = { campaignsThisMonth: [] };
    if (!state.growth.campaignsThisMonth) state.growth.campaignsThisMonth = [];
    if (!state.growth.recentCampaignIds) state.growth.recentCampaignIds = [];
    if (!state.growth.monthCampaignOffers) state.growth.monthCampaignOffers = [];
    if (state.workspace && state.workspace.campusOwned === undefined) {
      state.workspace.campusOwned = getWorkspaceTier(state) === 'campus';
    }
    if (state.finance.lifetimeExpenses === undefined) state.finance.lifetimeExpenses = 0;
    ensureFiscal(state);
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
    if (!state.launch) state.launch = createInitialLaunchState();
    if (state.launch.waitlistSignups == null) state.launch.waitlistSignups = 0;
    if (state.launch.preSellBooked == null) state.launch.preSellBooked = 0;
    if (state.launch.marketingTasksDone == null) state.launch.marketingTasksDone = 0;
    if (state.launch.crowdfundingMrr == null) state.launch.crowdfundingMrr = 0;
    if (state.launch.crowdfundingCampaigns == null) state.launch.crowdfundingCampaigns = 0;
    if (state.launch.productTasksDone == null) state.launch.productTasksDone = 0;
    if (!state.board) state.board = createInitialBoard();
    if (state.board.governanceStreak === undefined) state.board.governanceStreak = 0;
    if (!state.board.members) state.board.members = [];
    if (!state.board.sentimentHistory) state.board.sentimentHistory = [];
    if (state.board.mandateBonusClaimed === undefined) state.board.mandateBonusClaimed = false;
    if (state.board.meetingsHeld === undefined) state.board.meetingsHeld = 0;
    if (state.publicMarket && state.publicMarket.guidanceBeatStreak === undefined) {
      state.publicMarket.guidanceBeatStreak = 0;
    }
    if (state.publicMarket) {
      const pm = state.publicMarket;
      if (pm.guidanceTone === undefined) pm.guidanceTone = 'inline';
      if (pm.priorSharePrice === undefined) pm.priorSharePrice = pm.sharePrice ?? null;
      if (pm.whisperRevenueTarget === undefined) pm.whisperRevenueTarget = 0;
      if (pm.analystRating === undefined) pm.analystRating = null;
      if (pm.analystTarget === undefined) pm.analystTarget = null;
      if (pm.buybackAuthorized === undefined) pm.buybackAuthorized = 0;
      if (pm.buybackUsedLifetime === undefined) pm.buybackUsedLifetime = 0;
      if (pm.shortInterestPct === undefined) pm.shortInterestPct = 0;
      if (pm.earningsSurpriseStreak === undefined) pm.earningsSurpriseStreak = 0;
      if (pm.high52 === undefined) pm.high52 = pm.sharePrice ?? null;
      if (pm.low52 === undefined) pm.low52 = pm.sharePrice ?? null;
      if (pm.indexMember === undefined) pm.indexMember = false;
      if (pm.indexName === undefined) pm.indexName = 'FTEQ-100';
      if (!pm.marketTape) pm.marketTape = [];
      if (pm.institutionalHoldPct === undefined) pm.institutionalHoldPct = 42;
      if (pm.lastSplitTurn === undefined) pm.lastSplitTurn = null;
      if (pm.lastDividendTurn === undefined) pm.lastDividendTurn = null;
      if (pm.lastAnalystActionTurn === undefined) pm.lastAnalystActionTurn = null;
      if (pm.fundamentalPrice === undefined) pm.fundamentalPrice = null;
      if (pm.priceSalesMultiple === undefined) pm.priceSalesMultiple = null;
      if (pm.lastMonthDeltaPct === undefined) pm.lastMonthDeltaPct = null;
      if (!pm.lastTickDrivers) pm.lastTickDrivers = [];
      if (pm.ipoPrimaryProceeds === undefined) pm.ipoPrimaryProceeds = 0;
      if (pm.ipoPrimaryShares === undefined) pm.ipoPrimaryShares = 0;
      if (pm.earningsPrepLevel === undefined) pm.earningsPrepLevel = 0;
      if (!pm.eventsUsedThisMonth) pm.eventsUsedThisMonth = [];
      if (pm.lastIndexOutreachTurn === undefined) pm.lastIndexOutreachTurn = null;
      if (pm.lastCrisisPressTurn === undefined) pm.lastCrisisPressTurn = null;
      if (pm.lastInvestorDayTurn === undefined) pm.lastInvestorDayTurn = null;
      if (pm.lastConferenceTurn === undefined) pm.lastConferenceTurn = null;
      if (pm.streetCredibility === undefined) pm.streetCredibility = 52;
      if (!pm.irEventLog) pm.irEventLog = [];
      if (!pm.publicSection) pm.publicSection = 'market';
      if (!pm.irReadiness) pm.irReadiness = { counsel: false, audit: false, roadshowDeck: false };
      else {
        if (pm.irReadiness.counsel === undefined) pm.irReadiness.counsel = false;
        if (pm.irReadiness.audit === undefined) pm.irReadiness.audit = false;
        if (pm.irReadiness.roadshowDeck === undefined) pm.irReadiness.roadshowDeck = false;
      }
    }
    if (state.finance.section === undefined) state.finance.section = 'overview';
    if (state.finance.arr === undefined) {
      state.finance.arr = Math.round((state.finance.mrr ?? state.finance.monthlyRevenue ?? 0) * 12);
    }
    if (!state.company.ceoFirstName) state.company.ceoFirstName = 'Founder';
    if (state.company.ceoLastName === undefined) state.company.ceoLastName = '';
    if (state.company.ceoBirthMonth == null) state.company.ceoBirthMonth = 6;
    if (state.company.ceoBirthYear == null) state.company.ceoBirthYear = 1990;
    state.company.ceoBirthMonth = clampCeoBirthMonth(state.company.ceoBirthMonth);
    state.company.ceoBirthYear = clampCeoBirthYear(state.company.ceoBirthYear);
    {
      const cat = getCategoryById(state.company?.categoryId);
      if (!cat) return null;
      state.company.categoryLabel = cat.label;
      state.company.economics = categoryEconomics(cat);
    }
    if (!state.finance.fixedCostsMonthly) {
      state.finance.fixedCostsMonthly = fixedCostsForStage(state.stage ?? STAGES.GARAGE);
    }
    if (state.finance.mrr === undefined) state.finance.mrr = state.finance.monthlyRevenue ?? 0;
    if (!state.finance.instruments) state.finance.instruments = [];
    if (!state.finance.loan) {
      state.finance.loan = {
        balance: 0,
        totalDrawn: 0,
        monthlyPayment: 0,
        apr: 0.14,
        creditLimit: 0,
        drawsThisMonth: 0,
        lastDrawTurn: null,
        lastServicedTurn: null,
        history: [],
        creditScore: null,
        refinancedAtSeed: false
      };
    } else {
      if (!state.finance.loan.history) state.finance.loan.history = [];
      if (state.finance.loan.refinancedAtSeed === undefined) state.finance.loan.refinancedAtSeed = false;
    }
    if (!state.finance.rbf) {
      state.finance.rbf = { active: false, principal: 0, owed: 0, sharePct: 0.12, feeMult: 1.28 };
    }
    if (!state.ceo) {
      state.ceo = createInitialCeoState();
    } else {
      if (state.ceo.salaryAnnual === undefined) state.ceo.salaryAnnual = 0;
      if (state.ceo.careerSalaryPaid === undefined) state.ceo.careerSalaryPaid = 0;
      if (state.ceo.careerOwnerDraws === undefined) state.ceo.careerOwnerDraws = 0;
      if (state.ceo.careerEmployeeBonuses === undefined) state.ceo.careerEmployeeBonuses = 0;
      if (state.ceo.careerStockSales === undefined) state.ceo.careerStockSales = 0;
      if (!state.ceo.drawLog) state.ceo.drawLog = [];
      if (!state.ceo.salaryPayLog) state.ceo.salaryPayLog = [];
      if (!state.ceo.salaryChangeLog) state.ceo.salaryChangeLog = [];
      if (!state.ceo.bankLog) state.ceo.bankLog = [];
      if (state.ceo.personalExpenseScheduled === undefined) state.ceo.personalExpenseScheduled = null;
      if (state.ceo.lastPersonalExpense === undefined) state.ceo.lastPersonalExpense = null;
      if (state.ceo.careerPersonalExpensesPaid === undefined) {
        state.ceo.careerPersonalExpensesPaid = 0;
      }
      delete state.ceo.personalBurnMonthly;
      delete state.ceo.personalBurnCustom;
      if (!state.ceo.housing) {
        state.ceo.housing = {
          mode: 'rent',
          tierId: 'rent',
          purchasePrice: 0,
          mortgageBalance: 0,
          mortgagePaymentMonthly: 0,
          maintenanceMonthly: 0,
          purchasedTurn: null
        };
      }
      if (!state.ceo.lifestyleOwned) state.ceo.lifestyleOwned = [];
      if (state.ceo.lifestyleDebitBump == null) state.ceo.lifestyleDebitBump = 0;
    }
    ensureCeoPersonalBank(state);
    preparePersonalExpensesForMonth(state);
    if (state.finance.lastRound === undefined) state.finance.lastRound = null;
    if (!state.flags) state.flags = {};
    if (state.flags.gameOver === undefined) state.flags.gameOver = false;
    if (state.flags.seedRoundClosed === undefined) state.flags.seedRoundClosed = false;
    if (!state.offices) state.offices = createInitialOffices();
    if (state.offices && !state.offices.usedSatelliteTemplateIds) {
      state.offices.usedSatelliteTemplateIds = [];
      for (const s of state.offices.satellites ?? []) {
        const tid = satelliteTemplateIdFromEntry(s);
        if (tid && !state.offices.usedSatelliteTemplateIds.includes(tid)) {
          state.offices.usedSatelliteTemplateIds.push(tid);
        }
      }
    }
    if (!state.xc) state.xc = createInitialXcState();
    if (state.xc.retryAvailableTurn === undefined) state.xc.retryAvailableTurn = null;
    if (state.xc.needsFollowUpQuestion === undefined) state.xc.needsFollowUpQuestion = false;
    delete state.advisor;
    if (!state.sentiment) state.sentiment = createInitialSentiment();
    if (!state.world?.competitor) {
      state.world = {
        competitor: createCompetitorForCategory(state.company?.categoryId ?? 'b2b-saas')
      };
    }
    if (!state.crisis) state.crisis = createInitialCrisisState();
    if (!state.decision) state.decision = createInitialDecisionState();
    if (!state.modifiers?.active) state.modifiers = createInitialModifiers();
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
    if (state.meta.deskTasksLifetime == null) state.meta.deskTasksLifetime = 0;
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
    if (state.news && state.news.unreadCount === undefined) {
      state.news.unreadCount = 0;
    }
    if (state.news && state.news.publishedTurn === undefined) {
      state.news.publishedTurn = null;
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
        const batchStart = nextXcBatchStart(state.calendar.year, state.calendar.monthIndex);
        state.xc.scheduledBatchCode = formatXcBatchCode(batchStart.year, batchStart.monthIndex);
        state.xc.batchStartsTurn = calendarTurnAt(state, batchStart.year, batchStart.monthIndex);
        state.flags.xcBatchActive = false;
      }
    }
    if (state.xc?.batchStartsTurn != null && !state.xc.scheduledBatchCode) {
      const cal = turnToCalendar(state, state.xc.batchStartsTurn);
      state.xc.scheduledBatchCode = formatXcBatchCode(cal.year, cal.monthIndex);
    }
    if (state.xc?.batchLabel?.startsWith('Batch ') && state.xc.scheduledBatchCode) {
      state.xc.batchLabel = state.xc.scheduledBatchCode;
    }
    if (state.xc && state.xc.demoDayTaskDone === undefined) state.xc.demoDayTaskDone = false;
    if (state.xc && state.xc.demoDayPitch === undefined) state.xc.demoDayPitch = null;
    if (state.xc && state.xc.demoDayBoldHit === undefined) state.xc.demoDayBoldHit = null;
    if (state.xc && state.xc.seedRoundTerms === undefined) state.xc.seedRoundTerms = null;
    if (!state.acquisitions) state.acquisitions = createInitialAcquisitionsState();
    if (!state.acquisitions.owned) state.acquisitions.owned = [];
    if (!state.acquisitions.dealLog) state.acquisitions.dealLog = [];
    if (state.acquisitions.marketSegment === undefined) state.acquisitions.marketSegment = 'all';
    if (state.acquisitions.marketPage === undefined) state.acquisitions.marketPage = 0;
    if (state.acquisitions.lifetimePortfolioRevenue === undefined) {
      state.acquisitions.lifetimePortfolioRevenue = 0;
    }
    if (!state.acquisitions.diligenceReports) state.acquisitions.diligenceReports = {};
    if (!state.acquisitions.fireSaleIds) state.acquisitions.fireSaleIds = [];
    if (state.acquisitions.fireSaleTurn === undefined) state.acquisitions.fireSaleTurn = null;
    if (!state.acquisitions.companiesSection) state.acquisitions.companiesSection = 'pulse';
    if (!state.acquisitions.marketSort) state.acquisitions.marketSort = 'ask';
    if (state.acquisitions.marketSearch === undefined) state.acquisitions.marketSearch = '';
    for (const h of state.acquisitions.owned) {
      if (h.integrationMonthsLeft === undefined) h.integrationMonthsLeft = 0;
      if (h.purchasePrice === undefined) h.purchasePrice = 0;
      if (h.lastReinvestTurn === undefined) h.lastReinvestTurn = h.acquiredTurn ?? 1;
      if (h.valuationMark == null) h.valuationMark = 1;
      if (h.lastValuationDriftPct == null) h.lastValuationDriftPct = 0;
    }
    if (state.world && state.world.competitorAcquired === undefined) {
      state.world.competitorAcquired = false;
    }
    if (state.finance && state.finance.subsidiaryMrr === undefined) {
      state.finance.subsidiaryMrr = 0;
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
      migratePublicFloatCapTable(state);
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

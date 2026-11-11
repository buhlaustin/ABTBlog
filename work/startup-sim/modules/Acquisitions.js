import { fetchGameJson } from './utils.js';
import { formatMoney } from './constants.js';
import { calendarTurn } from './XC.js';
import { formatCalendarStamp } from './GameCalendar.js';
import { progressionTier } from './ProgressionEconomy.js';
import { recordCashOutflow } from './Finance.js';
import { ensureCeoPersonalBank } from './CeoEconomics.js';
import { accrueFiscalRevenue } from './CorporateTax.js';
import { easeCompetitorPressure, bumpCompetitorPressure } from './Competitor.js';
import { setGameFeedback } from './GameFeedback.js';
import bundled from '../data/acquisition-targets.json' with { type: 'json' };

export const MARKET_PAGE_SIZE = 18;
export const ACQUISITION_DILIGENCE_COST = 10_000;
/** Personal portfolio subsidiaries pay this multiple vs the same target owned on the balance sheet. */
export const PERSONAL_PORTFOLIO_MRR_MULT = 10;
const CATEGORY_IDS = [
  'b2b-saas',
  'consumer-social',
  'marketplace',
  'delivery',
  'fintech',
  'ai-tools',
  'hardware',
  'healthtech',
  'edtech',
  'climate',
  'gaming-media'
];

let catalog = bundled.companies ?? [];
let hydrated = false;

export function createInitialAcquisitionsState() {
  return {
    owned: [],
    personalOwned: [],
    marketSegment: 'all',
    marketSort: 'ask',
    marketSearch: '',
    marketPage: 0,
    lifetimePortfolioRevenue: 0,
    dealLog: [],
    diligenceReports: {},
    fireSaleIds: [],
    fireSaleTurn: null,
    companiesSection: 'pulse'
  };
}

async function loadCatalog() {
  if (hydrated) return catalog;
  try {
    const data = await fetchGameJson('data/acquisition-targets.json');
    if (Array.isArray(data?.companies) && data.companies.length) catalog = data.companies;
  } catch {
    /* bundled */
  }
  hydrated = true;
  return catalog;
}

export function preloadAcquisitionCatalog() {
  return loadCatalog();
}

export function getAcquisitionCatalog() {
  return catalog;
}

function hash01(seed, id, salt = 0) {
  let h = (seed ^ salt) >>> 0;
  const s = String(id);
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b1);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

export function acquisitionsUnlocked(state) {
  return Boolean(state.flags?.xcResidencyComplete);
}

function ensureAcquisitions(state) {
  if (!state.acquisitions) state.acquisitions = createInitialAcquisitionsState();
  if (!state.acquisitions.owned) state.acquisitions.owned = [];
  if (!state.acquisitions.personalOwned) state.acquisitions.personalOwned = [];
  if (!state.acquisitions.dealLog) state.acquisitions.dealLog = [];
  if (!state.acquisitions.marketSegment) state.acquisitions.marketSegment = 'all';
  if (state.acquisitions.marketPage == null) state.acquisitions.marketPage = 0;
  if (!state.acquisitions.marketSort) state.acquisitions.marketSort = 'ask';
  if (state.acquisitions.marketSearch == null) state.acquisitions.marketSearch = '';
  if (!state.acquisitions.diligenceReports) state.acquisitions.diligenceReports = {};
  if (!state.acquisitions.fireSaleIds) state.acquisitions.fireSaleIds = [];
  if (!state.acquisitions.companiesSection) state.acquisitions.companiesSection = 'pulse';
}

export function isAcquisitionFireSale(state, companyId) {
  return (state.acquisitions?.fireSaleIds ?? []).includes(companyId);
}

function isFireSale(state, companyId) {
  return isAcquisitionFireSale(state, companyId);
}

export function monthsHeld(state, holding) {
  return Math.max(0, calendarTurn(state) - (holding.acquiredTurn ?? calendarTurn(state)));
}

function refreshFireSales(state) {
  ensureAcquisitions(state);
  const turn = calendarTurn(state);
  if (state.acquisitions.fireSaleTurn === turn) return;
  state.acquisitions.fireSaleTurn = turn;
  const seed = state.meta?.runSeed ?? 1;
  const pool = catalog.filter((c) => isTargetVisible(state, c) && !ownedIds(state).has(c.id));
  const picks = [];
  for (let attempt = 0; attempt < 24 && picks.length < 2 && pool.length; attempt += 1) {
    const idx = Math.floor(hash01(seed, 'fire-sale', turn * 17 + attempt) * pool.length);
    const id = pool[idx]?.id;
    if (id && !picks.includes(id)) picks.push(id);
  }
  state.acquisitions.fireSaleIds = picks;
}

export function marketBrief(state) {
  const turn = calendarTurn(state);
  const seed = state.meta?.runSeed ?? 1;
  const tier = progressionTier(state);
  const notes = [
    'Bulge-bracket bankers say strategics are back — enterprise asks firming.',
    'Small-cap roll-ups trading below 6× ARR in your segment this month.',
    'Debt markets tight; sellers prefer cash at close.',
    'PE funds circling mid-market SaaS — expect bidding wars on hot names.',
    'Public comps wobbled — soft asks on mid-market targets may linger.',
    'Corporate development teams hunting vertical fit before year-end.'
  ];
  const base = notes[Math.floor(hash01(seed, 'brief', turn) * notes.length)];
  const tierNote = tier >= 4 ? ' Your scale lets you digest larger platforms.' : '';
  const fire = (state.acquisitions?.fireSaleIds?.length ?? 0) > 0 ? ' Two fire-sale listings at −15%.' : '';
  return `${base}${tierNote}${fire}`;
}

export function portfolioMix(state) {
  const mix = { small: 0, mid: 0, enterprise: 0, giant: 0 };
  for (const h of state.acquisitions?.owned ?? []) {
    const def = catalog.find((c) => c.id === h.id);
    if (!def) continue;
    mix[def.segment] = (mix[def.segment] ?? 0) + subsidiaryMrr(state, h, def);
  }
  return mix;
}

function ownedIds(state) {
  ensureAcquisitions(state);
  const ids = [
    ...(state.acquisitions.owned ?? []).map((h) => h.id),
    ...(state.acquisitions.personalOwned ?? []).map((h) => h.id)
  ];
  return new Set(ids);
}

export function isTargetVisible(state, company) {
  if (company.isRival && company.rivalCategory !== state.company?.categoryId) return false;
  return true;
}

export function inferredMarketCategory(state, company) {
  if (company.rivalCategory) return company.rivalCategory;
  if (company.marketCategory) return company.marketCategory;
  const seed = state.meta?.runSeed ?? 1;
  const idx = Math.floor(hash01(seed, company.id, 17) * CATEGORY_IDS.length);
  return CATEGORY_IDS[idx] ?? 'b2b-saas';
}

export function categorySynergyMult(state, company) {
  const player = state.company?.categoryId;
  if (!player) return 1;
  if (company.isRival && company.rivalCategory === player) return 1.1;
  if (inferredMarketCategory(state, company) === player) return 1.06;
  return 1;
}

export function portfolioSynergyMult(state) {
  const n = state.acquisitions?.owned?.length ?? 0;
  return 1 + Math.min(0.2, n * 0.025);
}

function integrationMonthsForSegment(segment, isRival) {
  if (isRival) return 3;
  if (segment === 'giant') return 4;
  if (segment === 'enterprise') return 2;
  if (segment === 'mid') return 1;
  return 0;
}

export function holdingIntegrationMrrFactor(_holding) {
  return 1;
}

function integrationMrrFactor(holding) {
  return holdingIntegrationMrrFactor(holding);
}

function baseAskPrice(state, company) {
  const turn = calendarTurn(state);
  const seed = state.meta?.runSeed ?? 1;
  const vol = 0.82 + hash01(seed, company.id, turn) * 0.38;
  const tierBoost = 1 + progressionTier(state) * 0.035;
  const synergyDiscount = categorySynergyMult(state, company) > 1 ? 0.97 : 1;
  return company.basePrice * vol * tierBoost * synergyDiscount;
}

export function targetAskPrice(state, company) {
  if (ownedIds(state).has(company.id)) return null;
  let price = baseAskPrice(state, company);
  if (isFireSale(state, company.id)) price *= 0.85;
  return Math.round(price);
}

export function fairValueEstimate(state, company) {
  const annual = Math.max(1, company.baseMrr * 12);
  let multiple = 5.5;
  if (company.segment === 'giant') multiple = 20;
  else if (company.segment === 'enterprise') multiple = 14;
  else if (company.segment === 'mid') multiple = 9;
  const synergy = categorySynergyMult(state, company);
  return Math.round(annual * multiple * synergy);
}

export function marketPriceLabel(state, company) {
  const ask = targetAskPrice(state, company);
  if (ask == null) return { ask: null, trend: 'owned' };
  const seed = state.meta?.runSeed ?? 1;
  const turn = calendarTurn(state);
  const vol = 0.82 + hash01(seed, company.id, turn) * 0.38;
  const trend = vol >= 1.02 ? 'hot' : vol <= 0.92 ? 'soft' : 'fair';
  const fair = fairValueEstimate(state, company);
  const vsFair = ask <= fair * 0.92 ? ' bargain' : ask >= fair * 1.08 ? ' premium' : '';
  return { ask, trend, fair, vsFair };
}

const VALUATION_MARK_MIN = 0.65;
const VALUATION_MARK_MAX = 1.85;
/** Max absolute monthly mark move (~±3.5%). */
const VALUATION_DRIFT_MAX = 0.035;

function holdingHealth(holding) {
  return Math.max(0.55, Math.min(2.2, Number(holding.health) || 1));
}

export function subsidiaryValuationMark(holding) {
  return Math.max(VALUATION_MARK_MIN, Math.min(VALUATION_MARK_MAX, Number(holding?.valuationMark) || 1));
}

function monthlyValuationDriftPct(state, holdingId) {
  const seed = state.meta?.runSeed ?? 1;
  const turn = calendarTurn(state);
  const u = hash01(seed, `${holdingId}-mark`, turn * 41 + 11);
  return (u * 2 - 1) * VALUATION_DRIFT_MAX;
}

function applyMonthlyValuationDrift(state, holding) {
  const turn = calendarTurn(state);
  if (holding.lastMarkTurn === turn) return null;
  holding.lastMarkTurn = turn;
  if (holding.valuationMark == null) holding.valuationMark = 1;
  let drift = monthlyValuationDriftPct(state, holding.id);
  const held = monthsHeld(state, holding);
  if (held <= 2) drift = Math.max(0, drift);
  if (holding.lastReinvestTurn === turn) drift = Math.max(drift, 0.012);
  holding.lastValuationDriftPct = drift;
  holding.valuationMark = Math.max(
    VALUATION_MARK_MIN,
    Math.min(VALUATION_MARK_MAX, subsidiaryValuationMark(holding) * (1 + drift))
  );
  return drift;
}

export function subsidiaryMrr(state, holding, company) {
  if (!company) return 0;
  const base = company.baseMrr * holdingHealth(holding) * integrationMrrFactor(holding);
  return Math.max(0, Math.round(base * categorySynergyMult(state, company)));
}

export function totalSubsidiaryMrr(state) {
  if (!state.acquisitions?.owned?.length) return 0;
  let sum = 0;
  for (const h of state.acquisitions.owned) {
    const def = catalog.find((c) => c.id === h.id);
    if (def) sum += subsidiaryMrr(state, h, def);
  }
  return Math.round(sum * portfolioSynergyMult(state));
}

export function portfolioExitValue(state) {
  let sum = 0;
  for (const h of state.acquisitions?.owned ?? []) {
    const def = catalog.find((c) => c.id === h.id);
    if (def) sum += subsidiarySalePrice(state, h, def);
  }
  return sum;
}

export function portfolioInvestedTotal(state) {
  return (state.acquisitions?.owned ?? []).reduce(
    (acc, h) => acc + (h.purchasePrice ?? 0) + (h.investedTotal ?? 0),
    0
  );
}

export function subsidiarySalePrice(state, holding, company) {
  const health = holdingHealth(holding);
  const mark = subsidiaryValuationMark(holding);
  const invested = holding.investedTotal ?? 0;
  const held = monthsHeld(state, holding);
  const holdBonus = 1 + Math.min(0.12, Math.floor(held / 6) * 0.02);
  const core = company.basePrice * health * mark * categorySynergyMult(state, company) * holdBonus;
  const sale = Math.round(core + invested * 0.82);
  const costBasis = (holding.purchasePrice ?? 0) + (holding.investedTotal ?? 0);
  return Math.max(sale, costBasis);
}

/** Implied equity value for reinvestment sizing (exit mark, not purchase price). */
export function subsidiaryImpliedValue(state, holding, company) {
  return subsidiarySalePrice(state, holding, company);
}

export const REINVEST_PROGRAMS = [
  {
    id: 'product',
    label: 'Product & engineering',
    blurb: 'Ship roadmap, pay down tech debt, lift unit economics.',
    healthFactor: 1.15,
    integrationMonths: 0
  },
  {
    id: 'gtm',
    label: 'GTM expansion',
    blurb: 'Sales pods, demand gen, and channel programs.',
    healthFactor: 1.05,
    integrationMonths: 0
  },
  {
    id: 'integration',
    label: 'Integration sprint',
    blurb: 'PMO, systems migration, and synergy capture.',
    healthFactor: 1.1,
    integrationMonths: 1
  },
  {
    id: 'operations',
    label: 'Ops & retention',
    blurb: 'CS coverage, billing ops, and margin hygiene.',
    healthFactor: 1.0,
    integrationMonths: 0
  }
];

export function resolveReinvestProgram(id) {
  return REINVEST_PROGRAMS.find((p) => p.id === id) ?? REINVEST_PROGRAMS[0];
}

function reinvestProgram(id) {
  return resolveReinvestProgram(id);
}

/** Cash required to deploy `pct`% of subsidiary implied value (0.5–25). */
export function computeReinvestQuote(state, targetId, pctOfValue, programId = 'product') {
  ensureAcquisitions(state);
  const holding = state.acquisitions.owned.find((h) => h.id === targetId);
  if (!holding) return { ok: false, reason: 'You do not own that company.' };
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Unknown subsidiary.' };

  const pct = Number(pctOfValue);
  if (!Number.isFinite(pct) || pct < 0.5 || pct > 25) {
    return { ok: false, reason: 'Choose 0.5%–25% of subsidiary value.' };
  }

  const impliedValue = subsidiaryImpliedValue(state, holding, company);
  let amount = Math.round((impliedValue * pct) / 100);
  const floor = Math.max(5_000, Math.round(impliedValue * 0.002));
  if (amount < floor) amount = floor;

  const cash = state.finance?.cash ?? 0;
  if (cash < amount) {
    return {
      ok: false,
      reason: `Need ${formatMoney(amount)} cash (${pct}% of ~${formatMoney(impliedValue)} value).`
    };
  }

  const program = reinvestProgram(programId);
  const healthDelta = (amount / Math.max(impliedValue, 1)) * 0.42 * Math.max(1, program.healthFactor);
  const projectedHealth = Math.min(2.2, holdingHealth(holding) + Math.max(healthDelta, 0.01));

  return {
    ok: true,
    company,
    holding,
    program,
    pctOfValue: pct,
    impliedValue,
    amount,
    projectedHealth,
    integrationSkip: program.integrationMonths
  };
}

function pushDealLog(state, entry) {
  ensureAcquisitions(state);
  state.acquisitions.dealLog.unshift({
    turn: calendarTurn(state),
    year: state.calendar.year,
    month: state.calendar.monthIndex,
    ...entry
  });
  state.acquisitions.dealLog = state.acquisitions.dealLog.slice(0, 12);
}

export function setCompaniesMarketFilter(state, segment) {
  ensureAcquisitions(state);
  state.acquisitions.marketSegment = segment || 'all';
  state.acquisitions.marketPage = 0;
}

export function setCompaniesMarketPage(state, delta) {
  ensureAcquisitions(state);
  const maxPage = Math.max(0, Math.ceil(filteredMarketTargets(state).length / MARKET_PAGE_SIZE) - 1);
  const next = (state.acquisitions.marketPage ?? 0) + delta;
  state.acquisitions.marketPage = Math.max(0, Math.min(maxPage, next));
}

export function setCompaniesMarketSort(state, sort) {
  ensureAcquisitions(state);
  state.acquisitions.marketSort = sort || 'ask';
  state.acquisitions.marketPage = 0;
}

export function setCompaniesMarketSearch(state, query) {
  ensureAcquisitions(state);
  state.acquisitions.marketSearch = String(query ?? '').trim().toLowerCase();
  state.acquisitions.marketPage = 0;
}

const DILIGENCE_COST = ACQUISITION_DILIGENCE_COST;

export function runDueDiligence(state, targetId) {
  if (!acquisitionsUnlocked(state)) {
    return { ok: false, reason: 'Acquisitions unlock after your XC batch.' };
  }
  ensureAcquisitions(state);
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Target not found.' };
  if (ownedIds(state).has(targetId)) return { ok: false, reason: 'You already own this company.' };
  if (state.acquisitions.diligenceReports[targetId]) {
    return { ok: false, reason: 'Due diligence already on file for this target.' };
  }
  if ((state.finance?.cash ?? 0) < DILIGENCE_COST) {
    return { ok: false, reason: `Due diligence costs ${formatMoney(DILIGENCE_COST)}.` };
  }
  state.finance.cash -= DILIGENCE_COST;
  recordCashOutflow(state, DILIGENCE_COST, 'acquisition-diligence');
  const seed = state.meta?.runSeed ?? 1;
  const qualityScore = Math.round((0.96 + hash01(seed, targetId, 404) * 0.08) * 100) / 100;
  const hiddenDebt = hash01(seed, targetId, 405) > 0.82;
  state.acquisitions.diligenceReports[targetId] = {
    qualityScore,
    hiddenDebt,
    integrationExtra: hiddenDebt ? 1 : 0
  };
  const name = displayName(state, company);
  return {
    ok: true,
    company,
    name,
    qualityScore,
    hiddenDebt,
    summary: hiddenDebt
      ? `${name}: quality ${qualityScore} — hidden integration debt (+1 mo); closes at 1.0× health like any deal.`
      : `${name}: clean file — quality ${qualityScore}; all acquisitions open at 1.0× health.`
  };
}

export function listMarketTargets(state) {
  refreshFireSales(state);
  return filteredMarketTargets(state);
}

function filteredMarketTargets(state) {
  refreshFireSales(state);
  const seg = state.acquisitions?.marketSegment ?? 'all';
  const q = state.acquisitions?.marketSearch ?? '';
  const list = catalog
    .filter((c) => isTargetVisible(state, c) && !ownedIds(state).has(c.id))
    .filter((c) => {
      if (seg === 'all') return true;
      if (seg === 'rival') return c.isRival;
      return c.segment === seg;
    })
    .filter((c) => {
      if (!q) return true;
      const name = displayName(state, c).toLowerCase();
      return name.includes(q) || c.description?.toLowerCase().includes(q);
    });
  const sort = state.acquisitions?.marketSort ?? 'ask';
  list.sort((a, b) => {
    if (sort === 'mrr') return b.baseMrr - a.baseMrr;
    if (sort === 'multiple') {
      const ma = targetAskPrice(state, a) / Math.max(1, a.baseMrr * 12);
      const mb = targetAskPrice(state, b) / Math.max(1, b.baseMrr * 12);
      return ma - mb;
    }
    return targetAskPrice(state, b) - targetAskPrice(state, a);
  });
  return list;
}

function newAcquisitionHolding(state, company, price, report, integrationMonthsLeft) {
  return {
    id: company.id,
    acquiredTurn: calendarTurn(state),
    purchasePrice: price,
    health: 1,
    investedTotal: 0,
    integrationMonthsLeft,
    lastReinvestTurn: calendarTurn(state),
    valuationMark: 1,
    lastValuationDriftPct: 0,
    lastMarkTurn: calendarTurn(state),
    dueDiligenceQuality: report?.qualityScore ?? null
  };
}

export function purchaseTarget(state, targetId) {
  if (!acquisitionsUnlocked(state)) {
    return { ok: false, reason: 'Finish your X Combinator batch before buying companies.' };
  }
  ensureAcquisitions(state);
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Company not on the market.' };
  if (!isTargetVisible(state, company)) return { ok: false, reason: 'That target is not in your market.' };
  if (ownedIds(state).has(company.id)) return { ok: false, reason: 'You already own this company.' };

  const price = targetAskPrice(state, company);
  if ((state.finance?.cash ?? 0) < price) {
    return { ok: false, reason: `Need ${formatMoney(price)} cash (you have ${formatMoney(state.finance?.cash ?? 0)}).` };
  }

  state.finance.cash -= price;
  recordCashOutflow(state, price, 'acquisition');
  const report = state.acquisitions.diligenceReports?.[company.id];
  let integrationMonthsLeft = integrationMonthsForSegment(company.segment, company.isRival);
  if (report?.integrationExtra) integrationMonthsLeft += 1;
  const holding = newAcquisitionHolding(state, company, price, report, integrationMonthsLeft);
  state.acquisitions.owned.push(holding);
  if (report) delete state.acquisitions.diligenceReports[company.id];
  state.acquisitions.fireSaleIds = (state.acquisitions.fireSaleIds ?? []).filter((id) => id !== company.id);

  if (company.isRival) {
    state.world.competitorAcquired = true;
    if (state.world?.competitor) state.world.competitor.pressure = 0;
    easeCompetitorPressure(state, 5);
  }

  const mrr = subsidiaryMrr(state, holding, company);
  pushDealLog(state, {
    kind: 'buy',
    name: company.isRival ? state.world?.competitor?.name ?? company.name : company.name,
    amount: price,
    detail: integrationMonthsLeft
      ? `Integration ${integrationMonthsLeft} mo to full MRR`
      : 'Fully integrated'
  });
  return { ok: true, company, price, mrr, integrationMonthsLeft };
}

/** Buy a target with CEO personal bank — MRR pays to personal cash, not the company. */
export function purchaseTargetPersonal(state, targetId) {
  if (!acquisitionsUnlocked(state)) {
    return { ok: false, reason: 'Finish your X Combinator batch before buying companies.' };
  }
  ensureAcquisitions(state);
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Company not on the market.' };
  if (!isTargetVisible(state, company)) return { ok: false, reason: 'That target is not in your market.' };
  if (ownedIds(state).has(company.id)) return { ok: false, reason: 'You already own this company.' };

  const price = targetAskPrice(state, company);
  ensureCeoPersonalBank(state);
  const bank = state.ceo?.bankBalance ?? 0;
  if (bank < price) {
    return {
      ok: false,
      reason: `Need ${formatMoney(price)} in your personal bank (have ${formatMoney(bank)}).`
    };
  }

  state.ceo.bankBalance = bank - price;
  const report = state.acquisitions.diligenceReports?.[company.id];
  let integrationMonthsLeft = integrationMonthsForSegment(company.segment, company.isRival);
  if (report?.integrationExtra) integrationMonthsLeft += 1;
  const holding = { ...newAcquisitionHolding(state, company, price, report, integrationMonthsLeft), funding: 'personal' };
  state.acquisitions.personalOwned.push(holding);
  if (report) delete state.acquisitions.diligenceReports[company.id];
  state.acquisitions.fireSaleIds = (state.acquisitions.fireSaleIds ?? []).filter((id) => id !== company.id);

  if (company.isRival) {
    state.world.competitorAcquired = true;
    if (state.world?.competitor) state.world.competitor.pressure = 0;
    easeCompetitorPressure(state, 5);
  }

  const mrr = subsidiaryMrr(state, holding, company);
  pushDealLog(state, {
    kind: 'buy-personal',
    name: company.isRival ? state.world?.competitor?.name ?? company.name : company.name,
    amount: price,
    detail: integrationMonthsLeft
      ? `Personal deal · integration ${integrationMonthsLeft} mo`
      : 'Personal deal · fully integrated'
  });
  return { ok: true, company, price, mrr, integrationMonthsLeft, personal: true };
}

function totalPersonalSubsidiaryMrr(state) {
  if (!state.acquisitions?.personalOwned?.length) return 0;
  let sum = 0;
  for (const h of state.acquisitions.personalOwned) {
    const def = catalog.find((c) => c.id === h.id);
    if (def) sum += subsidiaryMrr(state, h, def);
  }
  return Math.round(sum * portfolioSynergyMult(state) * PERSONAL_PORTFOLIO_MRR_MULT);
}

export function applyPersonalSubsidiaryMrrPayout(state) {
  const total = totalPersonalSubsidiaryMrr(state);
  if (!total) return { total: 0, lines: [] };
  ensureCeoPersonalBank(state);
  state.ceo.bankBalance = (state.ceo.bankBalance ?? 0) + total;
  state.ceo.careerPersonalPortfolioIncome = (state.ceo.careerPersonalPortfolioIncome ?? 0) + total;
  return {
    total,
    lines: [`Personal portfolio MRR: +${formatMoney(total)} deposited to your bank.`]
  };
}

export function sellPersonalSubsidiary(state, targetId) {
  ensureAcquisitions(state);
  const idx = (state.acquisitions.personalOwned ?? []).findIndex((h) => h.id === targetId);
  if (idx < 0) return { ok: false, reason: 'You do not personally own that company.' };
  const holding = state.acquisitions.personalOwned[idx];
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Unknown subsidiary.' };

  const proceeds = subsidiarySalePrice(state, holding, company);
  ensureCeoPersonalBank(state);
  state.ceo.bankBalance = (state.ceo.bankBalance ?? 0) + proceeds;
  state.acquisitions.personalOwned.splice(idx, 1);

  if (company.isRival) {
    state.world.competitorAcquired = false;
    bumpCompetitorPressure(state, 2);
  }

  pushDealLog(state, {
    kind: 'sell-personal',
    name: company.isRival ? state.world?.competitor?.name ?? company.name : company.name,
    amount: proceeds,
    detail: 'Personal exit'
  });

  return { ok: true, company, proceeds, personal: true };
}

/** Deploy capital as a % of implied subsidiary value (see computeReinvestQuote). */
export function reinvestInSubsidiary(state, targetId, options = {}) {
  const pct = options.pctOfValue ?? options.pct;
  const programId = options.program ?? options.programId ?? 'product';
  const quote = computeReinvestQuote(state, targetId, pct, programId);
  if (!quote.ok) return quote;

  const { company, holding, amount, program, impliedValue } = quote;
  state.finance.cash -= amount;
  recordCashOutflow(state, amount, 'acquisition-reinvest');
  holding.investedTotal = (holding.investedTotal ?? 0) + amount;
  holding.lastReinvestTurn = calendarTurn(state);
  holding.lastReinvestProgram = program.id;

  const delta = Math.max(
    0.01,
    (amount / Math.max(impliedValue, 1)) * 0.42 * Math.max(1, program.healthFactor)
  );
  holding.health = Math.min(2.2, holdingHealth(holding) + delta);
  const markBoost = (amount / Math.max(impliedValue, 1)) * 0.06;
  holding.valuationMark = Math.min(
    VALUATION_MARK_MAX,
    subsidiaryValuationMark(holding) + Math.max(markBoost, 0.005)
  );
  if (holding.integrationMonthsLeft > 0 && program.integrationMonths > 0) {
    holding.integrationMonthsLeft = Math.max(
      0,
      holding.integrationMonthsLeft - program.integrationMonths
    );
  }

  pushDealLog(state, {
    kind: 'reinvest',
    name: company.isRival ? state.world?.competitor?.name ?? company.name : company.name,
    amount,
    detail: `${program.label} · ${quote.pctOfValue}% of ${formatMoney(impliedValue)} · health ${holdingHealth(holding).toFixed(2)}×`
  });

  return {
    ok: true,
    company,
    amount,
    pctOfValue: quote.pctOfValue,
    impliedValue,
    program,
    health: holdingHealth(holding),
    mrr: subsidiaryMrr(state, holding, company)
  };
}

export function sellSubsidiary(state, targetId) {
  ensureAcquisitions(state);
  const idx = state.acquisitions.owned.findIndex((h) => h.id === targetId);
  if (idx < 0) return { ok: false, reason: 'You do not own that company.' };
  const holding = state.acquisitions.owned[idx];
  const company = catalog.find((c) => c.id === targetId);
  if (!company) return { ok: false, reason: 'Unknown subsidiary.' };

  const proceeds = subsidiarySalePrice(state, holding, company);
  state.finance.cash += proceeds;
  state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + proceeds;
  if (proceeds > 0) accrueFiscalRevenue(state, proceeds);
  state.acquisitions.owned.splice(idx, 1);

  if (company.isRival) {
    state.world.competitorAcquired = false;
    bumpCompetitorPressure(state, 2);
  }

  pushDealLog(state, {
    kind: 'sell',
    name: company.isRival ? state.world?.competitor?.name ?? company.name : company.name,
    amount: proceeds,
    detail: 'Exit'
  });

  return { ok: true, company, proceeds };
}

/** Month-start: fire sales, integration countdown + neglect decay. */
export function tickAcquisitionsAtMonthStart(state) {
  if (!acquisitionsUnlocked(state)) return [];
  refreshFireSales(state);
  const lines = [];
  if ((state.acquisitions?.fireSaleIds?.length ?? 0) > 0) {
    lines.push('M&A desk: fire-sale listings live on the Companies tab (−15% ask).');
  }
  const ownedAll = [
    ...(state.acquisitions?.owned ?? []),
    ...(state.acquisitions?.personalOwned ?? [])
  ];
  if (!ownedAll.length) return lines;
  const turn = calendarTurn(state);
  for (const h of ownedAll) {
    h.monthsHeld = monthsHeld(state, h);
    const def = catalog.find((c) => c.id === h.id);
    if (!def) continue;
    const name = def.isRival ? state.world?.competitor?.name ?? def.name : def.name;
    if ((h.integrationMonthsLeft ?? 0) > 0) {
      h.integrationMonthsLeft -= 1;
      if (h.integrationMonthsLeft === 0) {
        lines.push(`${name} integration complete — full portfolio MRR online.`);
      }
    }
    const drift = applyMonthlyValuationDrift(state, h);
    if (drift != null && Math.abs(drift) >= 0.018) {
      const pct = (drift * 100).toFixed(1);
      lines.push(
        `${name} mark ${drift >= 0 ? '+' : ''}${pct}% (now ${subsidiaryValuationMark(h).toFixed(2)}× vs purchase).`
      );
    }
  }
  return lines;
}

export function applySubsidiaryMrrPayout(state) {
  const total = totalSubsidiaryMrr(state);
  if (!total) return { total: 0, lines: [] };
  state.finance.cash += total;
  state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + total;
  if (total > 0) accrueFiscalRevenue(state, total);
  state.finance.subsidiaryMrr = total;
  ensureAcquisitions(state);
  state.acquisitions.lifetimePortfolioRevenue =
    (state.acquisitions.lifetimePortfolioRevenue ?? 0) + total;
  return {
    total,
    lines: [`Portfolio MRR: +${formatMoney(total)} from subsidiaries (incl. synergy).`]
  };
}

export function setCompaniesSection(state, section) {
  ensureAcquisitions(state);
  const allowed = new Set(['pulse', 'holdings', 'market', 'deals']);
  state.acquisitions.companiesSection = allowed.has(section) ? section : 'pulse';
}

export function portfolioPulseSummary(state) {
  ensureAcquisitions(state);
  const portfolioMrr = totalSubsidiaryMrr(state);
  const exitVal = portfolioExitValue(state);
  const invested = portfolioInvestedTotal(state);
  const unrealized = exitVal - invested;
  const unrealizedPct = invested > 0 ? (unrealized / invested) * 100 : 0;
  const synergy = portfolioSynergyMult(state);
  const owned =
    (state.acquisitions?.owned?.length ?? 0) + (state.acquisitions?.personalOwned?.length ?? 0);
  return {
    portfolioMrr,
    exitVal,
    invested,
    unrealized,
    unrealizedPct,
    synergy,
    owned,
    cash: state.finance?.cash ?? 0,
    lifetime: state.acquisitions?.lifetimePortfolioRevenue ?? 0
  };
}


export function showCompaniesFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}

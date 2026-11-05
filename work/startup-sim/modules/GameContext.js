import { formatMoney } from './constants.js';
import { formatStateMonth } from './GameCalendar.js';
import { totalHeadcount } from './Staff.js';
import { projectMonthlyBurn, founderEquityPct, initialInvestmentCash, founderValuationStake } from './Finance.js';
import { getWorkspaceTier } from './Workspace.js';
const WORKSPACE_PRESS_LABEL = {
  garage: 'a home garage',
  small: 'a small leased office',
  medium: 'a mid-size headquarters',
  large: 'a large campus',
  hub: 'a flagship hub tower'
};

const FUNDING_PRESS = (flags) => {
  if (flags?.ipoFiled) return 'public company';
  if (flags?.seriesBClosed) return 'Series B-backed';
  if (flags?.seriesAClosed) return 'Series A-backed';
  if (flags?.seedRoundClosed) return 'seed-funded';
  if (flags?.xcAccepted) return 'accelerator-backed';
  return 'bootstrapped';
};

/** In-universe facts for press / social AI — no game UI vocabulary. */
export function buildNarrativeContext(state) {
  const burn = projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  const hc = totalHeadcount(state.staff?.headcountByDept);
  const tier = getWorkspaceTier(state);
  const workspaceLabel = WORKSPACE_PRESS_LABEL[tier] ?? 'an office';
  const flags = state.flags ?? {};
  const founderPct = founderEquityPct(state);
  const stake = founderValuationStake(state);

  return {
    companyName: state.company?.name,
    category: state.company?.categoryLabel,
    cityOrHub: state.company?.location ?? state.offices?.hubLabel ?? 'undisclosed market',
    workspaceDescription: workspaceLabel,
    fundingStage: FUNDING_PRESS(flags),
    calendarLabel: formatStateMonth(state),
    cash,
    monthlyOverhead: burn,
    runwayMonths: burn > 0 ? Math.round((cash / burn) * 10) / 10 : null,
    annualRecurringRevenue: state.finance?.arr ?? Math.round((state.finance?.mrr ?? 0) * 12),
    lastMonthRevenue: state.finance?.monthlyRevenue ?? 0,
    headcount: hc,
    headcountByDept: { ...state.staff?.headcountByDept },
    productMaturityNote:
      (state.product?.level ?? 0) > 6
        ? 'mature product line'
        : (state.product?.level ?? 0) > 2
          ? 'growing product'
          : 'early product',
    marketBuzzNote:
      (state.product?.buzz ?? 0) > 8
        ? 'strong market buzz'
        : (state.product?.buzz ?? 0) > 3
          ? 'moderate buzz'
          : 'quiet buzz',
    valuation: state.finance?.valuation ?? null,
    founderEquityPct: founderPct,
    founderPaperWealth: stake,
    initialFounderInvestment: initialInvestmentCash(state),
    isPublic: Boolean(state.publicMarket?.ticker),
    ticker: state.publicMarket?.ticker ?? null,
    sharePrice: state.publicMarket?.sharePrice ?? null,
    competitorName: state.world?.competitor?.name ?? null,
    recentLayoffEvents: (state.news?.layoffQueue ?? [])
      .filter((e) => !e.consumed)
      .map((e) => ({
        priorHeadcount: e.priorHeadcount,
        newHeadcount: e.newHeadcount,
        percentReduced: e.layoffPct
      })),
    recentLogPlain: (state.calendar?.log ?? [])
      .slice(0, 5)
      .map((e) => e.message)
      .filter((m) => !/sandbox|desk task|headcount cap|XC-only|save v/i.test(String(m))),
    recentHeadlines: (state.news?.currentMonthArticles ?? []).map((a) => a.headline),
    boardSentimentScore: state.sentiment?.score ?? null,
    narrativeRules: [
      'Write as real in-world journalism or social posts.',
      'Never mention sandbox, career mode, game levels, ARR gates, desk tasks, save files, or UI tabs.',
      'Do not invent layoffs unless recentLayoffEvents is non-empty this month.',
      'Use parody company names only (Macrohard, Financier Times, Chirp).',
      'Headcount numbers must match context; do not exaggerate staff cuts on tiny teams.'
    ]
  };
}

export function buildGameSnapshot(state) {
  const burn = projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  return {
    companyName: state.company?.name,
    category: state.company?.categoryLabel,
    mode: state.mode,
    stage: state.stage,
    location: state.company?.location ?? null,
    calendar: { month: state.calendar.monthIndex, year: state.calendar.year },
    cash,
    burn,
    runwayMonths: burn > 0 ? Math.round((cash / burn) * 10) / 10 : null,
    lifetimeRevenue: state.finance?.lifetimeRevenue ?? 0,
    lifetimeExpenses: state.finance?.lifetimeExpenses ?? 0,
    lifetimeProfit: state.finance?.lifetimeProfit ?? 0,
    initialInvestment: initialInvestmentCash(state),
    arr: state.finance?.arr ?? (state.finance?.mrr ?? 0) * 12,
    lastMonthRevenue: state.finance?.monthlyRevenue ?? 0,
    mrr: state.finance?.mrr ?? 0,
    valuation: state.finance?.valuation ?? null,
    founderEquityPct: founderEquityPct(state),
    founderValuationStake: founderValuationStake(state),
    headcount: totalHeadcount(state.staff?.headcountByDept),
    headcountByDept: { ...state.staff?.headcountByDept },
    productLevel: state.product?.level ?? 0,
    buzz: state.product?.buzz ?? 0,
    flags: {
      xcAccepted: state.flags?.xcAccepted,
      seedClosed: state.flags?.seedRoundClosed,
      ipoUnlocked: state.flags?.ipoUnlocked,
      ipoFiled: state.flags?.ipoFiled
    },
    public: state.publicMarket?.ticker
      ? {
          ticker: state.publicMarket.ticker,
          sharePrice: state.publicMarket.sharePrice,
          monthsPublic: state.publicMarket.monthsPublic
        }
      : null,
    recentLog: (state.calendar?.log ?? []).slice(0, 5).map((e) => e.message),
    recentHeadlines: (state.news?.currentMonthArticles ?? []).map((a) => a.headline),
    boardSentiment: state.sentiment?.score ?? null,
    competitor: state.world?.competitor?.name ?? null,
    narrative: buildNarrativeContext(state)
  };
}

export function formatSnapshotForDisplay(state) {
  const s = buildGameSnapshot(state);
  return `Cash ${formatMoney(s.cash)}, burn ${formatMoney(s.burn)}/mo, revenue ${formatMoney(s.lifetimeRevenue)} lifetime.`;
}

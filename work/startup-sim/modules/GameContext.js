import { formatMoney, stageLabel } from './constants.js';
import { totalHeadcount } from './Staff.js';
import { projectMonthlyBurn } from './Finance.js';

export function buildGameSnapshot(state) {
  const burn = projectMonthlyBurn(state);
  const cash = state.finance?.cash ?? 0;
  return {
    companyName: state.company?.name,
    category: state.company?.categoryLabel,
    mode: state.mode,
    stage: stageLabel(state.stage),
    location: state.company?.location ?? null,
    calendar: { month: state.calendar.monthIndex, year: state.calendar.year },
    cash,
    burn,
    runwayMonths: burn > 0 ? Math.round((cash / burn) * 10) / 10 : null,
    lifetimeRevenue: state.finance?.lifetimeRevenue ?? 0,
    lastMonthRevenue: state.finance?.monthlyRevenue ?? 0,
    mrr: state.finance?.mrr ?? 0,
    valuation: state.finance?.valuation ?? null,
    founderEquityPct: state.capTable?.find((r) => r.id === 'founder')?.pct ?? 100,
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
    recentHeadlines: (state.news?.currentMonthArticles ?? []).map((a) => a.headline)
  };
}

export function formatSnapshotForDisplay(state) {
  const s = buildGameSnapshot(state);
  return `Cash ${formatMoney(s.cash)}, burn ${formatMoney(s.burn)}/mo, revenue ${formatMoney(s.lifetimeRevenue)} lifetime.`;
}

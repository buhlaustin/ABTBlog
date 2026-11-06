import { formatMoney } from './constants.js';
import { calendarTurn } from './GameCalendar.js';
import { applyWorkspaceBurn, getWorkspaceTier, workspaceRentMonthly, WORKSPACE_TIER } from './Workspace.js';
import { satelliteRent } from './Offices.js';
import { HOUSING_MODE, ceoHousingSummary } from './CeoLifestyle.js';
import { personalInvestmentBalance } from './CeoEconomics.js';
import { panelStatCard } from './PanelChrome.js';

/** Annual lease review applied each January (HQ, hub, satellites). */
export const ANNUAL_RENT_ESCALATION_RATE = 0.045;

/** Annual mark on CEO-owned homes (market value on purchasePrice). */
export const ANNUAL_HOME_APPRECIATION_RATE = 0.04;

function ensureFacilitiesMeta(state) {
  if (!state.finance) return;
  if (state.finance.rentIndexMult == null) state.finance.rentIndexMult = 1;
}

export function rentEscalationSummary(state) {
  ensureFacilitiesMeta(state);
  const mult = state.finance?.rentIndexMult ?? 1;
  const pctAboveBase = Math.round((mult - 1) * 1000) / 10;
  return {
    rentIndexMult: mult,
    pctAboveBase,
    annualRatePct: Math.round(ANNUAL_RENT_ESCALATION_RATE * 1000) / 10,
    homeRatePct: Math.round(ANNUAL_HOME_APPRECIATION_RATE * 1000) / 10
  };
}

export function facilitiesRentBreakdown(state) {
  const hq = workspaceRentMonthly(state);
  const satellites = satelliteRent(state);
  const tier = getWorkspaceTier(state);
  const hubLine =
    tier === WORKSPACE_TIER.HUB && state.offices?.hubId
      ? state.offices.hubLabel ?? 'Hub city'
      : null;
  return {
    hqMonthly: hq,
    satelliteMonthly: satellites,
    totalMonthly: hq + satellites,
    hubLine,
    satelliteCount: state.offices?.satellites?.length ?? 0
  };
}

/** January month-start: bump indexed HQ rent, hub lease, satellite leases, and CEO home marks. */
export function tickAnnualFacilitiesAtMonthStart(state) {
  const cal = state.calendar;
  if (!cal || cal.monthIndex !== 1) return [];
  if (calendarTurn(state) <= 1) return [];

  const year = cal.year ?? 1;
  if (!state.finance) return [];
  ensureFacilitiesMeta(state);
  if (state.finance.lastRentEscalationYear === year) return [];
  state.finance.lastRentEscalationYear = year;

  const rentMult = 1 + ANNUAL_RENT_ESCALATION_RATE;
  state.finance.rentIndexMult = Math.round((state.finance.rentIndexMult ?? 1) * rentMult * 10000) / 10000;

  if (typeof state.finance.hubRentMonthly === 'number' && state.finance.hubRentMonthly > 0) {
    state.finance.hubRentMonthly = Math.round(state.finance.hubRentMonthly * rentMult);
  }

  for (const sat of state.offices?.satellites ?? []) {
    if (sat.rentMonthly > 0) {
      sat.rentMonthly = Math.round(sat.rentMonthly * rentMult);
    }
  }

  applyWorkspaceBurn(state);

  const lines = [
    `Annual lease review — corporate rent index +${Math.round(ANNUAL_RENT_ESCALATION_RATE * 1000) / 10}% (HQ ${formatMoney(workspaceRentMonthly(state))}/mo${satelliteRent(state) > 0 ? `, satellites ${formatMoney(satelliteRent(state))}/mo` : ''}).`
  ];

  const housing = state.ceo?.housing;
  if (
    housing &&
    housing.mode !== HOUSING_MODE.RENT &&
    (housing.purchasePrice ?? 0) > 0
  ) {
    const prior = housing.purchasePrice;
    housing.purchasePrice = Math.round(prior * (1 + ANNUAL_HOME_APPRECIATION_RATE));
    if (housing.costBasis == null) housing.costBasis = prior;
    const summary = ceoHousingSummary(state);
    lines.push(
      `Property tax assessment — ${summary.label} marked to ${formatMoney(housing.purchasePrice)} (+${Math.round(ANNUAL_HOME_APPRECIATION_RATE * 1000) / 10}% YoY; equity ≈ ${formatMoney(summary.equity)}).`
    );
  }

  return lines;
}

export function ceoPersonalWealthEndgame(state) {
  const portfolio = personalInvestmentBalance(state);
  const home = ceoHousingSummary(state);
  const ownsHome = home.mode !== HOUSING_MODE.RENT;
  const housing = state.ceo?.housing;
  return {
    portfolio,
    homeMarketValue: ownsHome ? home.purchasePrice ?? 0 : 0,
    homeEquity: ownsHome ? home.equity ?? 0 : 0,
    homeCostBasis: ownsHome ? housing?.costBasis ?? home.purchasePrice ?? 0 : 0,
    homeLabel: ownsHome ? home.label : null
  };
}

export function renderFinanceTreasuryIntro(state) {
  const esc = rentEscalationSummary(state);
  const rent = facilitiesRentBreakdown(state);
  const portfolio = personalInvestmentBalance(state);
  return `<section class="finance-section finance-card" aria-label="Treasury overview">
    <div class="finance-section-head">
      <h3 class="finance-section-title">Treasury & facilities</h3>
      <span class="fine-print">Non-dilutive capital · real estate · portfolio</span>
    </div>
    <p class="fine-print">Subsidiary acquisitions and deal flow live on the <strong>Companies</strong> tab. Here: credit, revenue advances, lease costs, and how they scale each January.</p>
    <div class="finance-metric-grid finance-metric-grid--3">
      ${panelStatCard('HQ & hub rent', `${formatMoney(rent.hqMonthly)}/mo`)}
      ${panelStatCard('Satellite rent', `${formatMoney(rent.satelliteMonthly)}/mo`)}
      ${panelStatCard('Rent index', esc.pctAboveBase > 0 ? `+${esc.pctAboveBase}% vs base` : 'Base year')}
    </div>
    <p class="fine-print">Leases step up ~${esc.annualRatePct}% every January. CEO homes appreciate ~${esc.homeRatePct}% per year when owned. Personal portfolio transfers are on the <strong>CEO</strong> tab${portfolio > 0 ? ` (${formatMoney(portfolio)} invested)` : ''}.</p>
  </section>`;
}

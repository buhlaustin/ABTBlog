import { formatMoney } from './constants.js';
import { calendarTurn } from './GameCalendar.js';
import { applyWorkspaceBurn, getWorkspaceTier, workspaceLabel, workspaceRentMonthly, WORKSPACE_TIER } from './Workspace.js';
import { satelliteRent } from './Offices.js';
import { HOUSING_MODE, ceoHousingSummary } from './CeoLifestyle.js';
import { personalInvestmentBalance } from './CeoEconomics.js';
import { panelStatCard, panelMetricGrid, panelMetricGroup, panelMetricStack, escapeHtml } from './PanelChrome.js';
import { hubCostMult } from './Finance.js';
import { loanOutstanding, loanPaymentMonthly, computeCreditLimit, loanHeadroom } from './BankLoan.js';
import { rbfOutstanding } from './RevenueAdvance.js';
import { renderCapitalStackSummary, totalSafePrincipal, activeSafeInstruments } from './FinanceCapital.js';
import { acquisitionsUnlocked, portfolioPulseSummary } from './Acquisitions.js';
import { scheduledCompanyOverhead } from './CompanyOverhead.js';
import {
  sponsorshipPaymentMonthly,
  sponsoredMrrMonthly,
  renderTreasurySponsorshipPanel
} from './TreasurySponsorships.js';

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

export function nextRentReviewLabel(state) {
  const m = state.calendar?.monthIndex ?? 1;
  const y = state.calendar?.year ?? 2026;
  const esc = rentEscalationSummary(state);
  if (m === 1) {
    return `January ${y} — lease index applies at month start (+${esc.annualRatePct}% when due)`;
  }
  const months = 12 - m + 1;
  return `${months} mo → Jan ${y + 1} (+${esc.annualRatePct}% HQ, hub & satellites)`;
}

export function facilitiesRentBreakdown(state) {
  const hqBase = workspaceRentMonthly(state);
  const costMult = hubCostMult(state);
  const hqEffective = Math.round(hqBase * costMult);
  const satellites = satelliteRent(state);
  const tier = getWorkspaceTier(state);
  const hubLine =
    tier === WORKSPACE_TIER.HUB && state.offices?.hubId
      ? state.offices.hubLabel ?? 'Hub city'
      : null;
  return {
    hqBase,
    hqEffective,
    hubCostMult: costMult,
    satelliteMonthly: satellites,
    totalMonthly: hqEffective + satellites,
    hubLine,
    satelliteCount: state.offices?.satellites?.length ?? 0,
    tierLabel: workspaceLabel(tier)
  };
}

/** Recurring treasury-style charges (rent, debt, estimated RBF slice). */
export function treasuryObligationsSummary(state) {
  const rent = facilitiesRentBreakdown(state);
  const loanPay = loanPaymentMonthly(state);
  const loanBal = loanOutstanding(state);
  const rbfOwed = rbfOutstanding(state);
  const rbfShare = state.finance?.rbf?.sharePct ?? 0.12;
  const rbfEstMo =
    rbfOwed > 0 ? Math.min(rbfOwed, Math.round((state.finance?.mrr ?? 0) * rbfShare)) : 0;
  const sponsorPay = sponsorshipPaymentMonthly(state);
  const sponsorMrr = sponsoredMrrMonthly(state);
  const fixedMo = rent.totalMonthly + loanPay + rbfEstMo;
  return {
    rent,
    loanPay,
    loanBal,
    rbfOwed,
    rbfEstMo,
    sponsorPay,
    sponsorMrr,
    fixedMo,
    creditLimit: computeCreditLimit(state),
    headroom: loanHeadroom(state)
  };
}

function renderObligationsTable(state) {
  const ob = treasuryObligationsSummary(state);
  const overhead = scheduledCompanyOverhead(state);
  const rentLines = overhead.breakdown?.filter((l) =>
    /rent|satellite|debt/i.test(l.label)
  ) ?? [];
  const rows = [
    {
      label: 'HQ / workspace rent',
      amount: ob.rent.hqEffective,
      note:
        ob.rent.hubCostMult > 1
          ? `Base ${formatMoney(ob.rent.hqBase)} × ${ob.rent.hubCostMult} hub cost`
          : ob.rent.tierLabel
    },
    ob.rent.satelliteMonthly > 0
      ? {
          label: `Satellite offices (${ob.rent.satelliteCount})`,
          amount: ob.rent.satelliteMonthly,
          note: 'Each lease steps up every January'
        }
      : null,
    ob.loanPay > 0
      ? {
          label: 'Bank line debt service',
          amount: ob.loanPay,
          note: `${formatMoney(ob.loanBal)} outstanding`
        }
      : null,
    ob.rbfOwed > 0
      ? {
          label: 'Revenue advance (est.)',
          amount: ob.rbfEstMo,
          note: `${formatMoney(ob.rbfOwed)} left · ~${Math.round((state.finance?.rbf?.sharePct ?? 0.12) * 100)}% of desk revenue`
        }
      : null,
    ob.sponsorMrr > 0
      ? {
          label: 'Sponsor revenue (contracted)',
          amount: 0,
          note: `~${formatMoney(ob.sponsorMrr)}/mo recognizing at month close (fees paid upfront)`
        }
      : null
  ].filter(Boolean);

  if (!rows.length) {
    return `<p class="fine-print">No facility rent or debt yet — garage stage has no corporate lease.</p>`;
  }

  const body = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.label)}</td><td class="num">${formatMoney(r.amount)}/mo</td><td class="fine-print">${escapeHtml(r.note)}</td></tr>`
    )
    .join('');
  const overheadRentTotal = rentLines.reduce((s, l) => s + l.amount, 0);
  const totalNote =
    overheadRentTotal > 0 && Math.abs(overheadRentTotal - (ob.rent.totalMonthly + ob.loanPay)) < 500
      ? `<p class="fine-print">These lines also appear in company overhead (total overhead this month ${formatMoney(overhead.total)}).</p>`
      : `<p class="fine-print">Payroll and vendor OPEX close separately on the Finance overview.</p>`;

  return `<div class="table-scroll finance-cap-scroll">
    <table class="data-table treasury-obligations-table">
      <thead><tr><th>Charge</th><th>Amount</th><th>Notes</th></tr></thead>
      <tbody>${body}
      <tr class="treasury-obligations-total"><td><strong>Fixed charges (est.)</strong></td><td class="num"><strong>${formatMoney(ob.fixedMo)}/mo</strong></td><td></td></tr>
      </tbody>
    </table>
  </div>${totalNote}`;
}

function renderSatelliteRentDetail(state) {
  const sats = state.offices?.satellites ?? [];
  if (!sats.length) return '';
  const rows = sats
    .map(
      (s) =>
        `<tr><td>${escapeHtml(s.label)}</td><td>${escapeHtml(s.sizeLabel ?? s.size ?? '—')}</td><td class="num">${formatMoney(s.rentMonthly ?? 0)}/mo</td></tr>`
    )
    .join('');
  return `<details class="ceo-debit-details"><summary>Satellite rent by city</summary>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>City</th><th>Size</th><th>Rent</th></tr></thead><tbody>${rows}</tbody></table></div>
  </details>`;
}

function renderSubsidiaryTreasuryBlock(state) {
  if (!acquisitionsUnlocked(state)) {
    return `<section class="finance-section finance-card" aria-label="Corporate development">
      <h3 class="finance-section-title">Subsidiaries & M&A</h3>
      <p class="fine-print">Bolt-on acquisitions unlock after seed. Use the <strong>Companies</strong> tab for market, diligence, and portfolio marks.</p>
    </section>`;
  }
  const pulse = portfolioPulseSummary(state);
  if (!pulse.owned) {
    return `<section class="finance-section finance-card" aria-label="Corporate development">
      <h3 class="finance-section-title">Subsidiaries & M&A</h3>
      <p class="fine-print">No owned companies yet — portfolio MRR and exit marks live on <strong>Companies</strong>.</p>
      ${panelMetricGrid('3', [
        panelStatCard('Company cash', formatMoney(pulse.cash)),
        panelStatCard('Listed targets', 'Browse market'),
        panelStatCard('Lifetime port. paid', formatMoney(pulse.lifetime))
      ])}
    </section>`;
  }
  const unrealTone = pulse.unrealized >= 0 ? 'pos' : 'neg';
  return `<section class="finance-section finance-card" aria-label="Subsidiary portfolio">
    <div class="finance-section-head">
      <h3 class="finance-section-title">Subsidiary portfolio</h3>
      <span class="fine-print">${pulse.owned} owned · paid monthly with month close</span>
    </div>
    <p class="fine-print">Deal flow, diligence, and reinvest actions → <strong>Companies</strong> tab.</p>
    ${panelMetricGrid('4', [
      panelStatCard('Portfolio MRR', `${formatMoney(pulse.portfolioMrr)}/mo`, { hero: true }),
      panelStatCard('Cost basis', formatMoney(pulse.invested)),
      panelStatCard('Est. exit value', formatMoney(pulse.exitVal)),
      panelStatCard('Unrealized', formatMoney(pulse.unrealized), { tone: unrealTone })
    ])}
    <p class="fine-print">Synergy stack ×${(pulse.synergy ?? 1).toFixed(2)} on subsidiary MRR · marks drift ~±3.5%/mo.</p>
  </section>`;
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
  const ob = treasuryObligationsSummary(state);
  return `<section class="finance-section finance-card" aria-label="Treasury overview">
    <div class="finance-section-head">
      <h3 class="finance-section-title">Treasury & facilities</h3>
      <span class="fine-print">Liquidity · leases · credit · portfolio cos.</span>
    </div>
    <p class="fine-print">Corporate cash, debt, and real estate live here. Founder personal bank, portfolio, and home → <strong>CEO</strong> tab.</p>
    <div class="finance-metric-grid finance-metric-grid--3">
      ${panelStatCard('Fixed charges', `${formatMoney(ob.fixedMo)}/mo`)}
      ${panelStatCard('Combined rent', `${formatMoney(rent.totalMonthly)}/mo`)}
      ${panelStatCard('Rent index', esc.pctAboveBase > 0 ? `+${esc.pctAboveBase}% vs base` : 'Base year')}
    </div>
    <p class="fine-print">${escapeHtml(nextRentReviewLabel(state))}. CEO-owned homes mark ~${esc.homeRatePct}%/yr in January.${portfolio > 0 ? ` Personal portfolio ${formatMoney(portfolio)} (CEO tab).` : ''}</p>
  </section>`;
}

/**
 * Full Finance → Treasury subtab body (excluding offices mount and credit action widgets).
 * @param {{ sum: object, creditBlocksHtml: string, charityLifetimeLabel?: string }} opts
 */
export function renderFinanceTreasuryPanel(state, opts) {
  const sum = opts.sum ?? {};
  const creditBlocksHtml = opts.creditBlocksHtml ?? '';
  const ob = treasuryObligationsSummary(state);
  const rent = facilitiesRentBreakdown(state);
  const safeCount = activeSafeInstruments(state).length;
  const safeTotal = totalSafePrincipal(state);
  const capitalStack = renderCapitalStackSummary(state);
  const charityLine = opts.charityLifetimeLabel
    ? `<p class="fine-print">Lifetime charitable giving (company cash): <strong>${opts.charityLifetimeLabel}</strong> — quick donate on Finance overview.</p>`
    : '';

  return `${renderFinanceTreasuryIntro(state)}
    ${panelSnapshotSection(
      panelMetricStack(
        panelMetricGroup(
          'Corporate liquidity',
          panelMetricGrid('4', [
            panelStatCard('Cash', sum.cashLabel ?? formatMoney(state.finance?.cash ?? 0), { hero: true }),
            panelStatCard('Runway', sum.runway ?? '—'),
            panelStatCard('Total overhead / mo', sum.burnLabel ?? '—'),
            panelStatCard('Net debt', formatMoney(Math.max(0, ob.loanBal + ob.rbfOwed - (state.finance?.cash ?? 0))))
          ])
        ),
        panelMetricGroup(
          'Credit headroom',
          panelMetricGrid('3', [
            panelStatCard('Line limit', formatMoney(ob.creditLimit)),
            panelStatCard('LOC headroom', formatMoney(ob.headroom)),
            panelStatCard('SAFE outstanding', safeCount ? formatMoney(safeTotal) : '—')
          ])
        )
      ),
      { ariaLabel: 'Liquidity and credit snapshot' }
    )}
    <p class="fine-print finance-runway-detail">${sum.runwayDetail ?? ''}</p>

    <section class="finance-section finance-card" aria-label="Monthly obligations">
      <h3 class="finance-section-title">Recurring obligations</h3>
      <p class="fine-print">${rent.hubLine ? `Hub: ${escapeHtml(rent.hubLine)} · ` : ''}${escapeHtml(rent.tierLabel)} · ${rent.satelliteCount} satellite(s).</p>
      ${renderObligationsTable(state)}
      ${renderSatelliteRentDetail(state)}
    </section>

    ${capitalStack}

    ${renderSubsidiaryTreasuryBlock(state)}

    ${renderTreasurySponsorshipPanel(state)}

    ${charityLine}

    <section class="finance-section finance-fundraising-stack">
      <h3 class="finance-section-title">Credit & non-dilutive capital</h3>
      ${creditBlocksHtml || '<p class="fine-print">Bank line and revenue advance unlock as MRR and trust build — draw and prepay below when available.</p>'}
    </section>

    <section class="finance-section finance-section--cap">
      <div id="offices-panel-mount"></div>
    </section>`;
}

function panelSnapshotSection(inner, opts = {}) {
  const label = opts.ariaLabel ? ` aria-label="${escapeHtml(opts.ariaLabel)}"` : '';
  return `<section class="finance-section panel-snapshot"${label}>${inner}</section>`;
}

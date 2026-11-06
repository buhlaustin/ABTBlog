import { formatMoney } from './constants.js';
import { fetchGameJson } from './utils.js';
import { getArr } from './Workspace.js';
import { recordCashOutflow } from './Finance.js';
import { accrueFiscalRevenue } from './CorporateTax.js';
import { isPublicCompany } from './IPO.js';
import { calendarTurn } from './GameCalendar.js';
import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';

const BUILTIN_DEALS = [
  {
    id: 'nra-stadium-flagship',
    label: 'Stadium naming rights (flagship)',
    category: 'naming_rights',
    exclusiveGroup: 'major-arena',
    annualPayment: 48_000_000,
    termYears: 5,
    minArr: 50_000_000,
    requiresSeed: true,
    blurb: '$48M/yr — $4M/mo fee for guaranteed $4M/mo contracted MRR for the term.'
  }
];

let dealsCache = null;

export function createInitialTreasurySponsorshipsState() {
  return {
    active: [],
    signedDealIds: [],
    lifetimeFeesPaid: 0,
    lifetimeMrrGranted: 0
  };
}

export async function preloadTreasurySponsorshipDeals() {
  if (dealsCache) return dealsCache;
  try {
    const data = await fetchGameJson('data/treasury-sponsorship-deals.json');
    dealsCache = Array.isArray(data) ? data : BUILTIN_DEALS;
  } catch {
    dealsCache = BUILTIN_DEALS;
  }
  return dealsCache;
}

export function getTreasurySponsorshipDealsSync() {
  return dealsCache ?? BUILTIN_DEALS;
}

export function getTreasurySponsorshipDeal(dealId) {
  return getTreasurySponsorshipDealsSync().find((d) => d.id === dealId) ?? null;
}

function ensureSponsorships(state) {
  if (!state.treasurySponsorships) {
    state.treasurySponsorships = createInitialTreasurySponsorshipsState();
  }
  if (!state.treasurySponsorships.active) state.treasurySponsorships.active = [];
  if (!state.treasurySponsorships.signedDealIds) state.treasurySponsorships.signedDealIds = [];
  return state.treasurySponsorships;
}

export function sponsoredMrrMonthly(state) {
  return ensureSponsorships(state).active.reduce((s, c) => s + (c.mrrMonthly ?? 0), 0);
}

export function sponsorshipPaymentMonthly(state) {
  return ensureSponsorships(state).active.reduce((s, c) => s + (c.paymentMonthly ?? 0), 0);
}

export function canSignTreasurySponsorship(state, dealId) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const deal = getTreasurySponsorshipDeal(dealId);
  if (!deal) return { ok: false, reason: 'Unknown sponsorship deal.' };

  const bag = ensureSponsorships(state);
  if (bag.signedDealIds.includes(deal.id)) {
    return { ok: false, reason: 'This deal was already signed this run.' };
  }
  if (deal.exclusiveGroup) {
    const clash = bag.active.find((c) => c.exclusiveGroup === deal.exclusiveGroup);
    if (clash) {
      return { ok: false, reason: `Already committed to ${clash.label} in this category.` };
    }
  }
  if (deal.requiresSeed && !state.flags?.seedRoundClosed) {
    return { ok: false, reason: 'Close seed before signing major sponsorship contracts.' };
  }
  if (deal.requiresPublic && !isPublicCompany(state)) {
    return { ok: false, reason: 'This package requires a public listing.' };
  }
  const arr = getArr(state);
  if (deal.minArr && arr < deal.minArr) {
    return {
      ok: false,
      reason: `Need about ${formatMoney(deal.minArr)} ARR (yours ≈ ${formatMoney(arr)}).`
    };
  }

  const paymentMonthly = Math.round(deal.annualPayment / 12);
  const cash = state.finance?.cash ?? 0;
  if (cash < paymentMonthly) {
    return {
      ok: false,
      reason: `Need ${formatMoney(paymentMonthly)} cash for the first monthly fee (have ${formatMoney(cash)}).`
    };
  }
  return { ok: true, deal, paymentMonthly };
}

export function signTreasurySponsorship(state, dealId) {
  const gate = canSignTreasurySponsorship(state, dealId);
  if (!gate.ok) return gate;

  const deal = gate.deal;
  const paymentMonthly = gate.paymentMonthly;
  const mrrMonthly = paymentMonthly;
  const monthsTotal = Math.max(1, Math.round((deal.termYears ?? 1) * 12));

  const bag = ensureSponsorships(state);
  bag.active.push({
    dealId: deal.id,
    label: deal.label,
    category: deal.category,
    exclusiveGroup: deal.exclusiveGroup ?? null,
    paymentMonthly,
    mrrMonthly,
    annualPayment: deal.annualPayment,
    monthsRemaining: monthsTotal,
    signedTurn: calendarTurn(state),
    signedMonth: state.calendar?.monthIndex,
    signedYear: state.calendar?.year
  });
  bag.signedDealIds.push(deal.id);

  return {
    ok: true,
    summary: `Signed ${deal.label} — ${formatMoney(deal.annualPayment)}/yr for ${deal.termYears} yr (${formatMoney(paymentMonthly)}/mo fee → +${formatMoney(mrrMonthly)}/mo guaranteed MRR each month paid). First payment runs at month close.`
  };
}

/** Month-end: pay sponsor fees, book guaranteed MRR, expire finished terms. */
export function settleTreasurySponsorshipsAtMonthEnd(state) {
  const bag = ensureSponsorships(state);
  if (!bag.active.length) return [];

  const lines = [];
  const stillActive = [];

  for (const contract of bag.active) {
    const pay = contract.paymentMonthly ?? 0;
    const grant = contract.mrrMonthly ?? 0;
    if (pay <= 0 || grant <= 0) continue;

    if ((state.finance?.cash ?? 0) < pay) {
      lines.push(
        `${contract.label} — missed ${formatMoney(pay)} fee; sponsor withheld MRR and terminated the deal.`
      );
      continue;
    }

    state.finance.cash -= pay;
    recordCashOutflow(state, pay, 'sponsorship');
    bag.lifetimeFeesPaid = (bag.lifetimeFeesPaid ?? 0) + pay;

    state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + grant;
    state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + grant;
    accrueFiscalRevenue(state, grant);
    bag.lifetimeMrrGranted = (bag.lifetimeMrrGranted ?? 0) + grant;

    contract.monthsRemaining = Math.max(0, (contract.monthsRemaining ?? 0) - 1);
    lines.push(
      `${contract.label}: ${formatMoney(pay)} fee → +${formatMoney(grant)} guaranteed MRR (${contract.monthsRemaining} mo left).`
    );

    if (contract.monthsRemaining > 0) stillActive.push(contract);
    else lines.push(`${contract.label} — term complete.`);
  }

  bag.active = stillActive;
  return lines;
}

function renderActiveContracts(state) {
  const bag = ensureSponsorships(state);
  if (!bag.active.length) {
    return '<p class="fine-print">No active sponsorship or naming contracts.</p>';
  }
  const rows = bag.active
    .map(
      (c) =>
        `<tr><td>${escapeHtml(c.label)}</td><td class="num">+${formatMoney(c.mrrMonthly)}/mo</td><td class="num">${formatMoney(c.paymentMonthly)}/mo</td><td class="num">${c.monthsRemaining} mo</td></tr>`
    )
    .join('');
  return `<div class="table-scroll finance-cap-scroll">
    <table class="data-table">
      <thead><tr><th>Contract</th><th>Guaranteed MRR</th><th>Monthly fee</th><th>Remaining</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export function renderTreasurySponsorshipPanel(state) {
  const deals = getTreasurySponsorshipDealsSync();
  const bag = ensureSponsorships(state);
  const grant = sponsoredMrrMonthly(state);
  const fees = sponsorshipPaymentMonthly(state);

  const cards = deals
    .map((deal) => {
      const gate = canSignTreasurySponsorship(state, deal.id);
      const monthly = Math.round(deal.annualPayment / 12);
      const signed = bag.signedDealIds.includes(deal.id);
      const disabled = !gate.ok || signed;
      const title = gate.ok && !signed ? '' : ` title="${escapeHtml(gate.reason ?? 'Unavailable')}"`;
      return `<div class="finance-action treasury-sponsor-deal">
        <p><strong>${escapeHtml(deal.label)}</strong> — ${formatMoney(deal.annualPayment)}/yr · ${deal.termYears} yr · +${formatMoney(monthly)}/mo MRR</p>
        <p class="fine-print">${escapeHtml(deal.blurb ?? '')}${deal.minArr ? ` Min ARR ${formatMoney(deal.minArr)}.` : ''}${deal.requiresPublic ? ' Public only.' : ''}</p>
        <button type="button" class="btn btn-ghost btn-small" data-sign-sponsorship="${escapeHtml(deal.id)}" ${disabled ? 'disabled' : ''}${title}>${signed ? 'Signed this run' : 'Sign contract'}</button>
      </div>`;
    })
    .join('');

  return `<section class="finance-section finance-card" aria-label="Sponsorship and naming rights">
    <div class="finance-section-head">
      <h3 class="finance-section-title">Sponsorship & naming rights</h3>
      <span class="fine-print">Guaranteed MRR · paid monthly from company cash</span>
    </div>
    <p class="fine-print">Each month you pay the sponsor fee and receive matching <strong>guaranteed MRR</strong> (e.g. ${formatMoney(48_000_000)}/yr → ${formatMoney(4_000_000)}/mo fee and +${formatMoney(4_000_000)}/mo MRR). Fees hit cash at month close; MRR rolls into ARR.</p>
    ${panelMetricGrid('3', [
      panelStatCard('Active guaranteed MRR', grant > 0 ? `+${formatMoney(grant)}/mo` : '—', { hero: grant > 0 }),
      panelStatCard('Active monthly fees', fees > 0 ? formatMoney(fees) : '—'),
      panelStatCard('Lifetime MRR booked', formatMoney(bag.lifetimeMrrGranted ?? 0))
    ])}
    ${renderActiveContracts(state)}
    <h4 class="finance-subhead">Available packages</h4>
    <div class="treasury-sponsor-catalog">${cards}</div>
  </section>`;
}

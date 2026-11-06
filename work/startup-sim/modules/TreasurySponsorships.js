import { formatMoney } from './constants.js';
import { fetchGameJson } from './utils.js';
import { getArr } from './Workspace.js';
import { recordCashOutflow } from './Finance.js';
import { accrueFiscalRevenue } from './CorporateTax.js';
import { isPublicCompany } from './IPO.js';
import { calendarTurn } from './GameCalendar.js';
import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';

/** Annual step-up on active sponsor fees & matching MRR (January). */
export const SPONSOR_ANNUAL_ESCALATION_RATE = 0.03;

const MAX_ACTIVE_CONTRACTS = 8;

const CATEGORY_LABELS = {
  naming_rights: 'Naming rights',
  transit: 'Transit & mobility',
  sports_media: 'Sports & media',
  events: 'Events & conferences',
  media: 'Digital media',
  out_of_home: 'Out-of-home',
  philanthropy: 'Philanthropy & civic'
};

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
    signingBonus: 2_500_000,
    buzzPerMonth: 2,
    blurb: '$48M/yr — $4M/mo fee for guaranteed $4M/mo contracted MRR for the term.'
  },
  {
    id: 'conference-title-global',
    label: 'Global developer conference title',
    category: 'events',
    exclusiveGroup: 'flagship-conference',
    annualPayment: 6_000_000,
    termYears: 2,
    minArr: 3_000_000,
    requiresSeed: false,
    buzzPerMonth: 2,
    blurb: 'Keynote backdrop rights — shorter term, faster MRR bump.'
  }
];

let dealsCache = null;

export function createInitialTreasurySponsorshipsState() {
  return {
    active: [],
    signedDealIds: [],
    history: [],
    lifetimeFeesPaid: 0,
    lifetimeMrrGranted: 0,
    lastEscalationYear: null
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

export function sponsorshipCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? 'Other';
}

function ensureSponsorships(state) {
  if (!state.treasurySponsorships) {
    state.treasurySponsorships = createInitialTreasurySponsorshipsState();
  }
  const bag = state.treasurySponsorships;
  if (!bag.active) bag.active = [];
  if (!bag.signedDealIds) bag.signedDealIds = [];
  if (!bag.history) bag.history = [];
  return bag;
}

function pushHistory(state, entry) {
  const bag = ensureSponsorships(state);
  bag.history.unshift({
    ...entry,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  if (bag.history.length > 24) bag.history.length = 24;
}

export function sponsoredMrrMonthly(state) {
  return ensureSponsorships(state).active.reduce((s, c) => s + (c.mrrMonthly ?? 0), 0);
}

export function sponsorshipPaymentMonthly(state) {
  return ensureSponsorships(state).active.reduce((s, c) => s + (c.paymentMonthly ?? 0), 0);
}

export function sponsorshipBookSummary(state) {
  const bag = ensureSponsorships(state);
  let remainingFees = 0;
  let remainingMrrMonths = 0;
  for (const c of bag.active) {
    const mo = c.monthsRemaining ?? 0;
    remainingFees += (c.paymentMonthly ?? 0) * mo;
    remainingMrrMonths += (c.mrrMonthly ?? 0) * mo;
  }
  return {
    activeCount: bag.active.length,
    remainingFees,
    remainingMrrMonths,
    lifetimeFees: bag.lifetimeFeesPaid ?? 0,
    lifetimeMrr: bag.lifetimeMrrGranted ?? 0
  };
}

function applyBrandEffects(state, deal, { onSign = false } = {}) {
  const lines = [];
  if (onSign) {
    if (deal.sentimentOnSign) {
      state.sentiment = state.sentiment ?? { score: 68 };
      state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + deal.sentimentOnSign);
      lines.push(`Market buzz +${deal.sentimentOnSign} from ${deal.label} announcement.`);
    }
    if (deal.streetCredOnSign && state.publicMarket) {
      state.publicMarket.streetCredibility = Math.min(
        100,
        (state.publicMarket.streetCredibility ?? 50) + deal.streetCredOnSign
      );
      lines.push(`Street credibility +${deal.streetCredOnSign} on the sponsor press release.`);
    }
  }
  const buzz = deal.buzzPerMonth ?? 0;
  if (buzz > 0 && state.product) {
    state.product.buzz = (state.product.buzz ?? 0) + buzz;
    lines.push(`Brand visibility +${buzz} product buzz.`);
  }
  return lines;
}

export function canSignTreasurySponsorship(state, dealId) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const deal = getTreasurySponsorshipDeal(dealId);
  if (!deal) return { ok: false, reason: 'Unknown sponsorship deal.' };

  const bag = ensureSponsorships(state);
  if (bag.signedDealIds.includes(deal.id)) {
    return { ok: false, reason: 'This deal was already signed this run.' };
  }
  if (bag.active.length >= MAX_ACTIVE_CONTRACTS) {
    return { ok: false, reason: `At most ${MAX_ACTIVE_CONTRACTS} active sponsor contracts.` };
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
  const signingBonus = Math.round(deal.signingBonus ?? 0);
  const cash = state.finance?.cash ?? 0;
  const need = paymentMonthly + signingBonus;
  if (cash < need) {
    return {
      ok: false,
      reason: `Need ${formatMoney(need)} cash (${formatMoney(paymentMonthly)} first month${signingBonus ? ` + ${formatMoney(signingBonus)} signing` : ''}; have ${formatMoney(cash)}).`
    };
  }
  return { ok: true, deal, paymentMonthly, signingBonus };
}

export function signTreasurySponsorship(state, dealId) {
  const gate = canSignTreasurySponsorship(state, dealId);
  if (!gate.ok) return gate;

  const deal = gate.deal;
  const paymentMonthly = gate.paymentMonthly;
  const mrrMonthly = paymentMonthly;
  const monthsTotal = Math.max(1, Math.round((deal.termYears ?? 1) * 12));
  const signingBonus = gate.signingBonus ?? 0;

  if (signingBonus > 0) {
    state.finance.cash -= signingBonus;
    recordCashOutflow(state, signingBonus, 'sponsorship_signing');
    ensureSponsorships(state).lifetimeFeesPaid =
      (ensureSponsorships(state).lifetimeFeesPaid ?? 0) + signingBonus;
  }

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
    monthsTotal,
    buzzPerMonth: deal.buzzPerMonth ?? 0,
    signedTurn: calendarTurn(state),
    signedMonth: state.calendar?.monthIndex,
    signedYear: state.calendar?.year
  });
  bag.signedDealIds.push(deal.id);

  pushHistory(state, {
    kind: 'signed',
    dealId: deal.id,
    label: deal.label,
    amount: signingBonus,
    note: `${deal.termYears} yr · ${formatMoney(deal.annualPayment)}/yr`
  });

  const brandLines = applyBrandEffects(state, deal, { onSign: true });
  const bonusNote = signingBonus ? ` Paid ${formatMoney(signingBonus)} signing bonus.` : '';

  return {
    ok: true,
    summary: `Signed ${deal.label} — ${formatMoney(deal.annualPayment)}/yr for ${deal.termYears} yr (${formatMoney(paymentMonthly)}/mo fee → +${formatMoney(mrrMonthly)}/mo guaranteed MRR each month paid).${bonusNote} First monthly fee runs at month close.`,
    brandLines
  };
}

export function canRenewTreasurySponsorship(state, dealId) {
  const bag = ensureSponsorships(state);
  const c = bag.active.find((x) => x.dealId === dealId);
  if (!c) return { ok: false, reason: 'No active contract for this deal.' };
  if ((c.monthsRemaining ?? 0) > 3) {
    return { ok: false, reason: 'Renewal opens in the final 3 months of the term.' };
  }
  const nextPay = Math.round((c.paymentMonthly ?? 0) * 1.05);
  if ((state.finance?.cash ?? 0) < nextPay) {
    return { ok: false, reason: `Need ${formatMoney(nextPay)} cash for the renewal month.` };
  }
  return { ok: true, contract: c, nextPay };
}

/** Extend 12 months at +5% monthly fee (MRR still matches fee). */
export function renewTreasurySponsorship(state, dealId) {
  const gate = canRenewTreasurySponsorship(state, dealId);
  if (!gate.ok) return gate;
  const c = gate.contract;
  c.paymentMonthly = gate.nextPay;
  c.mrrMonthly = gate.nextPay;
  c.annualPayment = gate.nextPay * 12;
  c.monthsRemaining = (c.monthsRemaining ?? 0) + 12;
  c.monthsTotal = (c.monthsTotal ?? 0) + 12;
  pushHistory(state, {
    kind: 'renewed',
    dealId: c.dealId,
    label: c.label,
    amount: gate.nextPay,
    note: '+12 mo @ +5% fee/MRR'
  });
  return {
    ok: true,
    summary: `Renewed ${c.label} — 12 more months at ${formatMoney(c.paymentMonthly)}/mo fee & MRR (${c.monthsRemaining} mo left).`
  };
}

export function canTerminateTreasurySponsorship(state, dealId) {
  const bag = ensureSponsorships(state);
  const c = bag.active.find((x) => x.dealId === dealId);
  if (!c) return { ok: false, reason: 'No active contract.' };
  const breakFee = Math.round((c.paymentMonthly ?? 0) * 3);
  if ((state.finance?.cash ?? 0) < breakFee) {
    return { ok: false, reason: `Need ${formatMoney(breakFee)} break fee (3× monthly).` };
  }
  return { ok: true, contract: c, breakFee };
}

export function terminateTreasurySponsorship(state, dealId) {
  const gate = canTerminateTreasurySponsorship(state, dealId);
  if (!gate.ok) return gate;
  const c = gate.contract;
  const breakFee = gate.breakFee;
  state.finance.cash -= breakFee;
  recordCashOutflow(state, breakFee, 'sponsorship_break');
  ensureSponsorships(state).lifetimeFeesPaid =
    (ensureSponsorships(state).lifetimeFeesPaid ?? 0) + breakFee;
  const bag = ensureSponsorships(state);
  bag.active = bag.active.filter((x) => x.dealId !== dealId);
  pushHistory(state, {
    kind: 'terminated',
    dealId: c.dealId,
    label: c.label,
    amount: breakFee,
    note: 'Early exit'
  });
  return {
    ok: true,
    summary: `Terminated ${c.label} early — paid ${formatMoney(breakFee)} break fee. Guaranteed MRR from this deal stops.`
  };
}

/** January: escalate active sponsor fees & matching MRR. */
export function tickSponsorshipEscalationAtMonthStart(state) {
  const cal = state.calendar;
  if (!cal || cal.monthIndex !== 1) return [];
  if (calendarTurn(state) <= 1) return [];

  const bag = ensureSponsorships(state);
  if (!bag.active.length) return [];
  const year = cal.year ?? 1;
  if (bag.lastEscalationYear === year) return [];
  bag.lastEscalationYear = year;

  const mult = 1 + SPONSOR_ANNUAL_ESCALATION_RATE;
  for (const c of bag.active) {
    c.paymentMonthly = Math.round((c.paymentMonthly ?? 0) * mult);
    c.mrrMonthly = c.paymentMonthly;
    c.annualPayment = c.paymentMonthly * 12;
  }
  return [
    `Sponsor contract index +${Math.round(SPONSOR_ANNUAL_ESCALATION_RATE * 1000) / 10}% on ${bag.active.length} active deal(s) (fee & guaranteed MRR).`
  ];
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
      pushHistory(state, {
        kind: 'missed',
        dealId: contract.dealId,
        label: contract.label,
        amount: pay,
        note: 'Payment default'
      });
      continue;
    }

    state.finance.cash -= pay;
    recordCashOutflow(state, pay, 'sponsorship');
    bag.lifetimeFeesPaid = (bag.lifetimeFeesPaid ?? 0) + pay;

    state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + grant;
    state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + grant;
    accrueFiscalRevenue(state, grant);
    bag.lifetimeMrrGranted = (bag.lifetimeMrrGranted ?? 0) + grant;

    if (contract.buzzPerMonth) {
      state.product = state.product ?? { level: 0, buzz: 0 };
      state.product.buzz = (state.product.buzz ?? 0) + contract.buzzPerMonth;
    }

    contract.monthsRemaining = Math.max(0, (contract.monthsRemaining ?? 0) - 1);
    lines.push(
      `${contract.label}: ${formatMoney(pay)} fee → +${formatMoney(grant)} guaranteed MRR (${contract.monthsRemaining} mo left).`
    );
    pushHistory(state, {
      kind: 'paid',
      dealId: contract.dealId,
      label: contract.label,
      amount: pay,
      note: `+${formatMoney(grant)} MRR`
    });

    if (contract.monthsRemaining > 0) stillActive.push(contract);
    else {
      lines.push(`${contract.label} — term complete.`);
      pushHistory(state, {
        kind: 'expired',
        dealId: contract.dealId,
        label: contract.label,
        amount: 0,
        note: 'Term ended'
      });
    }
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
    .map((c) => {
      const canRenew = (c.monthsRemaining ?? 0) <= 3;
      const renewBtn = canRenew
        ? `<button type="button" class="btn btn-ghost btn-small" data-renew-sponsorship="${escapeHtml(c.dealId)}">Renew +12 mo</button>`
        : '';
      const termBtn = `<button type="button" class="btn btn-ghost btn-small" data-terminate-sponsorship="${escapeHtml(c.dealId)}" title="Pay 3× monthly break fee">Exit early</button>`;
      return `<tr>
        <td>${escapeHtml(c.label)}<br><span class="fine-print">${escapeHtml(sponsorshipCategoryLabel(c.category))}</span></td>
        <td class="num">+${formatMoney(c.mrrMonthly)}/mo</td>
        <td class="num">${formatMoney(c.paymentMonthly)}/mo</td>
        <td class="num">${c.monthsRemaining} / ${c.monthsTotal ?? c.monthsRemaining}</td>
        <td class="treasury-sponsor-actions">${renewBtn} ${termBtn}</td>
      </tr>`;
    })
    .join('');
  return `<div class="table-scroll finance-cap-scroll">
    <table class="data-table">
      <thead><tr><th>Contract</th><th>Guaranteed MRR</th><th>Monthly fee</th><th>Months left</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function renderHistory(state) {
  const bag = ensureSponsorships(state);
  if (!bag.history?.length) return '';
  const rows = bag.history
    .slice(0, 8)
    .map(
      (h) =>
        `<tr><td>${escapeHtml(h.kind)}</td><td>${escapeHtml(h.label)}</td><td class="num">${h.amount ? formatMoney(h.amount) : '—'}</td><td class="fine-print">${escapeHtml(h.note ?? '')}</td></tr>`
    )
    .join('');
  return `<details class="ceo-debit-details"><summary>Contract history (recent)</summary>
    <div class="table-scroll"><table class="data-table"><thead><tr><th>Event</th><th>Deal</th><th>Cash</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table></div>
  </details>`;
}

function renderDealCard(state, deal) {
  const bag = ensureSponsorships(state);
  const gate = canSignTreasurySponsorship(state, deal.id);
  const monthly = Math.round(deal.annualPayment / 12);
  const signed = bag.signedDealIds.includes(deal.id);
  const disabled = !gate.ok || signed;
  const title = gate.ok && !signed ? '' : ` title="${escapeHtml(gate.reason ?? 'Unavailable')}"`;
  const bonus = deal.signingBonus ? ` Signing ${formatMoney(deal.signingBonus)}.` : '';
  const tags = [
    deal.requiresPublic ? 'Public' : null,
    deal.requiresSeed ? 'Post-seed' : 'Pre-seed OK',
    deal.buzzPerMonth ? `+${deal.buzzPerMonth} buzz/mo` : null
  ]
    .filter(Boolean)
    .join(' · ');
  return `<div class="finance-action treasury-sponsor-deal">
    <p><strong>${escapeHtml(deal.label)}</strong> — ${formatMoney(deal.annualPayment)}/yr · ${deal.termYears} yr · +${formatMoney(monthly)}/mo MRR</p>
    <p class="fine-print">${escapeHtml(deal.blurb ?? '')}${deal.minArr ? ` Min ARR ${formatMoney(deal.minArr)}.` : ''}${bonus}</p>
    <p class="fine-print treasury-sponsor-tags">${escapeHtml(tags)}</p>
    <button type="button" class="btn btn-ghost btn-small" data-sign-sponsorship="${escapeHtml(deal.id)}" ${disabled ? 'disabled' : ''}${title}>${signed ? 'Signed this run' : 'Sign contract'}</button>
  </div>`;
}

export function renderTreasurySponsorshipPanel(state) {
  const deals = getTreasurySponsorshipDealsSync();
  const bag = ensureSponsorships(state);
  const grant = sponsoredMrrMonthly(state);
  const fees = sponsorshipPaymentMonthly(state);
  const book = sponsorshipBookSummary(state);

  const byCategory = {};
  for (const deal of deals) {
    const cat = deal.category ?? 'other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(deal);
  }
  const catalog = Object.keys(byCategory)
    .sort((a, b) => sponsorshipCategoryLabel(a).localeCompare(sponsorshipCategoryLabel(b)))
    .map(
      (cat) =>
        `<div class="treasury-sponsor-category"><h4 class="finance-subhead">${escapeHtml(sponsorshipCategoryLabel(cat))}</h4>${byCategory[cat].map((d) => renderDealCard(state, d)).join('')}</div>`
    )
    .join('');

  return `<section class="finance-section finance-card" aria-label="Sponsorship and naming rights">
    <div class="finance-section-head">
      <h3 class="finance-section-title">Sponsorship & naming rights</h3>
      <span class="fine-print">Guaranteed MRR · brand · up to ${MAX_ACTIVE_CONTRACTS} active</span>
    </div>
    <p class="fine-print">Pay a monthly sponsor fee at <strong>month close</strong>; receive the same amount as <strong>guaranteed MRR</strong> (e.g. ${formatMoney(48_000_000)}/yr → ${formatMoney(4_000_000)}/mo). Signing bonuses and break fees hit cash immediately. Active deals step up ~${Math.round(SPONSOR_ANNUAL_ESCALATION_RATE * 1000) / 10}% each January (fee & MRR stay matched). Renew in the last 3 months (+5% fee) or exit early (3× monthly break fee).</p>
    ${panelMetricGrid('4', [
      panelStatCard('Active guaranteed MRR', grant > 0 ? `+${formatMoney(grant)}/mo` : '—', { hero: grant > 0 }),
      panelStatCard('Active monthly fees', fees > 0 ? formatMoney(fees) : '—'),
      panelStatCard('Remaining fees (book)', formatMoney(book.remainingFees)),
      panelStatCard('Remaining MRR (book)', formatMoney(book.remainingMrrMonths))
    ])}
    ${panelMetricGrid('3', [
      panelStatCard('Active contracts', String(book.activeCount)),
      panelStatCard('Lifetime fees paid', formatMoney(book.lifetimeFees)),
      panelStatCard('Lifetime MRR booked', formatMoney(book.lifetimeMrr))
    ])}
    <h4 class="finance-subhead">Active contracts</h4>
    ${renderActiveContracts(state)}
    ${renderHistory(state)}
    <h4 class="finance-subhead">Available packages</h4>
    <div class="treasury-sponsor-catalog">${catalog}</div>
  </section>`;
}

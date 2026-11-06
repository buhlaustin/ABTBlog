import { formatMoney } from './constants.js';
import { fetchGameJson } from './utils.js';
import { getArr } from './Workspace.js';
import { recordCashOutflow } from './Finance.js';
import { accrueFiscalRevenue } from './CorporateTax.js';
import { isPublicCompany } from './IPO.js';
import { calendarTurn } from './GameCalendar.js';
import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';

/** January index on remaining contracted sponsor revenue (not on cash fees). */
export const SPONSOR_ANNUAL_ESCALATION_RATE = 0.03;

/** Default total contracted revenue = upfront fee × multiple (over full term). */
export const SPONSOR_REVENUE_MULTIPLE_MIN = 1.05;
export const SPONSOR_REVENUE_MULTIPLE_MAX = 2.1;

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
    revenueMultipleMin: 1.05,
    revenueMultipleMax: 2.1,
    blurb: 'Pay the naming fee upfront; contracted sponsor revenue over the term typically exceeds the fee (e.g. ~$50M–$100M on a $48M package over 5 years).'
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
    blurb: 'Upfront title fee — sponsor revenue books monthly through the term.'
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

function revenueMultipleForDeal(deal, state) {
  const min = deal.revenueMultipleMin ?? SPONSOR_REVENUE_MULTIPLE_MIN;
  const max = deal.revenueMultipleMax ?? SPONSOR_REVENUE_MULTIPLE_MAX;
  let seed = state.meta?.runSeed ?? 1;
  const id = deal.id ?? '';
  for (let i = 0; i < id.length; i++) {
    seed = (seed + id.charCodeAt(i) * 31) % 2_147_483_647;
  }
  seed = (seed + calendarTurn(state) * 17) % 2_147_483_647;
  const r = (seed % 10_000) / 10_000;
  return min + r * (max - min);
}

/** Total sponsor revenue recognized over the contract term (not equal to upfront fee). */
export function computeSponsorTotalRevenue(deal, state, { upfrontFee = null } = {}) {
  const fee = Math.round(upfrontFee ?? deal.annualPayment ?? 0);
  if (fee <= 0) return 0;
  return Math.round(fee * revenueMultipleForDeal(deal, state));
}

export function sponsorRevenueRangeLabel(deal) {
  const fee = deal.annualPayment ?? 0;
  const min = deal.revenueMultipleMin ?? SPONSOR_REVENUE_MULTIPLE_MIN;
  const max = deal.revenueMultipleMax ?? SPONSOR_REVENUE_MULTIPLE_MAX;
  const yrs = deal.termYears ?? 1;
  return `${formatMoney(Math.round(fee * min))}–${formatMoney(Math.round(fee * max))} over ${yrs} yr`;
}

/** Migrate legacy monthly-fee contracts to upfront + revenue pool model. */
export function migrateLegacySponsorshipContract(contract, state) {
  if (!contract) return;
  if (contract.totalRevenueCommit != null && contract.revenueRemaining != null) {
    if (contract.monthlyGrant == null && contract.mrrMonthly != null) {
      contract.monthlyGrant = contract.mrrMonthly;
    }
    contract.paymentMonthly = 0;
    return;
  }
  const deal = getTreasurySponsorshipDeal(contract.dealId);
  const monthsTotal = Math.max(1, contract.monthsTotal ?? contract.monthsRemaining ?? 12);
  const monthsRemaining = Math.max(0, contract.monthsRemaining ?? monthsTotal);
  if (deal && contract.paymentMonthly > 0) {
    const upfront = deal.annualPayment ?? contract.paymentMonthly * 12;
    contract.upfrontPaid = contract.upfrontPaid ?? upfront;
    contract.upfrontBasis = contract.upfrontBasis ?? upfront;
    contract.totalRevenueCommit = computeSponsorTotalRevenue(deal, state ?? { meta: { runSeed: 1 } });
    const granted = (contract.mrrMonthly ?? contract.paymentMonthly) * (monthsTotal - monthsRemaining);
    contract.revenueRemaining = Math.max(0, contract.totalRevenueCommit - granted);
  } else {
    const legacyMrr = contract.mrrMonthly ?? contract.paymentMonthly ?? 0;
    contract.totalRevenueCommit = legacyMrr * monthsTotal;
    contract.revenueRemaining = legacyMrr * monthsRemaining;
    contract.upfrontPaid = contract.upfrontPaid ?? 0;
    contract.upfrontBasis = contract.upfrontBasis ?? deal?.annualPayment ?? 0;
  }
  contract.monthlyGrant = Math.round(
    contract.revenueRemaining / Math.max(1, monthsRemaining)
  );
  contract.mrrMonthly = contract.monthlyGrant;
  contract.paymentMonthly = 0;
}

export function sponsoredMrrMonthly(state) {
  return ensureSponsorships(state).active.reduce((s, c) => s + (c.mrrMonthly ?? c.monthlyGrant ?? 0), 0);
}

/** No recurring sponsor cash fees after upfront payment. */
export function sponsorshipPaymentMonthly(state) {
  return 0;
}

export function sponsorshipBookSummary(state) {
  const bag = ensureSponsorships(state);
  let remainingRevenue = 0;
  for (const c of bag.active) {
    remainingRevenue += c.revenueRemaining ?? 0;
  }
  return {
    activeCount: bag.active.length,
    remainingFees: 0,
    remainingMrrMonths: remainingRevenue,
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

  const upfront = Math.round(deal.annualPayment ?? 0);
  const signingBonus = Math.round(deal.signingBonus ?? 0);
  const cash = state.finance?.cash ?? 0;
  const need = upfront + signingBonus;
  if (upfront <= 0) return { ok: false, reason: 'Invalid deal economics.' };
  if (cash < need) {
    return {
      ok: false,
      reason: `Need ${formatMoney(need)} cash (${formatMoney(upfront)} upfront${signingBonus ? ` + ${formatMoney(signingBonus)} signing` : ''}; have ${formatMoney(cash)}).`
    };
  }
  const totalRevenue = computeSponsorTotalRevenue(deal, state);
  return { ok: true, deal, upfront, signingBonus, totalRevenue };
}

export function signTreasurySponsorship(state, dealId) {
  const gate = canSignTreasurySponsorship(state, dealId);
  if (!gate.ok) return gate;

  const deal = gate.deal;
  const upfront = gate.upfront;
  const signingBonus = gate.signingBonus ?? 0;
  const totalRevenue = gate.totalRevenue;
  const monthsTotal = Math.max(1, Math.round((deal.termYears ?? 1) * 12));
  const monthlyGrant = Math.round(totalRevenue / monthsTotal);

  state.finance.cash -= upfront;
  recordCashOutflow(state, upfront, 'sponsorship_upfront');
  ensureSponsorships(state).lifetimeFeesPaid =
    (ensureSponsorships(state).lifetimeFeesPaid ?? 0) + upfront;

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
    upfrontPaid: upfront,
    upfrontBasis: upfront,
    totalRevenueCommit: totalRevenue,
    revenueRemaining: totalRevenue,
    monthlyGrant,
    mrrMonthly: monthlyGrant,
    paymentMonthly: 0,
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
    amount: upfront + signingBonus,
    note: `${deal.termYears} yr · ${formatMoney(totalRevenue)} contracted revenue`
  });

  const brandLines = applyBrandEffects(state, deal, { onSign: true });
  const bonusNote = signingBonus ? ` Plus ${formatMoney(signingBonus)} signing bonus.` : '';

  return {
    ok: true,
    summary: `Signed ${deal.label} — paid ${formatMoney(upfront)} upfront for ${deal.termYears} yr.${bonusNote} Contracted sponsor revenue ${formatMoney(totalRevenue)} (~${formatMoney(monthlyGrant)}/mo at month close).`,
    brandLines,
    totalRevenue,
    monthlyGrant
  };
}

export function canRenewTreasurySponsorship(state, dealId) {
  const bag = ensureSponsorships(state);
  const c = bag.active.find((x) => x.dealId === dealId);
  if (!c) return { ok: false, reason: 'No active contract for this deal.' };
  if ((c.monthsRemaining ?? 0) > 3) {
    return { ok: false, reason: 'Renewal opens in the final 3 months of the term.' };
  }
  const deal = getTreasurySponsorshipDeal(dealId);
  const renewUpfront = Math.round((c.upfrontBasis ?? deal?.annualPayment ?? 0) * 1.05);
  if ((state.finance?.cash ?? 0) < renewUpfront) {
    return { ok: false, reason: `Need ${formatMoney(renewUpfront)} cash for the renewal upfront fee.` };
  }
  return { ok: true, contract: c, deal, renewUpfront };
}

/** Extend 12 months: pay +5% upfront fee, add a new contracted revenue pool. */
export function renewTreasurySponsorship(state, dealId) {
  const gate = canRenewTreasurySponsorship(state, dealId);
  if (!gate.ok) return gate;
  const c = gate.contract;
  const deal = gate.deal ?? getTreasurySponsorshipDeal(dealId);
  const renewUpfront = gate.renewUpfront;

  state.finance.cash -= renewUpfront;
  recordCashOutflow(state, renewUpfront, 'sponsorship_renewal');
  ensureSponsorships(state).lifetimeFeesPaid =
    (ensureSponsorships(state).lifetimeFeesPaid ?? 0) + renewUpfront;

  const addRevenue = deal
    ? computeSponsorTotalRevenue(deal, state, { upfrontFee: renewUpfront })
    : Math.round(renewUpfront * 1.25);

  c.upfrontBasis = renewUpfront;
  c.revenueRemaining = (c.revenueRemaining ?? 0) + addRevenue;
  c.totalRevenueCommit = (c.totalRevenueCommit ?? 0) + addRevenue;
  c.monthsRemaining = (c.monthsRemaining ?? 0) + 12;
  c.monthsTotal = (c.monthsTotal ?? 0) + 12;
  c.monthlyGrant = Math.round(c.revenueRemaining / Math.max(1, c.monthsRemaining));
  c.mrrMonthly = c.monthlyGrant;

  pushHistory(state, {
    kind: 'renewed',
    dealId: c.dealId,
    label: c.label,
    amount: renewUpfront,
    note: `+12 mo · +${formatMoney(addRevenue)} revenue`
  });
  return {
    ok: true,
    summary: `Renewed ${c.label} — ${formatMoney(renewUpfront)} upfront, +${formatMoney(addRevenue)} contracted revenue (${c.monthsRemaining} mo left, ~${formatMoney(c.mrrMonthly)}/mo).`
  };
}

export function canTerminateTreasurySponsorship(state, dealId) {
  const bag = ensureSponsorships(state);
  const c = bag.active.find((x) => x.dealId === dealId);
  if (!c) return { ok: false, reason: 'No active contract.' };
  const breakFee = Math.round((c.mrrMonthly ?? c.monthlyGrant ?? 0) * 3);
  if ((state.finance?.cash ?? 0) < breakFee) {
    return { ok: false, reason: `Need ${formatMoney(breakFee)} break fee (3× monthly grant).` };
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
    note: 'Early exit — unearned revenue forfeited'
  });
  return {
    ok: true,
    summary: `Terminated ${c.label} early — paid ${formatMoney(breakFee)} break fee. Remaining contracted revenue stops.`
  };
}

/** January: index remaining contracted revenue & monthly grant (no extra cash fee). */
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
    c.revenueRemaining = Math.round((c.revenueRemaining ?? 0) * mult);
    c.totalRevenueCommit = Math.round((c.totalRevenueCommit ?? 0) * mult);
    c.monthlyGrant = Math.round((c.monthlyGrant ?? c.mrrMonthly ?? 0) * mult);
    c.mrrMonthly = c.monthlyGrant;
  }
  return [
    `Sponsor revenue index +${Math.round(SPONSOR_ANNUAL_ESCALATION_RATE * 1000) / 10}% on ${bag.active.length} active deal(s) (remaining contracted revenue).`
  ];
}

/** Month-end: book contracted sponsor revenue (no recurring fee). */
export function settleTreasurySponsorshipsAtMonthEnd(state) {
  const bag = ensureSponsorships(state);
  if (!bag.active.length) return [];

  const lines = [];
  const stillActive = [];

  for (const contract of bag.active) {
    migrateLegacySponsorshipContract(contract, state);
    const remaining = contract.revenueRemaining ?? 0;
    const moLeft = contract.monthsRemaining ?? 0;
    if (remaining <= 0 || moLeft <= 0) {
      lines.push(`${contract.label} — term complete.`);
      pushHistory(state, {
        kind: 'expired',
        dealId: contract.dealId,
        label: contract.label,
        amount: 0,
        note: 'Term ended'
      });
      continue;
    }

    const grant =
      moLeft === 1 ? remaining : Math.min(remaining, contract.monthlyGrant ?? contract.mrrMonthly ?? 0);
    if (grant <= 0) continue;

    state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + grant;
    state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + grant;
    accrueFiscalRevenue(state, grant);
    bag.lifetimeMrrGranted = (bag.lifetimeMrrGranted ?? 0) + grant;
    contract.revenueRemaining = Math.max(0, remaining - grant);

    if (contract.buzzPerMonth) {
      state.product = state.product ?? { level: 0, buzz: 0 };
      state.product.buzz = (state.product.buzz ?? 0) + contract.buzzPerMonth;
    }

    contract.monthsRemaining = Math.max(0, moLeft - 1);
    if (contract.monthsRemaining > 0) {
      contract.monthlyGrant = Math.round(contract.revenueRemaining / contract.monthsRemaining);
      contract.mrrMonthly = contract.monthlyGrant;
    }

    lines.push(
      `${contract.label}: +${formatMoney(grant)} sponsor revenue (${formatMoney(contract.revenueRemaining)} left · ${contract.monthsRemaining} mo).`
    );
    pushHistory(state, {
      kind: 'recognized',
      dealId: contract.dealId,
      label: contract.label,
      amount: grant,
      note: 'Contracted sponsor revenue'
    });

    if (contract.monthsRemaining > 0 && contract.revenueRemaining > 0) stillActive.push(contract);
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
      migrateLegacySponsorshipContract(c, state);
      const canRenew = (c.monthsRemaining ?? 0) <= 3;
      const renewBtn = canRenew
        ? `<button type="button" class="btn btn-ghost btn-small" data-renew-sponsorship="${escapeHtml(c.dealId)}">Renew +12 mo</button>`
        : '';
      const termBtn = `<button type="button" class="btn btn-ghost btn-small" data-terminate-sponsorship="${escapeHtml(c.dealId)}" title="Pay 3× monthly grant break fee">Exit early</button>`;
      return `<tr>
        <td>${escapeHtml(c.label)}<br><span class="fine-print">${escapeHtml(sponsorshipCategoryLabel(c.category))}</span></td>
        <td class="num">~${formatMoney(c.mrrMonthly)}/mo</td>
        <td class="num">${formatMoney(c.revenueRemaining ?? 0)} left</td>
        <td class="num">${formatMoney(c.upfrontPaid ?? 0)} paid</td>
        <td class="num">${c.monthsRemaining} / ${c.monthsTotal ?? c.monthsRemaining}</td>
        <td class="treasury-sponsor-actions">${renewBtn} ${termBtn}</td>
      </tr>`;
    })
    .join('');
  return `<div class="table-scroll finance-cap-scroll">
    <table class="data-table">
      <thead><tr><th>Contract</th><th>Grant pace</th><th>Revenue left</th><th>Upfront paid</th><th>Months left</th><th></th></tr></thead>
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
  const signed = bag.signedDealIds.includes(deal.id);
  const disabled = !gate.ok || signed;
  const title = gate.ok && !signed ? '' : ` title="${escapeHtml(gate.reason ?? 'Unavailable')}"`;
  const bonus = deal.signingBonus ? ` Signing ${formatMoney(deal.signingBonus)}.` : '';
  const revRange = sponsorRevenueRangeLabel(deal);
  const tags = [
    deal.requiresPublic ? 'Public' : null,
    deal.requiresSeed ? 'Post-seed' : 'Pre-seed OK',
    deal.buzzPerMonth ? `+${deal.buzzPerMonth} buzz/mo` : null
  ]
    .filter(Boolean)
    .join(' · ');
  return `<div class="finance-action treasury-sponsor-deal">
    <p><strong>${escapeHtml(deal.label)}</strong> — ${formatMoney(deal.annualPayment)} upfront · ${deal.termYears} yr</p>
    <p class="fine-print">Contracted revenue (typical): <strong>${revRange}</strong> — not 1:1 with the fee; books monthly at month close.</p>
    <p class="fine-print">${escapeHtml(deal.blurb ?? '')}${deal.minArr ? ` Min ARR ${formatMoney(deal.minArr)}.` : ''}${bonus}</p>
    <p class="fine-print treasury-sponsor-tags">${escapeHtml(tags)}</p>
    <button type="button" class="btn btn-ghost btn-small" data-sign-sponsorship="${escapeHtml(deal.id)}" ${disabled ? 'disabled' : ''}${title}>${signed ? 'Signed this run' : 'Sign & pay upfront'}</button>
  </div>`;
}

export function renderTreasurySponsorshipPanel(state) {
  const deals = getTreasurySponsorshipDealsSync();
  const grant = sponsoredMrrMonthly(state);
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
      <span class="fine-print">Upfront fee · contracted revenue · up to ${MAX_ACTIVE_CONTRACTS} active</span>
    </div>
    <p class="fine-print">Sign from the catalog and pay the <strong>upfront sponsorship fee</strong> immediately (e.g. ${formatMoney(48_000_000)} on a flagship stadium deal). Over the term, <strong>contracted sponsor revenue</strong> recognizes at month close — typically <strong>more than the fee</strong> (often ~${Math.round(SPONSOR_REVENUE_MULTIPLE_MIN * 100)}–${Math.round(SPONSOR_REVENUE_MULTIPLE_MAX * 100)}% of upfront, e.g. ~${formatMoney(50_000_000)}–${formatMoney(100_000_000)} on $48M over 5 years). No monthly sponsor fees. January indexes remaining revenue ~${Math.round(SPONSOR_ANNUAL_ESCALATION_RATE * 1000) / 10}%. Renew in the last 3 months (+5% upfront) or exit early (3× monthly grant break fee).</p>
    ${panelMetricGrid('4', [
      panelStatCard('Active grant pace', grant > 0 ? `~${formatMoney(grant)}/mo` : '—', { hero: grant > 0 }),
      panelStatCard('Revenue left on book', formatMoney(book.remainingMrrMonths)),
      panelStatCard('Lifetime fees paid', formatMoney(book.lifetimeFees)),
      panelStatCard('Lifetime revenue booked', formatMoney(book.lifetimeMrr))
    ])}
    ${panelMetricGrid('2', [
      panelStatCard('Active contracts', String(book.activeCount)),
      panelStatCard('Recurring sponsor fees', '$0/mo (upfront deals)')
    ])}
    <h4 class="finance-subhead">Active contracts</h4>
    ${renderActiveContracts(state)}
    ${renderHistory(state)}
    <h4 class="finance-subhead">Available packages</h4>
    <div class="treasury-sponsor-catalog">${catalog}</div>
  </section>`;
}

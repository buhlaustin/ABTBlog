import { formatMoney } from './constants.js';
import { getArr } from './Workspace.js';
import { accrueFiscalRevenue } from './CorporateTax.js';
import {
  escapeHtml,
  panelStatCard,
  panelMetricGrid,
  panelMetricGroup,
  panelSnapshotSection
} from './PanelChrome.js';

/** Mandatory desk task each live conference month — main stage presentation. */
export const CONFERENCE_KEYNOTE_TASK_ID = 'conf-keynote-script-lock';

export const CONFERENCE_MIN_BUDGET = 25_000;
export const CONFERENCE_MAX_BUDGET = 5_000_000;
export const CONFERENCE_BUDGET_PRESETS = [50_000, 150_000, 350_000, 750_000, 1_500_000, 3_000_000];

export const CONFERENCE_SPONSOR_TIERS = [
  {
    id: 'community',
    label: 'Community sponsors',
    blurb: 'Logo wall + booth stipends.',
    budgetMult: 1,
    attendeeMult: 1,
    sponsorRevPct: 0.1,
    deskMultBonus: 0
  },
  {
    id: 'regional',
    label: 'Regional partners',
    blurb: 'Named lounges and session sponsorships.',
    budgetMult: 1.18,
    attendeeMult: 1.1,
    sponsorRevPct: 0.16,
    deskMultBonus: 0.06
  },
  {
    id: 'flagship',
    label: 'Flagship brands',
    blurb: 'Keynote co-brand and expo hall zones.',
    budgetMult: 1.38,
    attendeeMult: 1.18,
    sponsorRevPct: 0.24,
    deskMultBonus: 0.12
  },
  {
    id: 'title',
    label: 'Title sponsor',
    blurb: 'Your conference name becomes “Presented by …”.',
    budgetMult: 1.65,
    attendeeMult: 1.28,
    sponsorRevPct: 0.34,
    deskMultBonus: 0.18
  }
];

export const CONFERENCE_TICKET_TIERS = [
  {
    id: 'free',
    label: 'Free + VIP list',
    blurb: 'Max reach; monetize via sponsors and upsells.',
    attendeeMult: 1.22,
    ticketRevPerAttendee: 0
  },
  {
    id: 'paid',
    label: 'Paid passes',
    blurb: 'Standard SaaS conf pricing.',
    attendeeMult: 1,
    ticketRevPerAttendee: 48
  },
  {
    id: 'enterprise',
    label: 'Enterprise only',
    blurb: 'Invite-only buyers; smaller crowd, fat contracts.',
    attendeeMult: 0.78,
    ticketRevPerAttendee: 920
  }
];

export const CALENDAR_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

export function createInitialStartupConferenceState() {
  return {
    name: '',
    budget: 150_000,
    monthIndex: 10,
    sponsorTier: 'regional',
    ticketTier: 'paid',
    configured: false,
    budgetPaidYear: null,
    projectedAttendees: 0,
    lastHeldYear: null,
    lastAttendees: 0,
    lastRevenue: 0,
    lastTicketRevenue: 0,
    lastSponsorRevenue: 0,
    lastDeskRevenue: 0,
    editionsHeld: 0,
    history: [],
    lifetimeAttendees: 0,
    lifetimeRevenue: 0,
    lifetimeTicketRevenue: 0,
    lifetimeSponsorRevenue: 0,
    lifetimeBudgetSpend: 0
  };
}

export function getConferenceSponsorTier(id) {
  return CONFERENCE_SPONSOR_TIERS.find((t) => t.id === id) ?? CONFERENCE_SPONSOR_TIERS[0];
}

export function getConferenceTicketTier(id) {
  return CONFERENCE_TICKET_TIERS.find((t) => t.id === id) ?? CONFERENCE_TICKET_TIERS[1];
}

export function conferenceUnlocked(state) {
  return Boolean(state.flags?.seedRoundClosed);
}

export function ensureStartupConference(state) {
  if (!state.startupConference) {
    state.startupConference = createInitialStartupConferenceState();
  }
  return state.startupConference;
}

export function isConferenceConfigured(state) {
  const c = ensureStartupConference(state);
  const name = String(c.name ?? '').trim();
  return c.configured && name.length >= 3 && (c.budget ?? 0) >= CONFERENCE_MIN_BUDGET;
}

export function conferenceEditionMomentumMult(state) {
  const editions = ensureStartupConference(state).editionsHeld ?? 0;
  return 1 + Math.min(0.36, editions * 0.06);
}

/** Cash due at month open (base budget × sponsor tier). */
export function effectiveConferenceBudgetCharge(state) {
  const c = ensureStartupConference(state);
  const base = Math.max(CONFERENCE_MIN_BUDGET, c.budget ?? CONFERENCE_MIN_BUDGET);
  const sponsor = getConferenceSponsorTier(c.sponsorTier ?? 'community');
  return Math.round(base * sponsor.budgetMult);
}

export function projectedConferenceAttendees(state) {
  const c = ensureStartupConference(state);
  const base = Math.max(0, c.budget ?? 0);
  const arr = getArr(state);
  const sponsor = getConferenceSponsorTier(c.sponsorTier ?? 'community');
  const ticket = getConferenceTicketTier(c.ticketTier ?? 'paid');
  const core = 450 + base / 850 + Math.min(8000, arr / 45_000);
  const momentum = conferenceEditionMomentumMult(state);
  return Math.round(core * sponsor.attendeeMult * ticket.attendeeMult * momentum);
}

export function estimateConferenceMonthEconomics(state) {
  const c = ensureStartupConference(state);
  const baseBudget = Math.max(CONFERENCE_MIN_BUDGET, c.budget ?? CONFERENCE_MIN_BUDGET);
  const charge = effectiveConferenceBudgetCharge(state);
  const attendees = projectedConferenceAttendees(state);
  const sponsor = getConferenceSponsorTier(c.sponsorTier ?? 'community');
  const ticket = getConferenceTicketTier(c.ticketTier ?? 'paid');
  const momentum = conferenceEditionMomentumMult(state);
  const sponsorRev = Math.round(baseBudget * sponsor.sponsorRevPct * momentum);
  const ticketRev = Math.round(attendees * ticket.ticketRevPerAttendee);
  const deskMult = conferenceTaskRevenueMultiplier(state, { startupConference: true });
  return {
    baseBudget,
    charge,
    attendees,
    sponsorRev,
    ticketRev,
    totalBonusRev: sponsorRev + ticketRev,
    deskMult,
    momentum,
    editionsHeld: c.editionsHeld ?? 0
  };
}

/** True during the calendar month when your annual conference runs. */
export function isStartupConferenceMonth(state) {
  if (!conferenceUnlocked(state) || !isConferenceConfigured(state)) return false;
  const c = ensureStartupConference(state);
  return (state.calendar?.monthIndex ?? 0) === (c.monthIndex ?? 0);
}

export function isConferenceNextMonth(state) {
  if (!isConferenceConfigured(state)) return false;
  return monthsUntilConference(state) === 1;
}

export function conferenceMonthLabel(monthIndex) {
  const i = Math.max(1, Math.min(12, Math.round(Number(monthIndex) || 1))) - 1;
  return CALENDAR_MONTH_NAMES[i] ?? 'October';
}

/** Budget scales desk payout on conference-only tasks this month. */
export function conferenceTaskRevenueMultiplier(state, taskDef) {
  if (!taskDef?.startupConference || !isStartupConferenceMonth(state)) return 1;
  const c = ensureStartupConference(state);
  const base = Math.max(CONFERENCE_MIN_BUDGET, c.budget ?? CONFERENCE_MIN_BUDGET);
  const sponsor = getConferenceSponsorTier(c.sponsorTier ?? 'community');
  const mult = 0.72 + Math.sqrt(base / 38_000) + sponsor.deskMultBonus;
  return Math.min(4.2, mult * conferenceEditionMomentumMult(state));
}

export function conferenceConfigLocked(state) {
  if (!isStartupConferenceMonth(state)) return false;
  const c = ensureStartupConference(state);
  return c.budgetPaidYear === state.calendar?.year;
}

export function canSaveConferenceConfig(state, { name, budgetRaw, monthIndexRaw, sponsorTier, ticketTier }) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  if (!conferenceUnlocked(state)) {
    return { ok: false, reason: 'Startup Conference unlocks after seed closes.' };
  }
  if (conferenceConfigLocked(state)) {
    return {
      ok: false,
      reason: 'Conference is live this month — update name, budget, or month after month close.'
    };
  }
  const nameTrim = String(name ?? '').trim();
  if (nameTrim.length < 3) return { ok: false, reason: 'Conference name needs at least 3 characters.' };
  if (nameTrim.length > 56) return { ok: false, reason: 'Conference name is too long (56 char max).' };
  const budget = Math.round(Number(budgetRaw) || 0);
  if (budget < CONFERENCE_MIN_BUDGET) {
    return { ok: false, reason: `Minimum conference budget is ${formatMoney(CONFERENCE_MIN_BUDGET)}.` };
  }
  if (budget > CONFERENCE_MAX_BUDGET) {
    return { ok: false, reason: `Cap conference budget at ${formatMoney(CONFERENCE_MAX_BUDGET)}.` };
  }
  const monthIndex = Math.round(Number(monthIndexRaw) || 0);
  if (monthIndex < 1 || monthIndex > 12) return { ok: false, reason: 'Pick a calendar month (1–12).' };
  if (!CONFERENCE_SPONSOR_TIERS.some((t) => t.id === sponsorTier)) {
    return { ok: false, reason: 'Pick a sponsor package.' };
  }
  if (!CONFERENCE_TICKET_TIERS.some((t) => t.id === ticketTier)) {
    return { ok: false, reason: 'Pick a ticket strategy.' };
  }
  return { ok: true, name: nameTrim, budget, monthIndex, sponsorTier, ticketTier };
}

export function saveStartupConferenceConfig(state, payload) {
  const gate = canSaveConferenceConfig(state, payload);
  if (!gate.ok) return gate;
  const c = ensureStartupConference(state);
  c.name = gate.name;
  c.budget = gate.budget;
  c.monthIndex = gate.monthIndex;
  c.sponsorTier = gate.sponsorTier;
  c.ticketTier = gate.ticketTier;
  c.configured = true;
  c.projectedAttendees = projectedConferenceAttendees(state);
  const monthName = conferenceMonthLabel(gate.monthIndex);
  const econ = estimateConferenceMonthEconomics(state);
  const yoy =
    c.editionsHeld > 0
      ? ` Edition ${c.editionsHeld + 1} — momentum ${(econ.momentum * 100 - 100).toFixed(0)}% bonus on attendance and sponsor yield.`
      : '';
  return {
    ok: true,
    summary: `Saved “${gate.name}” — ${formatMoney(gate.budget)} base budget each ${monthName} (${formatMoney(econ.charge)} due at open with ${getConferenceSponsorTier(gate.sponsorTier).label}). Est. ~${econ.attendees.toLocaleString('en-US')} attendees · ${econ.deskMult.toFixed(2)}× desk payouts.${yoy}`
  };
}

/** @returns {{ lines: string[]; budgetCharge: number }} */
export function tickStartupConferenceAtMonthStart(state) {
  if (!isStartupConferenceMonth(state)) return { lines: [], budgetCharge: 0 };
  const c = ensureStartupConference(state);
  const year = state.calendar?.year;
  if (c.budgetPaidYear === year) return { lines: [], budgetCharge: 0 };
  const budget = effectiveConferenceBudgetCharge(state);
  const cash = state.finance?.cash ?? 0;
  if (cash < budget) {
    return {
      lines: [
        `Conference month but cash is ${formatMoney(cash)} — need ${formatMoney(budget)} to open “${c.name}”. Desk stays on normal tasks until funded.`
      ],
      budgetCharge: 0
    };
  }
  state.finance.cash -= budget;
  state.calendar.monthSpend = (state.calendar.monthSpend ?? 0) + budget;
  c.budgetPaidYear = year;
  c.projectedAttendees = projectedConferenceAttendees(state);
  c.lifetimeBudgetSpend = (c.lifetimeBudgetSpend ?? 0) + budget;
  const econ = estimateConferenceMonthEconomics(state);
  return {
    lines: [
      `Opened ${c.name} (${formatMoney(budget)} production budget) — ~${c.projectedAttendees.toLocaleString('en-US')} attendees expected · desk ${econ.deskMult.toFixed(2)}× · est. ${formatMoney(econ.sponsorRev + econ.ticketRev)} sponsor/ticket yield at month close.`
    ],
    budgetCharge: budget
  };
}

export function conferenceMonthActive(state) {
  if (!isStartupConferenceMonth(state)) return false;
  const c = ensureStartupConference(state);
  return c.budgetPaidYear === state.calendar?.year;
}

/** CEO main-stage keynote must appear in the desk lineup during a funded conference month. */
export function isConferenceKeynoteMandatory(state) {
  return conferenceMonthActive(state);
}

function creditConferenceYield(state, amount, label) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (!n) return 0;
  state.finance.cash = (state.finance.cash ?? 0) + n;
  state.finance.lifetimeRevenue = (state.finance.lifetimeRevenue ?? 0) + n;
  accrueFiscalRevenue(state, n);
  state.calendar.monthRevenue = (state.calendar.monthRevenue ?? 0) + n;
  return n;
}

export function settleStartupConferenceAtMonthEnd(state, closedMonthIndex, closedYear) {
  const c = ensureStartupConference(state);
  if ((c.monthIndex ?? 0) !== closedMonthIndex) return [];
  if (c.budgetPaidYear !== closedYear) return [];
  const deskRev = state.calendar?.monthRevenue ?? 0;
  const attendees = c.projectedAttendees ?? projectedConferenceAttendees(state);
  const econ = estimateConferenceMonthEconomics(state);
  const ticketPaid = creditConferenceYield(state, econ.ticketRev, 'tickets');
  const sponsorPaid = creditConferenceYield(state, econ.sponsorRev, 'sponsors');
  const monthRev = deskRev + ticketPaid + sponsorPaid;

  c.lastHeldYear = closedYear;
  c.lastAttendees = attendees;
  c.lastRevenue = monthRev;
  c.lastTicketRevenue = ticketPaid;
  c.lastSponsorRevenue = sponsorPaid;
  c.lastDeskRevenue = deskRev;
  c.lifetimeAttendees = (c.lifetimeAttendees ?? 0) + attendees;
  c.lifetimeRevenue = (c.lifetimeRevenue ?? 0) + monthRev;
  c.lifetimeTicketRevenue = (c.lifetimeTicketRevenue ?? 0) + ticketPaid;
  c.lifetimeSponsorRevenue = (c.lifetimeSponsorRevenue ?? 0) + sponsorPaid;
  c.editionsHeld = (c.editionsHeld ?? 0) + 1;
  if (!c.history) c.history = [];
  c.history.unshift({
    year: closedYear,
    attendees,
    deskRevenue: deskRev,
    ticketRevenue: ticketPaid,
    sponsorRevenue: sponsorPaid,
    totalRevenue: monthRev,
    budget: c.budget,
    charge: effectiveConferenceBudgetCharge(state),
    sponsorTier: c.sponsorTier,
    ticketTier: c.ticketTier
  });
  if (c.history.length > 8) c.history.length = 8;

  state.product = state.product ?? { level: 0, buzz: 0 };
  state.product.buzz = (state.product.buzz ?? 0) + 2 + Math.min(4, Math.floor(attendees / 2500));
  if (state.sentiment && attendees >= 1200) {
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + 1);
  }

  const lines = [
    `${c.name} wrapped (edition ${c.editionsHeld}) — ~${attendees.toLocaleString('en-US')} attendees · desk ${formatMoney(deskRev)} + tickets ${formatMoney(ticketPaid)} + sponsors ${formatMoney(sponsorPaid)}.`
  ];
  if (c.editionsHeld >= 2) {
    lines.push(
      `Momentum builds — next ${conferenceMonthLabel(c.monthIndex)} gets ${((conferenceEditionMomentumMult(state) - 1) * 100).toFixed(0)}% stronger attendance and sponsor yield.`
    );
  }
  return lines;
}

export function monthsUntilConference(state) {
  if (!isConferenceConfigured(state)) return null;
  const c = ensureStartupConference(state);
  const curM = state.calendar?.monthIndex ?? 1;
  const target = c.monthIndex ?? 10;
  if (curM <= target) return target - curM;
  return 12 - curM + target;
}

export function suggestedConferenceBudgetBump(state) {
  const c = ensureStartupConference(state);
  if (!c.lastHeldYear || !c.budget) return null;
  const arr = getArr(state);
  const bump = arr >= 50_000_000 ? 1.45 : arr >= 12_000_000 ? 1.28 : arr >= 2_000_000 ? 1.15 : 1.08;
  return Math.min(CONFERENCE_MAX_BUDGET, Math.round(c.budget * bump));
}

export function renderStartupConferenceDeskBanner(state) {
  if (conferenceMonthActive(state)) {
    const c = ensureStartupConference(state);
    const econ = estimateConferenceMonthEconomics(state);
    return `<p class="fine-print launch-phase-banner"><strong>${escapeHtml(c.name)}</strong> — conference month: desk tasks only · <strong>main stage keynote is mandatory</strong> · ${econ.deskMult.toFixed(2)}× payouts · ~${econ.attendees.toLocaleString('en-US')} attendees · ${formatMoney(econ.sponsorRev + econ.ticketRev)} sponsor/ticket yield at close.</p>`;
  }
  if (isConferenceNextMonth(state)) {
    const c = ensureStartupConference(state);
    const charge = effectiveConferenceBudgetCharge(state);
    return `<p class="fine-print finance-alert finance-alert--ok"><strong>${escapeHtml(c.name)}</strong> next month — keep ${formatMoney(charge)} company cash ready; the desk flips to conference-only tasks.</p>`;
  }
  return '';
}

export function renderStartupConferencePanel(state) {
  if (!conferenceUnlocked(state)) {
    return `<section class="finance-section finance-card">
      <h3 class="finance-section-title">Startup Conference</h3>
      <p class="fine-print">Close seed to launch your own branded conference — name it, set a budget, and pick an annual month. That month, the desk becomes entirely conference operations.</p>
    </section>`;
  }

  const c = ensureStartupConference(state);
  const disabled = state.flags?.gameOver ? 'disabled' : '';
  const locked = conferenceConfigLocked(state);
  const lockNote = locked
    ? '<p class="finance-alert finance-alert--tax">Conference is in progress this month — change settings after month close.</p>'
    : '';
  const monthOptions = CALENDAR_MONTH_NAMES.map(
    (label, idx) =>
      `<option value="${idx + 1}"${(c.monthIndex ?? 10) === idx + 1 ? ' selected' : ''}>${label}</option>`
  ).join('');
  const sponsorOptions = CONFERENCE_SPONSOR_TIERS.map(
    (t) =>
      `<option value="${escapeHtml(t.id)}"${(c.sponsorTier ?? 'regional') === t.id ? ' selected' : ''}>${escapeHtml(t.label)}</option>`
  ).join('');
  const ticketOptions = CONFERENCE_TICKET_TIERS.map(
    (t) =>
      `<option value="${escapeHtml(t.id)}"${(c.ticketTier ?? 'paid') === t.id ? ' selected' : ''}>${escapeHtml(t.label)}</option>`
  ).join('');
  const presetBtns = CONFERENCE_BUDGET_PRESETS.map(
    (amt) =>
      `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-conference-budget-preset="${amt}" ${disabled || locked ? 'disabled' : ''}>${formatMoney(amt)}</button>`
  ).join('');
  const econ = estimateConferenceMonthEconomics(state);
  const until = monthsUntilConference(state);
  const untilLabel = until === 0 ? 'This month' : until != null ? `${until} mo` : '—';
  const active = conferenceMonthActive(state);
  const bump = suggestedConferenceBudgetBump(state);
  const yoyNote =
    bump && bump > (c.budget ?? 0) && c.editionsHeld > 0
      ? `<p class="fine-print">YoY tip: with today’s ARR, consider raising base budget toward ${formatMoney(bump)} before next ${escapeHtml(conferenceMonthLabel(c.monthIndex ?? 10))}.</p>`
      : '';

  const historyRows = (c.history ?? []).length
    ? (c.history ?? [])
        .map(
          (h) =>
            `<tr><td>${h.year}</td><td class="num">${(h.attendees ?? 0).toLocaleString('en-US')}</td><td class="num">${formatMoney(h.deskRevenue ?? 0)}</td><td class="num">${formatMoney((h.ticketRevenue ?? 0) + (h.sponsorRevenue ?? 0))}</td><td class="fine-print">${escapeHtml(getConferenceSponsorTier(h.sponsorTier).label)}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="5">No editions yet.</td></tr>';

  return `
    ${panelSnapshotSection(
      panelMetricGroup(
        'Conference snapshot',
        panelMetricGrid('4', [
          panelStatCard('Next / current', untilLabel, { hero: active }),
          panelStatCard('Editions held', String(c.editionsHeld ?? 0)),
          panelStatCard('Projected attendees', econ.attendees > 0 ? econ.attendees.toLocaleString('en-US') : '—'),
          panelStatCard('Desk revenue ×', `${econ.deskMult.toFixed(2)}×`, { hero: isConferenceConfigured(state) })
        ])
      ),
      { ariaLabel: 'Conference snapshot' }
    )}
    ${panelMetricGrid('3', [
      panelStatCard('Month-open charge', formatMoney(econ.charge)),
      panelStatCard('Est. ticket yield', formatMoney(econ.ticketRev)),
      panelStatCard('Est. sponsor yield', formatMoney(econ.sponsorRev))
    ])}
    ${lockNote}
    ${yoyNote}
    <section class="finance-section finance-card">
      <h3 class="finance-section-title">Plan your conference</h3>
      <p class="fine-print">Held every <strong>${escapeHtml(conferenceMonthLabel(c.monthIndex ?? 10))}</strong>. Base budget × sponsor package is charged at month open. Ticket strategy shapes crowd size and pass revenue. Each edition adds up to <strong>+6% momentum</strong> (cap +36%) on attendance and sponsor yield.</p>
      <div class="finance-inline-form ceo-salary-row">
        <label for="conference-name-input">Conference name</label>
        <input id="conference-name-input" type="text" maxlength="56" placeholder="e.g. Nexus Summit" value="${escapeHtml(c.name ?? '')}" ${disabled || locked ? 'disabled' : ''}>
      </div>
      <p class="fine-print">Base production budget</p>
      <div class="finance-charity-chips">${presetBtns}</div>
      <div class="finance-inline-form ceo-salary-row">
        <label for="conference-budget-input">Budget</label>
        <input id="conference-budget-input" type="number" min="${CONFERENCE_MIN_BUDGET}" step="5000" value="${c.budget ?? 150_000}" ${disabled || locked ? 'disabled' : ''}>
        <label for="conference-month-select">Month</label>
        <select id="conference-month-select" ${disabled || locked ? 'disabled' : ''}>${monthOptions}</select>
      </div>
      <div class="finance-inline-form ceo-salary-row">
        <label for="conference-sponsor-select">Sponsor package</label>
        <select id="conference-sponsor-select" ${disabled || locked ? 'disabled' : ''}>${sponsorOptions}</select>
        <label for="conference-ticket-select">Tickets</label>
        <select id="conference-ticket-select" ${disabled || locked ? 'disabled' : ''}>${ticketOptions}</select>
        <button type="button" class="btn btn-small" id="btn-save-conference-config" ${disabled || locked ? 'disabled' : ''}>Save schedule</button>
      </div>
      <ul class="instrument-list fine-print">
        ${CONFERENCE_SPONSOR_TIERS.map((t) => `<li><strong>${escapeHtml(t.label)}</strong> — ${escapeHtml(t.blurb)}</li>`).join('')}
      </ul>
    </section>
    <section class="finance-section finance-section--cap">
      <h3 class="finance-section-title">Edition history</h3>
      <div class="table-scroll finance-cap-scroll">
        <table class="data-table">
          <thead><tr><th>Year</th><th>Attendees</th><th>Desk</th><th>Pass + sponsor</th><th>Package</th></tr></thead>
          <tbody>${historyRows}</tbody>
        </table>
      </div>
      <p class="fine-print">Lifetime conference yield: ${formatMoney(c.lifetimeRevenue ?? 0)} (${formatMoney(c.lifetimeBudgetSpend ?? 0)} production spend).</p>
    </section>
    <section class="finance-section finance-card">
      <h3 class="finance-section-title">How it works</h3>
      <ul class="instrument-list">
        <li>During your conference month, <strong>every desk offer</strong> is a conference task. The <strong>main stage keynote / presentation</strong> is mandatory in your lineup (April tax filings still appear when due).</li>
        <li>Desk payouts scale with base budget, sponsor tier, and edition momentum.</li>
        <li>At month close you also collect modeled <strong>ticket</strong> and <strong>sponsor</strong> revenue into company cash.</li>
      </ul>
    </section>
  `;
}

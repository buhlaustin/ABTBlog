import { formatMoney } from './constants.js';
import { getArr } from './Workspace.js';
import {
  escapeHtml,
  panelStatCard,
  panelMetricGrid,
  panelMetricGroup,
  panelSnapshotSection
} from './PanelChrome.js';

export const CONFERENCE_MIN_BUDGET = 25_000;
export const CONFERENCE_MAX_BUDGET = 5_000_000;
export const CONFERENCE_BUDGET_PRESETS = [50_000, 150_000, 350_000, 750_000, 1_500_000, 3_000_000];

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
    configured: false,
    budgetPaidYear: null,
    projectedAttendees: 0,
    lastHeldYear: null,
    lastAttendees: 0,
    lastRevenue: 0,
    lifetimeAttendees: 0,
    lifetimeRevenue: 0,
    lifetimeBudgetSpend: 0
  };
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

/** True during the calendar month when your annual conference runs. */
export function isStartupConferenceMonth(state) {
  if (!conferenceUnlocked(state) || !isConferenceConfigured(state)) return false;
  const c = ensureStartupConference(state);
  return (state.calendar?.monthIndex ?? 0) === (c.monthIndex ?? 0);
}

export function conferenceMonthLabel(monthIndex) {
  const i = Math.max(1, Math.min(12, Math.round(Number(monthIndex) || 1))) - 1;
  return CALENDAR_MONTH_NAMES[i] ?? 'October';
}

export function projectedConferenceAttendees(state) {
  const c = ensureStartupConference(state);
  const budget = Math.max(0, c.budget ?? 0);
  const arr = getArr(state);
  return Math.round(450 + budget / 850 + Math.min(8000, arr / 45_000));
}

/** Budget scales desk payout on conference-only tasks this month. */
export function conferenceTaskRevenueMultiplier(state, taskDef) {
  if (!taskDef?.startupConference || !isStartupConferenceMonth(state)) return 1;
  const budget = Math.max(CONFERENCE_MIN_BUDGET, ensureStartupConference(state).budget ?? CONFERENCE_MIN_BUDGET);
  const mult = 0.72 + Math.sqrt(budget / 38_000);
  return Math.min(3.6, mult);
}

export function conferenceConfigLocked(state) {
  if (!isStartupConferenceMonth(state)) return false;
  const c = ensureStartupConference(state);
  return c.budgetPaidYear === state.calendar?.year;
}

export function canSaveConferenceConfig(state, { name, budgetRaw, monthIndexRaw }) {
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
  return { ok: true, name: nameTrim, budget, monthIndex };
}

export function saveStartupConferenceConfig(state, payload) {
  const gate = canSaveConferenceConfig(state, payload);
  if (!gate.ok) return gate;
  const c = ensureStartupConference(state);
  c.name = gate.name;
  c.budget = gate.budget;
  c.monthIndex = gate.monthIndex;
  c.configured = true;
  c.projectedAttendees = projectedConferenceAttendees(state);
  const monthName = conferenceMonthLabel(gate.monthIndex);
  return {
    ok: true,
    summary: `Saved “${gate.name}” — ${formatMoney(gate.budget)} budget each ${monthName}. Desk switches to conference tasks that month (revisit yearly as revenue grows).`
  };
}

/** @returns {{ lines: string[]; budgetCharge: number }} */
export function tickStartupConferenceAtMonthStart(state) {
  if (!isStartupConferenceMonth(state)) return { lines: [], budgetCharge: 0 };
  const c = ensureStartupConference(state);
  const year = state.calendar?.year;
  if (c.budgetPaidYear === year) return { lines: [], budgetCharge: 0 };
  const budget = Math.max(CONFERENCE_MIN_BUDGET, c.budget ?? CONFERENCE_MIN_BUDGET);
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
  return {
    lines: [
      `Opened ${c.name} (${formatMoney(budget)}) — ~${c.projectedAttendees.toLocaleString('en-US')} attendees expected. Desk tasks are conference-only this month.`
    ],
    budgetCharge: budget
  };
}

/** Conference month failed to fund — desk should not be conference-only. */
export function conferenceMonthActive(state) {
  if (!isStartupConferenceMonth(state)) return false;
  const c = ensureStartupConference(state);
  return c.budgetPaidYear === state.calendar?.year;
}

export function settleStartupConferenceAtMonthEnd(state, closedMonthIndex, closedYear) {
  const c = ensureStartupConference(state);
  if ((c.monthIndex ?? 0) !== closedMonthIndex) return [];
  if (c.budgetPaidYear !== closedYear) return [];
  const monthRev = state.calendar?.monthRevenue ?? 0;
  const attendees = c.projectedAttendees ?? projectedConferenceAttendees(state);
  c.lastHeldYear = closedYear;
  c.lastAttendees = attendees;
  c.lastRevenue = monthRev;
  c.lifetimeAttendees = (c.lifetimeAttendees ?? 0) + attendees;
  c.lifetimeRevenue = (c.lifetimeRevenue ?? 0) + monthRev;
  state.product = state.product ?? { level: 0, buzz: 0 };
  state.product.buzz = (state.product.buzz ?? 0) + 2;
  return [
    `${c.name} wrapped — ~${attendees.toLocaleString('en-US')} attendees, ${formatMoney(monthRev)} conference-month desk revenue (budget already paid).`
  ];
}

export function monthsUntilConference(state) {
  if (!isConferenceConfigured(state)) return null;
  const c = ensureStartupConference(state);
  const curM = state.calendar?.monthIndex ?? 1;
  const target = c.monthIndex ?? 10;
  if (curM <= target) return target - curM;
  return 12 - curM + target;
}

export function renderStartupConferenceDeskBanner(state) {
  if (!conferenceMonthActive(state)) return '';
  const c = ensureStartupConference(state);
  return `<p class="fine-print launch-phase-banner"><strong>${escapeHtml(c.name)}</strong> — conference month: desk tasks are production, sponsors, and sessions only. Revenue scales with your ${formatMoney(c.budget)} budget.</p>`;
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
  const presetBtns = CONFERENCE_BUDGET_PRESETS.map(
    (amt) =>
      `<button type="button" class="btn btn-ghost btn-small finance-chip-btn" data-conference-budget-preset="${amt}" ${disabled || locked ? 'disabled' : ''}>${formatMoney(amt)}</button>`
  ).join('');
  const attendees = projectedConferenceAttendees(state);
  const revMult = conferenceTaskRevenueMultiplier(state, { startupConference: true }).toFixed(2);
  const until = monthsUntilConference(state);
  const untilLabel = until === 0 ? 'This month' : until != null ? `${until} mo` : '—';
  const active = conferenceMonthActive(state);

  return `
    ${panelSnapshotSection(
      panelMetricGroup(
        'Conference snapshot',
        panelMetricGrid('4', [
          panelStatCard('Next / current', untilLabel, { hero: active }),
          panelStatCard('Projected attendees', attendees > 0 ? attendees.toLocaleString('en-US') : '—'),
          panelStatCard('Desk revenue ×', `${revMult}×`, { hero: isConferenceConfigured(state) }),
          panelStatCard('Lifetime conf. rev.', formatMoney(c.lifetimeRevenue ?? 0))
        ])
      ),
      { ariaLabel: 'Conference snapshot' }
    )}
    ${lockNote}
    <section class="finance-section finance-card">
      <h3 class="finance-section-title">Plan your conference</h3>
      <p class="fine-print">Held every <strong>${escapeHtml(conferenceMonthLabel(c.monthIndex ?? 10))}</strong> once configured. Budget is charged from company cash when that month starts. Revisit this tab before next year — higher revenue and a bigger budget unlock stronger payouts.</p>
      ${
        c.lastHeldYear
          ? `<p class="fine-print">Last run (${c.lastHeldYear}): ~${(c.lastAttendees ?? 0).toLocaleString('en-US')} attendees · ${formatMoney(c.lastRevenue ?? 0)} desk revenue.</p>`
          : ''
      }
      <div class="finance-inline-form ceo-salary-row">
        <label for="conference-name-input">Conference name</label>
        <input id="conference-name-input" type="text" maxlength="56" placeholder="e.g. Nexus Summit" value="${escapeHtml(c.name ?? '')}" ${disabled || locked ? 'disabled' : ''}>
      </div>
      <p class="fine-print">Annual budget (charged at month open)</p>
      <div class="finance-charity-chips">${presetBtns}</div>
      <div class="finance-inline-form ceo-salary-row">
        <label for="conference-budget-input">Budget</label>
        <input id="conference-budget-input" type="number" min="${CONFERENCE_MIN_BUDGET}" step="5000" value="${c.budget ?? 150_000}" ${disabled || locked ? 'disabled' : ''}>
        <label for="conference-month-select">Month</label>
        <select id="conference-month-select" ${disabled || locked ? 'disabled' : ''}>${monthOptions}</select>
        <button type="button" class="btn btn-small" id="btn-save-conference-config" ${disabled || locked ? 'disabled' : ''}>Save schedule</button>
      </div>
    </section>
    <section class="finance-section finance-card">
      <h3 class="finance-section-title">How it works</h3>
      <ul class="instrument-list">
        <li>During your conference month, <strong>every desk offer</strong> is a conference task (mandatory tax filings still appear in April).</li>
        <li>Budget sets projected attendance and multiplies conference task revenue (≈${revMult}× at current budget).</li>
        <li>Typical budgets ${formatMoney(50_000)}–${formatMoney(1_500_000)} post-seed; ${formatMoney(3_000_000)}+ when you’re hub-scale.</li>
      </ul>
    </section>
  `;
}

import { formatMoney } from './constants.js';
import { calendarTurn } from './GameCalendar.js';
import { ceoSalaryMonthly } from './CeoEconomics.js';
import { isPublicCompany } from './IPO.js';
import bundledExecNames from '../data/exec-names.json' with { type: 'json' };
import {
  COO_ANNUAL_REVIEW_MONTHS,
  COO_MARKET_RAISE_PCT,
  defaultCooSalaryForTier,
  garageCooSalaryFromEquity
} from './Coo.js';

/** Cash-only leadership roles (no cap table grants). */
export const EXECUTIVE_ROLES = ['CFO', 'CTO', 'CMO', 'CRO'];

/** Base cash comp vs COO tier table (pre-IPO public floor). */
export const EXEC_SALARY_VS_COO = 0.82;

/** Post-IPO minimum vs CEO salary (COO uses 60%). */
export const EXEC_PUBLIC_CEO_FLOOR_PCT = 0.42;

const GARAGE_REFERENCE_EQUITY_PCT = 5;

function workspaceTierKey(state) {
  return state.workspace?.tier ?? 'garage';
}

function pickBio() {
  const snippets = bundledExecNames.bioSnippets ?? [];
  const companies = bundledExecNames.formerCompanies ?? [];
  const snippet = snippets[Math.floor(Math.random() * snippets.length)] ?? 'Operator who scales teams.';
  const former = companies[Math.floor(Math.random() * companies.length)] ?? 'a growth-stage startup';
  return `${snippet} Previously at ${former}.`;
}

function createExecSlot() {
  return {
    hired: false,
    firstName: null,
    lastName: null,
    salaryMonthly: null,
    bio: null,
    hiredTurn: null,
    hiredYear: null,
    hiredMonth: null,
    lastSalaryReviewYear: null,
    lastSalaryReviewMonth: null
  };
}

export function createInitialExecutiveTeamState() {
  return Object.fromEntries(EXECUTIVE_ROLES.map((role) => [role, createExecSlot()]));
}

export function executiveTeamState(state) {
  if (!state.executiveTeam) state.executiveTeam = createInitialExecutiveTeamState();
  return state.executiveTeam;
}

export function execDisplayName(state, role) {
  const slot = executiveTeamState(state)[role];
  if (!slot?.hired) return null;
  const first = String(slot.firstName ?? '').trim();
  const last = String(slot.lastName ?? '').trim();
  if (!first && !last) return role;
  return last ? `${first} ${last}` : first;
}

export function isExecutiveHired(state, role) {
  return Boolean(executiveTeamState(state)[role]?.hired);
}

export function defaultExecSalaryForTier(tier) {
  if (tier === 'garage') {
    return Math.round(garageCooSalaryFromEquity(GARAGE_REFERENCE_EQUITY_PCT) * EXEC_SALARY_VS_COO);
  }
  return Math.round(defaultCooSalaryForTier(tier) * EXEC_SALARY_VS_COO);
}

function execBaseSalaryMonthly(state, role) {
  const slot = executiveTeamState(state)[role];
  if (!slot?.hired) return 0;
  const tier = workspaceTierKey(state);
  if (tier === 'garage') {
    const stored = slot.salaryMonthly;
    if (typeof stored === 'number' && stored >= 0) return stored;
    return defaultExecSalaryForTier('garage');
  }
  const stored = slot.salaryMonthly;
  if (typeof stored === 'number' && stored >= 0) return stored;
  return defaultExecSalaryForTier(tier);
}

export function execSalaryMonthly(state, role) {
  if (!isExecutiveHired(state, role)) return 0;
  let pay = execBaseSalaryMonthly(state, role);
  if (isPublicCompany(state) || state.flags?.ipoFiled) {
    const ceoMo = ceoSalaryMonthly(state);
    const publicFloor = Math.round(ceoMo * EXEC_PUBLIC_CEO_FLOOR_PCT);
    if (publicFloor > pay) pay = publicFloor;
  }
  return pay;
}

export function executiveTeamSalaryMonthly(state) {
  return EXECUTIVE_ROLES.reduce((sum, role) => sum + execSalaryMonthly(state, role), 0);
}

export function canHireExecutive(state, role) {
  if (!EXECUTIVE_ROLES.includes(role)) return { ok: false, reason: 'Unknown executive role.' };
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  if (isExecutiveHired(state, role)) return { ok: false, reason: `You already have a ${role}.` };
  return { ok: true };
}

export function hireExecutive(state, role, options) {
  const gate = canHireExecutive(state, role);
  if (!gate.ok) return gate;

  const firstName = String(options?.firstName ?? '').trim().slice(0, 40);
  const lastName = String(options?.lastName ?? '').trim().slice(0, 40);
  if (!firstName) {
    return { ok: false, reason: `Enter a first name for your ${role}.` };
  }

  const tier = workspaceTierKey(state);
  const salaryMonthly = defaultExecSalaryForTier(tier);
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  const team = executiveTeamState(state);
  team[role] = team[role] ?? createExecSlot();
  const slot = team[role];
  slot.hired = true;
  slot.firstName = firstName;
  slot.lastName = lastName;
  slot.salaryMonthly = salaryMonthly;
  slot.bio = options?.bio?.trim() || pickBio();
  slot.hiredTurn = calendarTurn(state);
  slot.hiredYear = state.calendar?.year;
  slot.hiredMonth = state.calendar?.monthIndex;
  slot.lastSalaryReviewYear = state.calendar?.year;
  slot.lastSalaryReviewMonth = state.calendar?.monthIndex;

  return {
    ok: true,
    role,
    name: fullName,
    salaryMonthly,
    summary: `Hired ${fullName} as ${role} — ${formatMoney(salaryMonthly)}/mo cash (no equity grant; outside headcount cap).`
  };
}

export function releaseExecutive(state, role) {
  if (!isExecutiveHired(state, role)) return { ok: false, reason: `No active ${role}.` };
  const name = execDisplayName(state, role) ?? role;
  const slot = executiveTeamState(state)[role];
  slot.hired = false;
  slot.salaryMonthly = 0;
  return {
    ok: true,
    summary: `${name} stepped down as ${role} — salary stops (no equity was granted).`
  };
}

export function syncExecutiveSalariesToWorkspace(state) {
  const tier = workspaceTierKey(state);
  const floor = defaultExecSalaryForTier(tier);
  for (const role of EXECUTIVE_ROLES) {
    if (!isExecutiveHired(state, role)) continue;
    const slot = executiveTeamState(state)[role];
    const prior = slot.salaryMonthly ?? 0;
    slot.salaryMonthly = Math.max(prior, floor);
  }
}

export function tickExecutiveCompensationReview(state) {
  const tier = workspaceTierKey(state);
  if (tier === 'garage') return [];
  const year = state.calendar?.year ?? 0;
  const month = state.calendar?.monthIndex ?? 0;
  const lines = [];
  for (const role of EXECUTIVE_ROLES) {
    if (!isExecutiveHired(state, role)) continue;
    const slot = executiveTeamState(state)[role];
    if (slot.lastSalaryReviewYear == null) {
      slot.lastSalaryReviewYear = slot.hiredYear ?? year;
      slot.lastSalaryReviewMonth = slot.hiredMonth ?? month;
      continue;
    }
    const elapsed =
      (year - slot.lastSalaryReviewYear) * 12 + (month - slot.lastSalaryReviewMonth);
    if (elapsed < COO_ANNUAL_REVIEW_MONTHS) continue;
    const prior = slot.salaryMonthly ?? defaultExecSalaryForTier(tier);
    const bandFloor = defaultExecSalaryForTier(tier);
    const raised = Math.max(bandFloor, Math.round(prior * (1 + COO_MARKET_RAISE_PCT)));
    slot.salaryMonthly = raised;
    slot.lastSalaryReviewYear = year;
    slot.lastSalaryReviewMonth = month;
    lines.push(
      `${role} compensation review — base cash comp ${formatMoney(raised)}/mo (public companies also track ≥${Math.round(EXEC_PUBLIC_CEO_FLOOR_PCT * 100)}% of CEO salary).`
    );
  }
  return lines;
}

function roleSlug(role) {
  return role.toLowerCase();
}

export function mountExecutiveTeamOrgChart(state, disabledAttr = '') {
  const mount = document.getElementById('executive-team-mount');
  if (!mount) return;
  mount.innerHTML = `<div class="org-connector org-connector-branch" aria-hidden="true"></div>${renderExecutiveTeamBlocks(state, disabledAttr)}`;
}

export function renderExecutiveTeamBlocks(state, disabled) {
  const tier = workspaceTierKey(state);
  const tierNote =
    tier === 'garage'
      ? ' Cash comp only — no equity grants (unlike your COO).'
      : ` Cash comp tracks workspace tier (~${Math.round(EXEC_SALARY_VS_COO * 100)}% of COO band).`;
  const blocks = EXECUTIVE_ROLES.map((role) => {
    if (isExecutiveHired(state, role)) {
      const name = execDisplayName(state, role);
      const sal = execSalaryMonthly(state, role);
      return `<div class="org-node org-node-exec org-node-exec-secondary">
        <span class="org-role">${escapeHtml(role)}</span>
        <strong>${escapeHtml(name)}</strong>
        <p class="fine-print">${escapeHtml(executiveTeamState(state)[role]?.bio ?? '')}</p>
        <p class="fine-print">${formatMoney(sal)}/mo · no equity · not in headcount cap</p>
        <button type="button" class="btn btn-ghost btn-small" id="btn-release-exec-${roleSlug(role)}" data-exec-role="${escapeHtml(role)}" ${disabled}>Release ${escapeHtml(role)}</button>
      </div>`;
    }
    const slug = roleSlug(role);
    return `<div class="org-node org-node-open exec-hire-panel" data-exec-role="${escapeHtml(role)}">
      <span class="org-role">${escapeHtml(role)} · open seat</span>
      <p class="fine-print">Hire a ${escapeHtml(role)} for cash comp only.${tierNote}</p>
      <div class="name-row exec-name-row">
        <label class="visually-hidden" for="exec-${slug}-first-name">${escapeHtml(role)} first name</label>
        <input id="exec-${slug}-first-name" type="text" maxlength="40" placeholder="First name" ${disabled} required data-exec-role="${escapeHtml(role)}">
        <label class="visually-hidden" for="exec-${slug}-last-name">${escapeHtml(role)} last name</label>
        <input id="exec-${slug}-last-name" type="text" maxlength="40" placeholder="Last name" ${disabled} data-exec-role="${escapeHtml(role)}">
      </div>
      <p class="fine-print">≈ ${formatMoney(defaultExecSalaryForTier(tier))}/mo at ${escapeHtml(tier)} workspace</p>
      <button type="button" class="btn btn-primary btn-small" id="btn-hire-exec-${slug}" data-exec-role="${escapeHtml(role)}" ${disabled}>Hire ${escapeHtml(role)}</button>
    </div>`;
  });
  return `<div class="org-chart-executives">${blocks.join('')}</div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

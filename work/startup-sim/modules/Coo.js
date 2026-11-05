import { formatMoney } from './constants.js';
import { grantExecutiveEquity } from './CapTable.js';
import { calendarTurn } from './GameCalendar.js';
import bundledExecNames from '../data/exec-names.json' with { type: 'json' };

const COO_SALARY_BY_TIER = {
  garage: 7_500,
  small: 11_000,
  medium: 14_000,
  large: 16_500,
  campus: 18_000,
  hub: 21_000
};

function workspaceTierKey(state) {
  return state.workspace?.tier ?? 'garage';
}

export const COO_EQUITY_OPTIONS = [0.5, 1, 1.5, 2, 3, 5];

export function createInitialCooState() {
  return {
    hired: false,
    firstName: null,
    lastName: null,
    equityPct: null,
    salaryMonthly: null,
    capTableId: null,
    bio: null,
    hiredTurn: null,
    hiredYear: null,
    hiredMonth: null
  };
}

export function cooDisplayName(state) {
  const c = state.coo;
  if (!c?.hired) return null;
  const first = String(c.firstName ?? '').trim();
  const last = String(c.lastName ?? '').trim();
  if (!first && !last) return 'COO';
  return last ? `${first} ${last}` : first;
}

export function isCooHired(state) {
  return Boolean(state.coo?.hired);
}

export function cooSalaryMonthly(state) {
  if (!isCooHired(state)) return 0;
  const stored = state.coo?.salaryMonthly;
  if (stored > 0) return stored;
  return defaultCooSalaryForTier(workspaceTierKey(state));
}

export function defaultCooSalaryForTier(tier) {
  return COO_SALARY_BY_TIER[tier] ?? COO_SALARY_BY_TIER.garage;
}

export function canHireCoo(state) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  if (isCooHired(state)) return { ok: false, reason: 'You already have a COO.' };
  return { ok: true };
}

function pickBio() {
  const snippets = bundledExecNames.bioSnippets ?? [];
  const companies = bundledExecNames.formerCompanies ?? [];
  const snippet = snippets[Math.floor(Math.random() * snippets.length)] ?? 'Operator who scales teams.';
  const former = companies[Math.floor(Math.random() * companies.length)] ?? 'a growth-stage startup';
  return `${snippet} Previously at ${former}.`;
}

function parseEquityPct(raw) {
  const n = Number(raw);
  if (!COO_EQUITY_OPTIONS.includes(n)) return null;
  return n;
}

export function hireCoo(state, options) {
  const gate = canHireCoo(state);
  if (!gate.ok) return gate;

  const firstName = String(options?.firstName ?? '').trim().slice(0, 40);
  const lastName = String(options?.lastName ?? '').trim().slice(0, 40);
  if (!firstName) {
    return { ok: false, reason: 'Enter a first name for your COO.' };
  }

  const equityPct = parseEquityPct(options?.equityPct);
  if (equityPct == null) {
    return { ok: false, reason: 'Pick an equity grant (0.5%–5%).' };
  }

  const tier = workspaceTierKey(state);
  const salaryMonthly = defaultCooSalaryForTier(tier);
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  const capTableId = `coo-${Date.now()}`;

  grantExecutiveEquity(state, {
    id: capTableId,
    name: `${fullName} (COO)`,
    pct: equityPct,
    holderClass: 'exec'
  });

  state.coo = state.coo ?? createInitialCooState();
  state.coo.hired = true;
  state.coo.firstName = firstName;
  state.coo.lastName = lastName;
  state.coo.equityPct = equityPct;
  state.coo.salaryMonthly = salaryMonthly;
  state.coo.capTableId = capTableId;
  state.coo.bio = options?.bio?.trim() || pickBio();
  state.coo.hiredTurn = calendarTurn(state);
  state.coo.hiredYear = state.calendar?.year;
  state.coo.hiredMonth = state.calendar?.monthIndex;

  return {
    ok: true,
    name: fullName,
    equityPct,
    salaryMonthly,
    summary: `Hired ${fullName} as COO — ${equityPct}% equity, ${formatMoney(salaryMonthly)}/mo (outside headcount cap).`
  };
}

export function releaseCoo(state) {
  if (!isCooHired(state)) return { ok: false, reason: 'No active COO.' };
  const name = cooDisplayName(state) ?? 'COO';
  state.coo.hired = false;
  state.coo.salaryMonthly = 0;
  return {
    ok: true,
    summary: `${name} stepped down — equity stays on the cap table; salary stops.`
  };
}

export function syncCooSalaryToWorkspace(state) {
  if (!isCooHired(state)) return;
  state.coo.salaryMonthly = defaultCooSalaryForTier(workspaceTierKey(state));
}

export function renderLeadershipOrgChart(container, state) {
  if (!container) return;
  const ceoName = [state.company?.ceoFirstName, state.company?.ceoLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const ceoLabel = ceoName || state.company?.name || 'CEO';
  const disabled = state.flags?.gameOver ? 'disabled' : '';

  let cooBlock = '';
  if (isCooHired(state)) {
    const name = cooDisplayName(state);
    const sal = cooSalaryMonthly(state);
    const pct = state.coo?.equityPct ?? 0;
    cooBlock = `<div class="org-node org-node-exec">
      <span class="org-role">COO</span>
      <strong>${escapeHtml(name)}</strong>
      <p class="fine-print">${escapeHtml(state.coo?.bio ?? '')}</p>
      <p class="fine-print">${formatMoney(sal)}/mo · ${pct}% equity · not in headcount cap</p>
      <button type="button" class="btn btn-ghost btn-small" id="btn-release-coo" ${disabled}>Release COO</button>
    </div>`;
  } else {
    const equityOptions = COO_EQUITY_OPTIONS.map(
      (p) => `<option value="${p}">${p}%</option>`
    ).join('');
    const tier = workspaceTierKey(state);
    const previewSal = defaultCooSalaryForTier(tier);
    cooBlock = `<div class="org-node org-node-open coo-hire-panel">
      <span class="org-role">COO · open seat</span>
      <p class="fine-print">Hire from the garage — name them yourself and grant equity from the cap table.</p>
      <div class="name-row coo-name-row">
        <label class="visually-hidden" for="coo-first-name">COO first name</label>
        <input id="coo-first-name" type="text" maxlength="40" placeholder="First name" ${disabled} required>
        <label class="visually-hidden" for="coo-last-name">COO last name</label>
        <input id="coo-last-name" type="text" maxlength="40" placeholder="Last name" ${disabled}>
      </div>
      <div class="name-row coo-equity-row">
        <label for="coo-equity-pct">Equity grant</label>
        <select id="coo-equity-pct" ${disabled}>${equityOptions}</select>
        <span class="fine-print">≈ ${formatMoney(previewSal)}/mo at ${tier} workspace</span>
      </div>
      <button type="button" class="btn btn-primary btn-small" id="btn-hire-coo" ${disabled}>Hire COO</button>
    </div>`;
  }

  container.innerHTML = `
    <h3 class="log-head">Leadership</h3>
    <div class="org-chart">
      <div class="org-node org-node-ceo"><span class="org-role">CEO</span><strong>${escapeHtml(ceoLabel)}</strong></div>
      <div class="org-connector" aria-hidden="true"></div>
      ${cooBlock}
    </div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

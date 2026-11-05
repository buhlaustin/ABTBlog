import { formatMoney } from './constants.js';
import { grantExecutiveEquity } from './CapTable.js';
import { calendarTurn } from './GameCalendar.js';
import bundledExecNames from '../data/exec-names.json' with { type: 'json' };

/** Cash comp by workspace tier once you leave the garage (garage uses equity tradeoff). */
const COO_SALARY_BY_TIER = {
  small: 11_000,
  medium: 14_000,
  large: 16_500,
  campus: 18_000,
  hub: 21_000
};

const GARAGE_SALARY_AT_MIN_EQUITY = 7_500;
const GARAGE_MIN_EQUITY_PCT = 0.5;
const GARAGE_MID_EQUITY_PCT = 5;
const GARAGE_MID_SALARY = 2_500;
const GARAGE_MAX_EQUITY_PCT = 10;

function workspaceTierKey(state) {
  return state.workspace?.tier ?? 'garage';
}

export const COO_EQUITY_OPTIONS = [0.5, 1, 1.5, 2, 3, 5, 7.5, 10];

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

/** Garage-only: more equity → less cash (10% → $0 like the CEO; 5% → $2.5K/mo). */
export function garageCooSalaryFromEquity(equityPct) {
  const eq = Number(equityPct);
  if (!Number.isFinite(eq) || eq >= GARAGE_MAX_EQUITY_PCT) return 0;
  if (eq >= GARAGE_MID_EQUITY_PCT) {
    return Math.round(GARAGE_MID_SALARY * ((GARAGE_MAX_EQUITY_PCT - eq) / (GARAGE_MAX_EQUITY_PCT - GARAGE_MID_EQUITY_PCT)));
  }
  if (eq <= GARAGE_MIN_EQUITY_PCT) return GARAGE_SALARY_AT_MIN_EQUITY;
  const t = (eq - GARAGE_MIN_EQUITY_PCT) / (GARAGE_MID_EQUITY_PCT - GARAGE_MIN_EQUITY_PCT);
  return Math.round(GARAGE_SALARY_AT_MIN_EQUITY + t * (GARAGE_MID_SALARY - GARAGE_SALARY_AT_MIN_EQUITY));
}

export function cooSalaryMonthly(state) {
  if (!isCooHired(state)) return 0;
  const tier = workspaceTierKey(state);
  if (tier === 'garage') {
    return garageCooSalaryFromEquity(state.coo?.equityPct ?? 0);
  }
  const stored = state.coo?.salaryMonthly;
  if (typeof stored === 'number' && stored >= 0) return stored;
  return defaultCooSalaryForTier(tier);
}

export function previewCooSalaryMonthly(state, equityPct) {
  const tier = workspaceTierKey(state);
  if (tier === 'garage') return garageCooSalaryFromEquity(equityPct);
  return defaultCooSalaryForTier(tier);
}

export function defaultCooSalaryForTier(tier) {
  if (tier === 'garage') return 0;
  return COO_SALARY_BY_TIER[tier] ?? COO_SALARY_BY_TIER.small;
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
    return { ok: false, reason: 'Pick an equity grant (0.5%–10%).' };
  }

  const tier = workspaceTierKey(state);
  const salaryMonthly =
    tier === 'garage' ? garageCooSalaryFromEquity(equityPct) : defaultCooSalaryForTier(tier);
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
  const tier = workspaceTierKey(state);
  state.coo.salaryMonthly =
    tier === 'garage'
      ? garageCooSalaryFromEquity(state.coo?.equityPct ?? 0)
      : defaultCooSalaryForTier(tier);
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
    const tier = workspaceTierKey(state);
    const defaultEquity = COO_EQUITY_OPTIONS[2] ?? 1.5;
    const equityOptions = COO_EQUITY_OPTIONS.map(
      (p) => `<option value="${p}"${p === defaultEquity ? ' selected' : ''}>${p}%</option>`
    ).join('');
    const previewSal = previewCooSalaryMonthly(state, defaultEquity);
    const garageTradeoff =
      tier === 'garage'
        ? ' In the garage, cash comp trades off for equity — <strong>10%</strong> is <strong>$0/mo</strong> (like you); <strong>5%</strong> is <strong>$2.5K/mo</strong>.'
        : '';
    cooBlock = `<div class="org-node org-node-open coo-hire-panel">
      <span class="org-role">COO · open seat</span>
      <p class="fine-print">Hire from the garage — name them yourself and grant up to 10% from the cap table.${garageTradeoff}</p>
      <div class="name-row coo-name-row">
        <label class="visually-hidden" for="coo-first-name">COO first name</label>
        <input id="coo-first-name" type="text" maxlength="40" placeholder="First name" ${disabled} required>
        <label class="visually-hidden" for="coo-last-name">COO last name</label>
        <input id="coo-last-name" type="text" maxlength="40" placeholder="Last name" ${disabled}>
      </div>
      <div class="name-row coo-equity-row">
        <label for="coo-equity-pct">Equity grant</label>
        <select id="coo-equity-pct" data-workspace-tier="${escapeHtml(tier)}" ${disabled}>${equityOptions}</select>
        <span class="fine-print" id="coo-salary-preview">≈ ${formatMoney(previewSal)}/mo${tier === 'garage' ? ' at this equity grant' : ` at ${tier} workspace`}</span>
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

import { STAGES, formatMoney } from './constants.js';
import {
  headcountCap,
  getWorkspaceTier,
  WORKSPACE_TIER,
  workspaceRentMonthly,
  salaryTierMult
} from './Workspace.js';
import { setGameFeedback } from './GameFeedback.js';

export const DEPARTMENTS = [
  { id: 'engineering', label: 'Engineering' },
  { id: 'product', label: 'Product' },
  { id: 'sales', label: 'Sales' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'finance', label: 'Finance / G&A' },
  { id: 'support', label: 'Support', unlockStage: STAGES.OFFICE }
];

const DEFAULT_SALARY = {
  engineering: 9500,
  product: 8500,
  sales: 7000,
  marketing: 6500,
  finance: 7500,
  support: 5500
};

export function emptyHeadcount() {
  return Object.fromEntries(DEPARTMENTS.map((d) => [d.id, 0]));
}

export function createInitialStaff() {
  const headcountByDept = emptyHeadcount();
  return {
    headcountByDept: { ...headcountByDept },
    draftHeadcountByDept: { ...headcountByDept },
    lastFinalizedMonth: null,
    lastFinalizedYear: null,
    payrollMonthly: 0
  };
}

export function syncDraftFromFinalized(state) {
  const finalized = state.staff.headcountByDept ?? emptyHeadcount();
  state.staff.draftHeadcountByDept = { ...finalized };
}

export function maxHeadcountForStage(_stage, state = null) {
  if (!state) return 0;
  return headcountCap(state);
}

export function salaryForDept(deptId, _stage, state = null) {
  const base = DEFAULT_SALARY[deptId] ?? 6000;
  if (!state) return base;
  const tier = getWorkspaceTier(state);
  if (tier === WORKSPACE_TIER.GARAGE) return 0;
  return Math.round(base * salaryTierMult(state));
}

export function computePayroll(headcount, stage, state = null) {
  let total = 0;
  for (const dept of DEPARTMENTS) {
    const n = headcount[dept.id] ?? 0;
    total += n * salaryForDept(dept.id, stage, state);
  }
  return total;
}

export function totalHeadcount(headcount) {
  return Object.values(headcount ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function visibleDepartments(stage, state = null) {
  if (state && getWorkspaceTier(state) === WORKSPACE_TIER.GARAGE) return [];
  return DEPARTMENTS.filter((d) => !(d.unlockStage && stage === STAGES.GARAGE));
}

export function hiringAllowed(state) {
  return getWorkspaceTier(state) !== WORKSPACE_TIER.GARAGE;
}

export function adjustDraftHeadcount(state, deptId, delta) {
  if (!hiringAllowed(state)) {
    return { ok: false, reason: 'Lease a small office ($10k ARR) before hiring.' };
  }
  if (!state.staff?.draftHeadcountByDept) return { ok: false, reason: 'People tab is out of sync — switch tabs and try again.' };
  const draft = state.staff.draftHeadcountByDept;
  const current = draft[deptId] ?? 0;
  const next = Math.max(0, current + delta);
  const max = maxHeadcountForStage(state.stage, state);

  const otherTotal = totalHeadcount(draft) - current;
  if (otherTotal + next > max) {
    return { ok: false, reason: `Headcount cap for this stage is ${max}.` };
  }

  draft[deptId] = next;
  return { ok: true };
}

export function setDraftHeadcount(state, deptId, value) {
  if (!hiringAllowed(state)) {
    return { ok: false, reason: 'Lease a small office ($10k ARR) before hiring.' };
  }
  const n = Math.max(0, Math.floor(Number(value) || 0));
  const draft = { ...state.staff.draftHeadcountByDept, [deptId]: 0 };
  const max = maxHeadcountForStage(state.stage, state);
  const otherTotal = totalHeadcount(draft) - (draft[deptId] ?? 0);
  if (otherTotal + n > max) {
    return { ok: false, reason: `Headcount cap for this stage is ${max}.` };
  }
  state.staff.draftHeadcountByDept[deptId] = n;
  return { ok: true };
}

function finalizedHeadcount(state) {
  return state.staff?.headcountByDept ?? emptyHeadcount();
}

/** Legacy aggregate — prefer taskOutcomeMultipliers for desk tasks. */
export function staffRevenueMultiplier(state) {
  const hc = finalizedHeadcount(state);
  const m =
    (hc.marketing ?? 0) * 0.028 +
    (hc.sales ?? 0) * 0.038 +
    (hc.engineering ?? 0) * 0.022 +
    (hc.product ?? 0) * 0.018;
  return 1 + Math.min(0.45, m);
}

/** How much headcount capacity affects a deal-sized task (prevents solo $400k mega deals). */
export function headcountExecutionScale(state, taskDef) {
  const total = totalHeadcount(finalizedHeadcount(state));
  const types = taskDef?.types ?? [];
  const isDeal = types.includes('sales') || (taskDef?.revenue?.[1] ?? 0) >= 50_000;
  const target = isDeal ? 10 : 6;
  const scale = 0.22 + 0.78 * Math.min(1, Math.sqrt(total / target));
  return Math.max(0.2, Math.round(scale * 1000) / 1000);
}

/** Department mix for a task roll. */
export function departmentTaskMultiplier(state, taskDef) {
  const hc = finalizedHeadcount(state);
  const types = new Set(taskDef?.types ?? []);
  let bonus = 0;
  if (types.has('sales')) bonus += (hc.sales ?? 0) * 0.05;
  if (types.has('marketing') || types.has('growth')) bonus += (hc.marketing ?? 0) * 0.04;
  if (types.has('product')) bonus += (hc.product ?? 0) * 0.035 + (hc.engineering ?? 0) * 0.025;
  if (types.has('research')) bonus += (hc.product ?? 0) * 0.02;
  bonus += (hc.engineering ?? 0) * 0.015;
  return 1 + Math.min(0.55, bonus);
}

/** Finance team trims task spend; support stabilizes MRR tasks slightly. */
export function staffCostMultiplier(state) {
  const hc = finalizedHeadcount(state);
  const financeCut = Math.min(0.12, (hc.finance ?? 0) * 0.015);
  return Math.max(0.82, 1 - financeCut);
}

export function staffRetentionBonus(state, taskDef) {
  const hc = finalizedHeadcount(state);
  const types = taskDef?.types ?? [];
  if (!types.includes('support') && !types.includes('success')) return 1;
  return 1 + Math.min(0.2, (hc.support ?? 0) * 0.025);
}

export function projectStaffEconomics(state) {
  const draft = state.staff?.draftHeadcountByDept ?? emptyHeadcount();
  const payroll = computePayroll(draft, state.stage, state);
  const fixed = workspaceRentMonthly(state);
  const burn = payroll + fixed;
  const revenue =
    (state.calendar?.monthRevenue ?? 0) > 0
      ? state.calendar.monthRevenue
      : state.finance?.monthlyRevenue ?? 0;
  const surplus = revenue - burn;
  return { payroll, burn, revenue, surplus, fixed };
}

export function finalizeStaffing(state) {
  const prior = { ...state.staff.headcountByDept };
  const draft = state.staff.draftHeadcountByDept ?? emptyHeadcount();
  const max = maxHeadcountForStage(state.stage, state);
  const total = totalHeadcount(draft);
  if (total > max) {
    return { ok: false, reason: `Headcount cap is ${max}.` };
  }

  state.staff.headcountByDept = { ...draft };
  state.staff.payrollMonthly = computePayroll(state.staff.headcountByDept, state.stage, state);
  state.staff.lastFinalizedMonth = state.calendar.monthIndex;
  state.staff.lastFinalizedYear = state.calendar.year;

  const priorTotal = totalHeadcount(prior);
  let layoffPct = 0;
  if (priorTotal > 0 && total < priorTotal) {
    layoffPct = (priorTotal - total) / priorTotal;
  }

  const cut = priorTotal - total;
  const significantLayoff =
    cut > 0 &&
    ((priorTotal >= 5 && (cut >= 3 || layoffPct >= 0.25)) ||
      (priorTotal >= 10 && layoffPct >= 0.15));

  return {
    ok: true,
    layoffPct,
    priorTotal,
    newTotal: total,
    significantLayoff
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderPeoplePanel(container, state) {
  if (!container) return;
  const econ = projectStaffEconomics(state);
  const maxHc = maxHeadcountForStage(state.stage, state);
  const totalDraft = totalHeadcount(state.staff.draftHeadcountByDept);
  const totalFinal = totalHeadcount(state.staff.headcountByDept);
  const finalizedLabel =
    state.staff.lastFinalizedMonth != null
      ? `Y${state.staff.lastFinalizedYear} M${state.staff.lastFinalizedMonth}`
      : 'never';

  const orgMount = hiringAllowed(state)
    ? ''
    : '<p class="desk-feedback">You’re in the garage — no employees yet. Hit Finance to lease a small office at $10k ARR.</p>';

  const rows = visibleDepartments(state.stage, state)
    .map((dept) => {
      const n = state.staff.draftHeadcountByDept[dept.id] ?? 0;
      const sub = n * salaryForDept(dept.id, state.stage, state);
      return `<tr>
        <td>${escapeHtml(dept.label)}</td>
        <td class="num headcount-cell">
          <button type="button" class="btn-step" data-staff-delta="${dept.id}" data-delta="-1" aria-label="Decrease">−</button>
          <input type="number" min="0" class="headcount-input" data-staff-input="${dept.id}" value="${n}">
          <button type="button" class="btn-step" data-staff-delta="${dept.id}" data-delta="1" aria-label="Increase">+</button>
        </td>
        <td class="num">${formatMoney(salaryForDept(dept.id, state.stage, state))}</td>
        <td class="num">${formatMoney(sub)}</td>
      </tr>`;
    })
    .join('');

  container.innerHTML = `
    ${orgMount}
    <div id="org-chart-mount"></div>
    <p class="panel-lede">Adjust draft headcount, preview burn vs last month revenue, then <strong>Finalize staffing</strong>. You stay CEO — no separate exec hires.</p>
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Department</th><th>Headcount</th><th>$/head/mo</th><th>Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="summary-grid">
      <div><span class="stat-label">Draft / cap</span><span class="stat-value">${totalDraft} / ${maxHc}</span></div>
      <div><span class="stat-label">Finalized (active)</span><span class="stat-value">${totalFinal}</span></div>
      <div><span class="stat-label">Payroll (draft)</span><span class="stat-value">${formatMoney(econ.payroll)}</span></div>
      <div><span class="stat-label">Proj. burn</span><span class="stat-value">${formatMoney(econ.burn)}</span></div>
      <div><span class="stat-label">vs last mo. rev.</span><span class="stat-value ${econ.surplus >= 0 ? 'positive' : 'negative'}">${formatMoney(econ.surplus)}</span></div>
      <div><span class="stat-label">Last finalized</span><span class="stat-value">${finalizedLabel}</span></div>
    </div>
    <button type="button" class="btn btn-primary" id="btn-finalize-staff" ${hiringAllowed(state) ? '' : 'disabled'}>Finalize staffing</button>
    <p id="people-feedback" class="desk-feedback" hidden></p>
  `;
  renderCeoOnlyChart(document.getElementById('org-chart-mount'), state);
}

function renderCeoOnlyChart(container, state) {
  if (!container) return;
  const ceoName = [state.company?.ceoFirstName, state.company?.ceoLastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  const ceoLabel = ceoName || state.company?.name || 'CEO';
  container.innerHTML = `
    <h3 class="log-head">Leadership</h3>
    <div class="org-chart">
      <div class="org-node org-node-ceo"><span class="org-role">CEO</span><strong>${escapeHtml(ceoLabel)}</strong></div>
    </div>
  `;
}

export function showPeopleFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}

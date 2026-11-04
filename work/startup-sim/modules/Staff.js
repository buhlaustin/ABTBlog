import { STAGES, formatMoney, fixedCostsForStage } from './constants.js';
import { totalHeadcountCap } from './Offices.js';

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

export function maxHeadcountForStage(stage, state = null) {
  if (state) return totalHeadcountCap(state);
  if (stage === STAGES.GARAGE) return 2;
  if (stage === STAGES.OFFICE) return 12;
  if (stage === STAGES.XC || stage === STAGES.POST_XC) return 24;
  return 48;
}

export function salaryForDept(deptId, stage, state = null) {
  const base = DEFAULT_SALARY[deptId] ?? 6000;
  let salary = stage === STAGES.GARAGE ? Math.round(base * 0.85) : base;
  const salMult = state?.offices?.modifiers?.salaryMult ?? 1;
  if (state?.offices?.hubId) salary = Math.round(salary * salMult);
  return salary;
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

export function visibleDepartments(stage) {
  return DEPARTMENTS.filter((d) => !(d.unlockStage && stage === STAGES.GARAGE));
}

export function adjustDraftHeadcount(state, deptId, delta) {
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

/** Revenue boost from finalized headcount (not draft). */
export function staffRevenueMultiplier(state) {
  const hc = state.staff?.headcountByDept ?? emptyHeadcount();
  const m = (hc.marketing ?? 0) * 0.03 + (hc.sales ?? 0) * 0.04 + (hc.engineering ?? 0) * 0.02;
  return 1 + Math.min(0.35, m);
}

export function projectStaffEconomics(state) {
  const draft = state.staff?.draftHeadcountByDept ?? emptyHeadcount();
  const payroll = computePayroll(draft, state.stage, state);
  const fixed =
    typeof state.finance?.fixedCostsMonthly === 'number'
      ? state.finance.fixedCostsMonthly
      : fixedCostsForStage(state.stage);
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

  return {
    ok: true,
    layoffPct,
    significantLayoff: layoffPct >= 0.15
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

  const rows = visibleDepartments(state.stage)
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
    <p class="panel-lede">Adjust draft headcount, preview burn vs last month revenue, then <strong>Finalize staffing</strong>. Month-end payroll uses last finalized counts.</p>
    <table class="data-table">
      <thead><tr><th>Department</th><th>Headcount</th><th>$/head/mo</th><th>Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary-grid">
      <div><span class="stat-label">Draft / cap</span><span class="stat-value">${totalDraft} / ${maxHc}</span></div>
      <div><span class="stat-label">Finalized (active)</span><span class="stat-value">${totalFinal}</span></div>
      <div><span class="stat-label">Payroll (draft)</span><span class="stat-value">${formatMoney(econ.payroll)}</span></div>
      <div><span class="stat-label">Proj. burn</span><span class="stat-value">${formatMoney(econ.burn)}</span></div>
      <div><span class="stat-label">vs last mo. rev.</span><span class="stat-value ${econ.surplus >= 0 ? 'positive' : 'negative'}">${formatMoney(econ.surplus)}</span></div>
      <div><span class="stat-label">Last finalized</span><span class="stat-value">${finalizedLabel}</span></div>
    </div>
    <button type="button" class="btn btn-primary" id="btn-finalize-staff">Finalize staffing</button>
    <p id="people-feedback" class="desk-feedback" hidden></p>
  `;
}

export function showPeopleFeedback(message, isError = false) {
  const el = document.getElementById('people-feedback');
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
  el.classList.toggle('error', isError);
}

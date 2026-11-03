import { STAGES, formatMoney } from './GameState.js';

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
    headcountByDept,
    draftHeadcountByDept: { ...headcountByDept },
    lastFinalizedMonth: null,
    payrollMonthly: 0
  };
}

export function maxHeadcountForStage(stage) {
  if (stage === STAGES.GARAGE) return 2;
  if (stage === STAGES.OFFICE) return 12;
  return 999;
}

export function salaryForDept(deptId, stage) {
  const base = DEFAULT_SALARY[deptId] ?? 6000;
  return stage === STAGES.GARAGE ? Math.round(base * 0.85) : base;
}

export function computePayroll(draftHeadcount, stage) {
  let total = 0;
  for (const dept of DEPARTMENTS) {
    const n = draftHeadcount[dept.id] ?? 0;
    total += n * salaryForDept(dept.id, stage);
  }
  return total;
}

/** Phase 2: finalize + layoff news. Phase 0: preview only. */
export function projectStaffEconomics(state) {
  const draft = state.staff?.draftHeadcountByDept ?? emptyHeadcount();
  const payroll = computePayroll(draft, state.stage);
  const fixed = state.finance?.fixedCostsMonthly ?? 500;
  const burn = payroll + fixed;
  const revenue = state.finance?.monthlyRevenue ?? 0;
  const surplus = revenue - burn;
  return { payroll, burn, revenue, surplus, fixed };
}

export function renderPeoplePanel(container, state) {
  if (!container) return;
  const econ = projectStaffEconomics(state);
  const maxHc = maxHeadcountForStage(state.stage);
  const totalDraft = Object.values(state.staff.draftHeadcountByDept).reduce((a, b) => a + b, 0);

  const rows = DEPARTMENTS.filter(
    (d) => !(d.unlockStage && state.stage === STAGES.GARAGE)
  )
    .map((dept) => {
      const n = state.staff.draftHeadcountByDept[dept.id] ?? 0;
      const sub = n * salaryForDept(dept.id, state.stage);
      return `<tr>
        <td>${dept.label}</td>
        <td class="num">${n}</td>
        <td class="num">${formatMoney(salaryForDept(dept.id, state.stage))}</td>
        <td class="num">${formatMoney(sub)}</td>
      </tr>`;
    })
    .join('');

  container.innerHTML = `
    <p class="panel-lede">Department headcount (Phase 2 enables editing + Finalize staffing).</p>
    <table class="data-table">
      <thead><tr><th>Department</th><th>Headcount</th><th>$/head/mo</th><th>Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="summary-grid">
      <div><span class="stat-label">Draft headcount</span><span class="stat-value">${totalDraft} / ${maxHc}</span></div>
      <div><span class="stat-label">Payroll/mo</span><span class="stat-value">${formatMoney(econ.payroll)}</span></div>
      <div><span class="stat-label">Proj. burn</span><span class="stat-value">${formatMoney(econ.burn)}</span></div>
      <div><span class="stat-label">Surplus/deficit</span><span class="stat-value ${econ.surplus >= 0 ? 'positive' : 'negative'}">${formatMoney(econ.surplus)}</span></div>
    </div>
    <button type="button" class="btn btn-primary" disabled title="Phase 2">Finalize staffing</button>
  `;
}

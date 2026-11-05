import { formatMoney, stageLabel } from './constants.js';
import { companyRunwayDisplay } from './Finance.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import {
  DEPARTMENTS,
  visibleDepartments,
  totalHeadcount,
  maxHeadcountForStage,
  computePayroll,
  salaryForDept,
  hiringAllowed,
  emptyHeadcount,
  projectStaffEconomics
} from './Staff.js';
import { getArr } from './Workspace.js';

const INCREASE_PRIORITY = [
  'engineering',
  'sales',
  'product',
  'marketing',
  'customer-success',
  'support',
  'design',
  'data',
  'partnerships',
  'operations',
  'finance',
  'people',
  'legal',
  'security',
  'research'
];

const DECREASE_PRIORITY = [
  'operations',
  'support',
  'marketing',
  'design',
  'people',
  'finance',
  'legal',
  'data',
  'partnerships',
  'customer-success',
  'product',
  'sales',
  'engineering',
  'security',
  'research'
];

function unlockedDeptIds(state) {
  return visibleDepartments(state.stage, state).map((d) => d.id);
}

function averageUnlockedSalary(state) {
  const ids = unlockedDeptIds(state);
  if (!ids.length) return 7000;
  const sum = ids.reduce((s, id) => s + salaryForDept(id, state.stage, state), 0);
  return Math.max(5500, Math.round(sum / ids.length));
}

export function buildStaffingPlannerContext(state) {
  const draft = { ...(state.staff?.draftHeadcountByDept ?? emptyHeadcount()) };
  const econ = projectStaffEconomics(state);
  const runway = companyRunwayDisplay(state);
  const maxHc = maxHeadcountForStage(state.stage, state);
  const unlocked = visibleDepartments(state.stage, state).map((d) => ({
    id: d.id,
    label: d.label,
    headcount: draft[d.id] ?? 0,
    salaryPerHead: salaryForDept(d.id, state.stage, state)
  }));
  return {
    direction: null,
    company: state.company?.name ?? 'Startup',
    stage: stageLabel(state.stage),
    arr: getArr(state),
    cash: state.finance?.cash ?? 0,
    runwayMonths: runway.burn > 0 ? (runway.cash / runway.burn) : null,
    headcountCap: maxHc,
    draftTotal: totalHeadcount(draft),
    draftPayroll: econ.payroll,
    projectedBurn: econ.burn,
    monthlyRevenue: econ.revenue,
    surplus: econ.surplus,
    departments: unlocked,
    draftHeadcountByDept: draft
  };
}

function clampDraftToCap(state, draft) {
  const maxHc = maxHeadcountForStage(state.stage, state);
  const out = { ...emptyHeadcount(), ...draft };
  for (const id of Object.keys(out)) {
    out[id] = Math.max(0, Math.floor(Number(out[id]) || 0));
  }
  let total = totalHeadcount(out);
  if (total <= maxHc) return { draft: out, total };
  const ids = unlockedDeptIds(state);
  while (total > maxHc) {
    let cut = false;
    for (const id of DECREASE_PRIORITY) {
      if (!ids.includes(id)) continue;
      if ((out[id] ?? 0) > 0) {
        out[id] -= 1;
        total -= 1;
        cut = true;
        if (total <= maxHc) break;
      }
    }
    if (!cut) break;
  }
  return { draft: out, total: totalHeadcount(out) };
}

export function applyStaffingDraftPlan(state, headcountByDept) {
  if (!hiringAllowed(state)) {
    return { ok: false, reason: 'Lease a small office ($10k ARR) before hiring.' };
  }
  if (!state.staff?.draftHeadcountByDept) {
    return { ok: false, reason: 'People tab is out of sync — switch tabs and try again.' };
  }
  const allowed = new Set(unlockedDeptIds(state));
  const next = { ...state.staff.draftHeadcountByDept };
  for (const dept of DEPARTMENTS) {
    if (!allowed.has(dept.id)) continue;
    if (headcountByDept[dept.id] != null) {
      next[dept.id] = Math.max(0, Math.floor(Number(headcountByDept[dept.id]) || 0));
    }
  }
  const { draft, total } = clampDraftToCap(state, next);
  state.staff.draftHeadcountByDept = draft;
  return {
    ok: true,
    newTotal: total,
    payroll: computePayroll(draft, state.stage, state)
  };
}

function distributeAdds(state, draft, slots) {
  const ids = unlockedDeptIds(state);
  const order = INCREASE_PRIORITY.filter((id) => ids.includes(id));
  let left = slots;
  let i = 0;
  while (left > 0 && order.length) {
    const id = order[i % order.length];
    draft[id] = (draft[id] ?? 0) + 1;
    left -= 1;
    i += 1;
  }
}

function distributeCuts(state, draft, slots) {
  const ids = unlockedDeptIds(state);
  const order = DECREASE_PRIORITY.filter((id) => ids.includes(id));
  let left = slots;
  for (const id of order) {
    if (left <= 0) break;
    const have = draft[id] ?? 0;
    if (have <= 0) continue;
    const take = Math.min(have, left);
    draft[id] = have - take;
    left -= take;
  }
}

export function heuristicStaffingPlan(state, direction) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  if (!hiringAllowed(state)) {
    return { ok: false, reason: 'Lease a small office ($10k ARR) before hiring.' };
  }
  const draft = { ...(state.staff?.draftHeadcountByDept ?? emptyHeadcount()) };
  const maxHc = maxHeadcountForStage(state.stage, state);
  const total = totalHeadcount(draft);
  const capRoom = maxHc - total;
  const econ = projectStaffEconomics(state);
  const runway = companyRunwayDisplay(state);
  const runwayMo = runway.burn > 0 ? runway.cash / runway.burn : 99;
  const avgSal = averageUnlockedSalary(state);

  if (direction === 'increase') {
    if (capRoom <= 0) {
      return { ok: false, reason: `At headcount cap (${maxHc}). Open satellites or upgrade HQ on Finance.` };
    }
    let slots = 0;
    if (econ.surplus > avgSal * 0.5) {
      slots = Math.min(capRoom, Math.floor((econ.surplus * 0.85) / avgSal));
    } else if (runwayMo >= 8 && (state.finance?.cash ?? 0) > econ.burn * 4) {
      slots = Math.min(capRoom, Math.max(1, Math.floor(capRoom * 0.08)));
    } else if (runwayMo >= 4 && econ.surplus >= 0) {
      slots = Math.min(capRoom, 1);
    } else {
      return {
        ok: false,
        reason: `Tight runway (${runway.monthsLabel}) or burn exceeds revenue — trim costs or raise cash first.`
      };
    }
    slots = Math.max(1, Math.min(slots, capRoom));
    distributeAdds(state, draft, slots);
    const summary = `Added ${slots} role${slots === 1 ? '' : 's'} within cap (${total} → ${totalHeadcount(draft)}) using ~${formatMoney(econ.surplus)} monthly headroom and ${runway.monthsLabel} runway.`;
    return { ok: true, headcountByDept: draft, summary, source: 'heuristic' };
  }

  if (total <= 0) {
    return { ok: false, reason: 'No department headcount to reduce.' };
  }
  let slots = 1;
  if (econ.surplus < -avgSal * 0.25) {
    slots = Math.min(total - 1, Math.ceil((-econ.surplus * 1.05) / avgSal));
  } else if (runwayMo < 6) {
    slots = Math.min(total - 1, Math.max(1, Math.round(total * 0.12)));
  } else {
    slots = Math.min(total - 1, Math.max(1, Math.round(total * 0.06)));
  }
  slots = Math.max(1, Math.min(slots, total - (total > 1 ? 0 : 1)));
  if (total === 1) slots = 1;
  distributeCuts(state, draft, slots);
  const summary = `Removed ${slots} role${slots === 1 ? '' : 's'} (${total} → ${totalHeadcount(draft)}) to ease ${formatMoney(econ.burn)}/mo burn vs ${formatMoney(econ.revenue)} revenue.`;
  return { ok: true, headcountByDept: draft, summary, source: 'heuristic' };
}

function parseAiStaffingPlan(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const summary = typeof raw.summary === 'string' ? raw.summary.trim().slice(0, 400) : '';
  const hc = raw.headcountByDept ?? raw.headcount ?? raw.draft;
  if (!hc || typeof hc !== 'object') return null;
  const headcountByDept = {};
  for (const [k, v] of Object.entries(hc)) {
    headcountByDept[k] = Math.max(0, Math.floor(Number(v) || 0));
  }
  return { summary: summary || 'AI staffing plan applied.', headcountByDept };
}

async function requestAiStaffingPlan(state, direction) {
  const context = { ...buildStaffingPlannerContext(state), direction };
  const res = await requestNarrative('startup_staffing_plan', context, { timeoutMs: 14_000 });
  if (!res?.headcountByDept && !res?.headcount) return null;
  const parsed = parseAiStaffingPlan(res);
  if (!parsed) return null;
  return { ...parsed, source: 'ai' };
}

function planMovedCorrectly(direction, priorTotal, newTotal) {
  if (direction === 'increase') return newTotal > priorTotal;
  if (direction === 'decrease') return newTotal < priorTotal;
  return false;
}

export async function autoAdjustStaffingHeadcount(state, direction) {
  if (direction !== 'increase' && direction !== 'decrease') {
    return { ok: false, reason: 'Invalid staffing direction.' };
  }

  const priorDraft = { ...(state.staff?.draftHeadcountByDept ?? emptyHeadcount()) };
  const priorTotal = totalHeadcount(priorDraft);

  let plan = null;
  if (shouldUseNarrativeAi()) {
    plan = await requestAiStaffingPlan(state, direction);
  }
  if (!plan?.headcountByDept) {
    plan = heuristicStaffingPlan(state, direction);
  }
  if (plan.ok === false) return plan;
  if (!plan?.headcountByDept) {
    return { ok: false, reason: 'Could not build a staffing plan.' };
  }

  let applied = applyStaffingDraftPlan(state, plan.headcountByDept);
  if (!applied.ok) return applied;

  let newTotal = totalHeadcount(state.staff.draftHeadcountByDept);
  if (!planMovedCorrectly(direction, priorTotal, newTotal)) {
    state.staff.draftHeadcountByDept = { ...priorDraft };
    const fallback = heuristicStaffingPlan(state, direction);
    if (fallback.ok === false) return fallback;
    applied = applyStaffingDraftPlan(state, fallback.headcountByDept);
    if (!applied.ok) return applied;
    plan = fallback;
    newTotal = totalHeadcount(state.staff.draftHeadcountByDept);
  }

  const label = plan.source === 'ai' ? 'AI plan' : 'Auto plan';
  return {
    ok: true,
    summary: plan.summary ? `${label}: ${plan.summary}` : `${label} — ${priorTotal} → ${newTotal} headcount.`,
    source: plan.source ?? 'heuristic',
    newTotal,
    delta: newTotal - priorTotal
  };
}

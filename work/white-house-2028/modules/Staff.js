import { STAFF_ROLES, TUNING } from './Data.js';

export function staffSummary(state) {
  return state.staffRoles ?? [];
}

export function canHireRole(state, roleId) {
  const roles = state.staffRoles ?? [];
  if (roles.length >= TUNING.maxStaffRoles) return { ok: false, reason: `Senior team capped at ${TUNING.maxStaffRoles}.` };
  if (roles.some((r) => r.id === roleId)) return { ok: false, reason: 'Role already filled.' };
  const def = STAFF_ROLES.find((r) => r.id === roleId);
  if (!def) return { ok: false, reason: 'Unknown role.' };
  return { ok: true, def };
}

export function hireRole(state, roleId) {
  const check = canHireRole(state, roleId);
  if (!check.ok) return check;
  const def = check.def;
  state.staffRoles = (state.staffRoles ?? []).concat({ id: def.id, label: def.label });
  recomputePayroll(state);
  state.staff = (state.staff ?? 10) + 6;
  return { ok: true, label: def.label };
}

export function recomputePayroll(state) {
  let burn = TUNING.weeklyPayrollBase + (state.staff ?? 0) * TUNING.payrollPerStaff;
  for (const slot of state.staffRoles ?? []) {
    const def = STAFF_ROLES.find((r) => r.id === slot.id);
    burn += def?.effects?.burn ?? 0;
  }
  state.weeklyBurn = Math.round(burn);
}

export function staffBonuses(state) {
  const bonuses = {
    fundraisingMult: 0,
    gaffeReduce: 0,
    stateVisitBoost: 0,
    petitionBoost: 0,
    debateInsight: 0,
    apBonus: 0,
    organization: 0,
    media: 0
  };
  for (const slot of state.staffRoles ?? []) {
    const def = STAFF_ROLES.find((r) => r.id === slot.id);
    const e = def?.effects ?? {};
    for (const k of Object.keys(bonuses)) {
      if (e[k]) bonuses[k] += e[k];
    }
  }
  return bonuses;
}

import { STAGES, REVENUE_GATES, fixedCostsForStage } from './constants.js';
import { isSandboxSetupCalendarYear } from './GameCalendar.js';
import { applySeedCapTableSnapshot } from './CapTable.js';
import { WORKSPACE_TIER, purchaseWorkspaceTier } from './Workspace.js';

const ATLANTA_HUB = {
  id: 'atlanta',
  label: 'Atlanta',
  costMult: 0.9,
  revenueMult: 1.0,
  salaryMult: 0.92,
  fixedBase: 5000
};

export function parseSandboxTuning(formData, mode) {
  if (mode !== 'sandbox') return null;
  const revenueMult = Number(formData.get('sandboxRevenueMult')) || 1;
  const startingStage = String(formData.get('sandboxStartStage') || 'garage');
  const ipoGateArr = Number(formData.get('sandboxIpoGate')) || REVENUE_GATES.IPO;
  const startYear = Number(formData.get('sandboxStartYear'));
  const startMonth = Number(formData.get('sandboxStartMonth'));
  let calendarStart = null;
  if (isSandboxSetupCalendarYear(startYear) && startMonth >= 1 && startMonth <= 12) {
    calendarStart = { year: startYear, monthIndex: startMonth };
  }
  return {
    revenueMult: Math.max(0.5, Math.min(20, revenueMult)),
    startingStage,
    ipoGateArr: Math.max(500_000, Math.min(REVENUE_GATES.IPO, ipoGateArr)),
    calendarStart
  };
}

export function getEffectiveIpoGate(state) {
  if (state.mode === 'sandbox') {
    const arrGate =
      state.sandboxTuning?.ipoGateArr ?? state.sandboxTuning?.ipoGateRevenue;
    if (arrGate) return arrGate;
  }
  return REVENUE_GATES.IPO;
}

export function getSandboxExtraRevenueMult(state) {
  if (state.mode !== 'sandbox') return 1;
  const m = Number(state.sandboxTuning?.revenueMult);
  return Number.isFinite(m) && m > 0 ? m : 1;
}

/** Apply sandbox-only starting stage (lifetime revenue stays 0). */
export function applySandboxStartingStage(state) {
  if (state.mode !== 'sandbox' || !state.sandboxTuning) return;
  const key = state.sandboxTuning.startingStage;
  if (key === 'office') {
    state.stage = STAGES.OFFICE;
    if (!state.workspace) state.workspace = { tier: WORKSPACE_TIER.GARAGE };
    purchaseWorkspaceTier(state, WORKSPACE_TIER.SMALL);
    return;
  }
  if (key === 'post_xc') {
    state.flags.xcUnlocked = true;
    state.flags.xcAccepted = true;
    state.flags.xcResidencyComplete = true;
    state.flags.seedRoundClosed = true;
    state.flags.xcUnlockedLogged = true;
    state.stage = STAGES.POST_XC;
    state.finance.valuation = 15_000_000;
    state.finance.lastRound = {
      name: 'Seed (sandbox start)',
      raised: 3_000_000,
      preMoney: 12_000_000,
      postMoney: 15_000_000,
      closedMonth: state.calendar?.monthIndex ?? 1,
      closedYear: state.calendar?.year ?? 2026
    };
    const hub = ATLANTA_HUB;
    state.offices.hubId = hub.id;
    state.offices.hubLabel = hub.label;
    state.offices.modifiers = {
      costMult: hub.costMult,
      revenueMult: hub.revenueMult,
      salaryMult: hub.salaryMult
    };
    state.finance.fixedCostsMonthly = hub.fixedBase;
    state.company.location = hub.label;
    applySeedCapTableSnapshot(state);
  }
}

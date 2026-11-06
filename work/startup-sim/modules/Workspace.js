import { STAGES, formatMoney } from './constants.js';
import { meetsHubInvestorGate } from './Sentiment.js';

/** Physical workspace tier (purchased — not auto-upgraded from revenue). */
export const WORKSPACE_TIER = {
  GARAGE: 'garage',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  CAMPUS: 'campus',
  HUB: 'hub'
};

/** Annual recurring revenue gates (USD). */
export const ARR_GATES = {
  SMALL_OFFICE: 10_000,
  XC: 100_000,
  MEDIUM_OFFICE: 250_000,
  LARGE_OFFICE: 2_000_000,
  CAMPUS_HQ: 12_000_000,
  HUB_HQ: 500_000_000
};

const RENT_BY_TIER = {
  [WORKSPACE_TIER.GARAGE]: 500,
  [WORKSPACE_TIER.SMALL]: 2_000,
  [WORKSPACE_TIER.MEDIUM]: 5_000,
  [WORKSPACE_TIER.LARGE]: 12_000,
  [WORKSPACE_TIER.CAMPUS]: 28_000,
  /** Placeholder until a hub city is selected; city `fixedBase` in hubs.json applies. */
  [WORKSPACE_TIER.HUB]: 125_000
};

/** Salary multiplier vs “large office” baseline in Staff.DEFAULT_SALARY. */
const SALARY_TIER_MULT = {
  [WORKSPACE_TIER.GARAGE]: 0,
  [WORKSPACE_TIER.SMALL]: 0.5,
  [WORKSPACE_TIER.MEDIUM]: 0.72,
  [WORKSPACE_TIER.LARGE]: 1,
  [WORKSPACE_TIER.CAMPUS]: 1.08,
  [WORKSPACE_TIER.HUB]: 1.15
};

const TIER_RANK = {
  [WORKSPACE_TIER.GARAGE]: 0,
  [WORKSPACE_TIER.SMALL]: 1,
  [WORKSPACE_TIER.MEDIUM]: 2,
  [WORKSPACE_TIER.LARGE]: 3,
  [WORKSPACE_TIER.CAMPUS]: 4,
  [WORKSPACE_TIER.HUB]: 5
};

export function createInitialWorkspace() {
  return {
    tier: WORKSPACE_TIER.GARAGE,
    smallOfficeOwned: false,
    mediumOfficeOwned: false,
    largeOfficeOwned: false,
    campusOwned: false,
    hubOwned: false
  };
}

export function getArr(state) {
  const mrr = Number(state.finance?.mrr) || 0;
  if (state.finance?.arr != null && state.finance.arr > 0 && mrr === 0) {
    return Number(state.finance.arr) || 0;
  }
  return Math.round(mrr * 12);
}

export function syncArrFromMrr(state) {
  const mrr = Number(state.finance?.mrr) || 0;
  state.finance.arr = Math.round(mrr * 12);
  return state.finance.arr;
}

export function getWorkspaceTier(state) {
  return state.workspace?.tier ?? WORKSPACE_TIER.GARAGE;
}

export function workspaceRentMonthly(state) {
  const tier = getWorkspaceTier(state);
  let rent = RENT_BY_TIER[tier] ?? RENT_BY_TIER[WORKSPACE_TIER.GARAGE];
  if (tier === WORKSPACE_TIER.HUB && state.offices?.hubId) {
    const hubRent = state.finance?.hubRentMonthly;
    if (typeof hubRent === 'number') rent = hubRent;
  }
  return rent;
}

export function applyWorkspaceBurn(state) {
  state.finance.fixedCostsMonthly = workspaceRentMonthly(state);
}

export function salaryTierMult(state) {
  const tier = getWorkspaceTier(state);
  const base = SALARY_TIER_MULT[tier] ?? 1;
  const hubSal = state.offices?.modifiers?.salaryMult ?? 1;
  return tier === WORKSPACE_TIER.HUB ? base * hubSal : base;
}

/** Max employees at the worldwide hub HQ before satellite seat bonuses (career). */
export const HUB_HEADCOUNT_CAP = 5000;

function atActiveHubCity(state) {
  return Boolean(state.offices?.hubId) || getWorkspaceTier(state) === WORKSPACE_TIER.HUB;
}

export function headcountCap(state) {
  if (state?.mode === 'sandbox') return 10_000;
  if (atActiveHubCity(state)) return HUB_HEADCOUNT_CAP;
  const tier = getWorkspaceTier(state);
  if (tier === WORKSPACE_TIER.GARAGE) return 0;
  if (tier === WORKSPACE_TIER.SMALL) return 4;
  if (tier === WORKSPACE_TIER.MEDIUM) return 12;
  if (tier === WORKSPACE_TIER.LARGE) return 24;
  if (tier === WORKSPACE_TIER.CAMPUS) return 100;
  return 0;
}

export function canPurchaseTier(state, tier) {
  const arr = getArr(state);
  const current = getWorkspaceTier(state);
  const curRank = TIER_RANK[current] ?? 0;
  const targetRank = TIER_RANK[tier] ?? 0;
  if (targetRank <= curRank) return { ok: false, reason: 'You already have this space or better.' };

  if (tier === WORKSPACE_TIER.SMALL) {
    if (arr < ARR_GATES.SMALL_OFFICE) {
      return { ok: false, reason: `Reach ${formatMoney(ARR_GATES.SMALL_OFFICE)} ARR first.` };
    }
    return { ok: true };
  }
  if (tier === WORKSPACE_TIER.MEDIUM) {
    if (arr < ARR_GATES.MEDIUM_OFFICE) {
      return { ok: false, reason: `Reach ${formatMoney(ARR_GATES.MEDIUM_OFFICE)} ARR first.` };
    }
    if (!state.workspace?.smallOfficeOwned) {
      return { ok: false, reason: 'Lease a small office first.' };
    }
    return { ok: true };
  }
  if (tier === WORKSPACE_TIER.LARGE) {
    if (arr < ARR_GATES.LARGE_OFFICE) {
      return { ok: false, reason: `Reach ${formatMoney(ARR_GATES.LARGE_OFFICE)} ARR first.` };
    }
    if (!state.workspace?.mediumOfficeOwned) {
      return { ok: false, reason: 'Upgrade to a medium office first.' };
    }
    return { ok: true };
  }
  if (tier === WORKSPACE_TIER.CAMPUS) {
    if (arr < ARR_GATES.CAMPUS_HQ) {
      return { ok: false, reason: `Reach ${formatMoney(ARR_GATES.CAMPUS_HQ)} ARR for a company headquarters.` };
    }
    if (!state.workspace?.largeOfficeOwned) {
      return { ok: false, reason: 'Upgrade to a large office first.' };
    }
    if (!state.flags?.seedRoundClosed) {
      return { ok: false, reason: 'Close seed (or later) before opening headquarters.' };
    }
    return { ok: true };
  }
  if (tier === WORKSPACE_TIER.HUB) {
    if (arr < ARR_GATES.HUB_HQ) {
      return { ok: false, reason: `Reach ${formatMoney(ARR_GATES.HUB_HQ)} ARR to open a worldwide hub city.` };
    }
    if (!meetsHubInvestorGate(state)) {
      return {
        ok: false,
        reason:
          'Close Series A or B, or file an IPO, before a global hub — investors expect a priced round or listing.'
      };
    }
    if (!state.flags?.xcResidencyComplete) {
      return { ok: false, reason: 'Finish the XC batch before a flagship hub.' };
    }
    if (!state.workspace?.campusOwned && !state.workspace?.largeOfficeOwned) {
      return { ok: false, reason: 'Open company HQ or large office before a hub city.' };
    }
    return { ok: true };
  }
  return { ok: false, reason: 'Unknown office tier.' };
}

export function purchaseWorkspaceTier(state, tier) {
  const gate = canPurchaseTier(state, tier);
  if (!gate.ok) return gate;

  if (!state.workspace) state.workspace = createInitialWorkspace();
  state.workspace.tier = tier;
  if (tier === WORKSPACE_TIER.SMALL) state.workspace.smallOfficeOwned = true;
  if (tier === WORKSPACE_TIER.MEDIUM) state.workspace.mediumOfficeOwned = true;
  if (tier === WORKSPACE_TIER.LARGE) state.workspace.largeOfficeOwned = true;
  if (tier === WORKSPACE_TIER.CAMPUS) {
    state.workspace.campusOwned = true;
    state.product.level = (state.product.level ?? 0) + 3;
    state.product.buzz = (state.product.buzz ?? 0) + 4;
    state.company.location = state.company.location || 'Company HQ';
  }
  applyWorkspaceBurn(state);

  if (tier !== WORKSPACE_TIER.GARAGE && tier !== WORKSPACE_TIER.HUB) {
    state.stage = STAGES.OFFICE;
  }
  return { ok: true, tier };
}

/** After XC batch: back to small office footprint (not auto hub). */
export function restorePostXcWorkspace(state) {
  if (!state.workspace) state.workspace = createInitialWorkspace();
  state.workspace.tier = WORKSPACE_TIER.SMALL;
  state.workspace.smallOfficeOwned = true;
  applyWorkspaceBurn(state);
  state.stage = STAGES.OFFICE;
}

export function workspaceLabel(tier) {
  switch (tier) {
    case WORKSPACE_TIER.SMALL:
      return 'Small office';
    case WORKSPACE_TIER.MEDIUM:
      return 'Medium office';
    case WORKSPACE_TIER.LARGE:
      return 'Large office';
    case WORKSPACE_TIER.CAMPUS:
      return 'Company HQ';
    case WORKSPACE_TIER.HUB:
      return 'Worldwide hub city';
    default:
      return 'Garage';
  }
}

/** Stage used for task pools (XC batch = xc-only tasks). */
export function getTaskStage(state) {
  if (state.flags?.ipoFiled) return STAGES.PUBLIC;
  if (state.flags?.xcBatchActive && !state.flags?.xcResidencyComplete) return STAGES.XC;
  if (state.flags?.xcResidencyComplete || state.offices?.hubId) {
    return state.flags?.ipoFiled ? STAGES.PUBLIC : STAGES.POST_XC;
  }
  const tier = getWorkspaceTier(state);
  if (tier === WORKSPACE_TIER.GARAGE) return STAGES.GARAGE;
  return STAGES.OFFICE;
}

export function syncProgressFlagsFromArr(state) {
  const arr = getArr(state);
  if (arr >= ARR_GATES.XC) state.flags.xcUnlocked = true;
  return state;
}

import { POLICIES, STATES, ENDORSEMENTS } from './Data.js';

export function defaultPolicies(party) {
  const out = {};
  for (const p of POLICIES) {
    out[p.id] = p.partyDefault?.[party] ?? 0;
  }
  return out;
}

export function setPoliciesFromSliders(sliders) {
  const out = {};
  for (const p of POLICIES) {
    const v = Number(sliders[p.id]);
    out[p.id] = Number.isFinite(v) ? Math.max(-2, Math.min(2, Math.round(v))) : 0;
  }
  return out;
}

/** How far candidate platform is from a group's ideal (lower = better fit). */
export function alignmentDistance(policies, groupAlign) {
  let d = 0;
  for (const [k, target] of Object.entries(groupAlign ?? {})) {
    d += Math.abs((policies[k] ?? 0) - target) * 2;
  }
  return d;
}

export function coalitionScore(state) {
  const policies = state.candidate.policies ?? {};
  let score = 42;
  for (const id of state.endorsements ?? []) {
    const g = ENDORSEMENTS.find((e) => e.id === id);
    if (!g) continue;
    score += Math.max(0, 8 - alignmentDistance(policies, g.align));
  }
  const party = state.candidate.party;
  if (party === 'I') score -= 6;
  score += Math.min(12, (state.resources?.base ?? 0) / 8);
  return Math.round(Math.max(10, Math.min(88, score)));
}

/** Shift state support from partisan lean vs. candidate party + policy fit. */
export function applyPolicyGeography(state) {
  const party = state.candidate.party;
  const policies = state.candidate.policies ?? {};
  for (const st of STATES) {
    const lean = st.partisanLean ?? 0;
    let partyFit = 0;
    if (party === 'R') partyFit = lean * 0.35;
    if (party === 'D') partyFit = -lean * 0.35;
    if (party === 'I') partyFit = -Math.abs(lean) * 0.15;
    let policyFit = 0;
    if (st.region === 'northeast') policyFit -= (policies.climate ?? 0) * 0.4 + (policies.health ?? 0) * -0.3;
    if (st.region === 'south') policyFit += (policies.security ?? 0) * 0.35 + (policies.immigration ?? 0) * 0.3;
    if (st.region === 'midwest') policyFit -= (policies.economy ?? 0) * 0.25;
    if (st.region === 'west') policyFit -= (policies.climate ?? 0) * 0.3;
    const cur = state.stateSupport[st.id] ?? 45;
    state.stateSupport[st.id] = Math.max(22, Math.min(76, Math.round(cur + partyFit + policyFit)));
  }
}

export function policySpotlightBoost(state, policyId) {
  const p = POLICIES.find((x) => x.id === policyId);
  if (!p) return;
  const val = state.candidate.policies?.[policyId] ?? 0;
  state.resources.momentum = Math.min(30, (state.resources.momentum ?? 0) + 3 + Math.abs(val));
  state.resources.nameRec = Math.min(95, (state.resources.nameRec ?? 0) + 4);
  for (const st of STATES) {
    let bump = 1;
    if (policyId === 'climate' && st.region === 'west') bump = 3;
    if (policyId === 'economy' && st.region === 'midwest') bump = 3;
    if (policyId === 'immigration' && st.region === 'south') bump = 2;
    state.stateSupport[st.id] = Math.min(78, (state.stateSupport[st.id] ?? 45) + bump);
  }
}

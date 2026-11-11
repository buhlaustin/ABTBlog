import { TUNING, STATES, SOCIAL_TOPICS, ENDORSEMENTS, getState } from './Data.js';
import { pushNews } from './GameState.js';
import { hireRole, staffBonuses } from './Staff.js';
import { alignmentDistance, policySpotlightBoost } from './Policies.js';

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function roll(rng, val) {
  if (Array.isArray(val)) return rng.int(val[0], val[1]);
  return val ?? 0;
}

export function applyAction(state, def, picks, rng) {
  const r = state.resources;
  const eff = def.effects ?? {};
  const deltas = { lines: [] };
  const staff = staffBonuses(state);
  const party = state.candidate.party;

  if (eff.cash) {
    let mult = 1 + staff.fundraisingMult;
    if (party === 'I') mult *= TUNING.independentFundraisingMult;
    mult *= 0.85 + state.candidate.stats.fundraising / 130;
    const gained = Math.round(roll(rng, eff.cash) * mult);
    r.cash += gained;
    state.statsRecap.cashRaised += gained;
    deltas.cash = gained;
  }

  for (const key of ['approval', 'buzz', 'base', 'nameRec', 'momentum']) {
    if (eff[key] != null) {
      const v = roll(rng, eff[key]);
      if (key === 'approval') r.approval = clamp(r.approval + v, 12, 72);
      if (key === 'buzz' || key === 'momentum') r.momentum = clamp(r.momentum + Math.round(v / (key === 'buzz' ? 2 : 1)), 0, 30);
      if (key === 'base') r.base = clamp(r.base + v, 10, 88);
      if (key === 'nameRec') r.nameRec = clamp(r.nameRec + v, 5, 96);
      deltas[key] = v;
    }
  }

  if (eff.debateBuff) state.debateBuff = (state.debateBuff ?? 0) + eff.debateBuff;
  if (eff.scandal) r.scandal = clamp((r.scandal ?? 0) + eff.scandal, 0, TUNING.scandalMax);
  if (eff.gaffeReduce) state._gaffeReduce = (state._gaffeReduce ?? 0) + eff.gaffeReduce;
  if (eff.energyRestore) {
    r.energy = clamp(r.energy + eff.energyRestore, 0, TUNING.energyMax);
  } else if (def.id !== 'rest') {
    r.energy = clamp(r.energy - (def.energy ?? 0), 0, TUNING.energyMax);
  }

  const gaffeRisk = (eff.gaffeRisk ?? 0) + (state._gaffeReduce ?? 0) * -1;
  if (gaffeRisk > 0 && rng.chance(gaffeRisk + (r.energy < TUNING.gaffeEnergyThreshold ? 0.1 : 0))) {
    r.approval = clamp(r.approval - rng.int(2, 6), 10, 72);
    r.momentum = clamp(r.momentum - 3, 0, 30);
    r.scandal = clamp((r.scandal ?? 0) + rng.int(6, 12), 0, TUNING.scandalMax);
    pushNews(state, 'Gaffe cycle: a clip is playing on repeat.', { approval: -4, scandal: '+?' });
    state.statsRecap.keyMoments.push(`Week ${state.week}: viral gaffe`);
    deltas.gaffe = true;
  }
  state._gaffeReduce = 0;

  if ((eff.stateBoost || def.requiresStatePick) && picks.stateId) {
    const bump = roll(rng, eff.stateBoost ?? 5) + staff.stateVisitBoost;
    state.stateSupport[picks.stateId] = clamp((state.stateSupport[picks.stateId] ?? 40) + bump, 20, 79);
    deltas.state = `${picks.stateId} +${bump}`;
  }

  if (eff.regionalBoost && picks.region) {
    for (const st of STATES.filter((s) => s.region === picks.region)) {
      state.stateSupport[st.id] = clamp((state.stateSupport[st.id] ?? 40) + roll(rng, eff.regionalBoost), 20, 79);
    }
    deltas.region = picks.region;
  }

  if (eff.petitionProgress && picks.stateId && party === 'I') {
    tickPetition(state, picks.stateId, rng, staff);
    deltas.petition = picks.stateId;
  }

  if (eff.vetReveal && picks.vpId) {
    const vp = state.vpShortlist.find((v) => v.id === picks.vpId);
    if (vp) {
      vp.hiddenRevealed = true;
      pushNews(state, `Vetting memo on ${vp.name}: "${vp.hidden}"`);
    }
  }

  if (eff.rivalDamage) {
    for (const rival of state.rivals) {
      if (rival.alive) rival.approval -= roll(rng, eff.rivalDamage);
    }
  }

  if (eff.hireRole && picks.staffRoleId) {
    const hres = hireRole(state, picks.staffRoleId);
    if (hres.ok) deltas.staff = hres.label;
    else deltas.lines.push(hres.reason);
  }

  if (eff.socialPost && picks.socialTopicId) {
    resolveSocialPost(state, picks, rng);
    deltas.social = picks.socialTopicId;
  }

  if (eff.policySpotlight && picks.policyId) {
    policySpotlightBoost(state, picks.policyId);
    deltas.policy = picks.policyId;
  }

  if (eff.endorsementMeet && picks.endorsementId) {
    resolveEndorsementMeet(state, picks.endorsementId, rng);
    deltas.endorsement = picks.endorsementId;
  }

  return deltas;
}

function tickPetition(state, stateId, rng, staff) {
  if (state.ballotAccess[stateId]) return;
  const mult = TUNING.independentOrgPenalty * (1 - staff.petitionBoost);
  const gain = roll(rng, TUNING.petitionSignaturesPerAction) / mult;
  state.petitionProgress = state.petitionProgress ?? {};
  const cur = state.petitionProgress[stateId] ?? 0;
  const next = cur + gain;
  state.petitionProgress[stateId] = next;
  if (next >= 100 || rng.chance(0.15 + state.candidate.stats.organization / 200)) {
    state.ballotAccess[stateId] = true;
    state.petitionProgress[stateId] = 100;
    pushNews(state, `Ballot access secured: ${getState(stateId)?.name}.`, { ballot: stateId });
  } else {
    pushNews(state, `${getState(stateId)?.name} petitions at ${Math.round(next)}%.`);
  }
}

function resolveSocialPost(state, picks, rng) {
  const topic = SOCIAL_TOPICS.find((t) => t.id === picks.socialTopicId) ?? SOCIAL_TOPICS[0];
  const tone = picks.socialTone ?? 'safe';
  let buzz = topic.baseBuzz;
  let risk = topic.gaffeRisk ?? 0.05;
  if (tone === 'combative') {
    buzz += 6;
    risk += 0.12;
  } else if (tone === 'humor') {
    buzz += rng.int(2, 10);
    risk += 0.1;
  }
  const media = state.candidate.stats.media / 15;
  buzz = Math.round(buzz * (0.8 + media / 20));
  if (partyPenalty(state)) buzz = Math.round(buzz * TUNING.independentMediaPenalty);
  if (rng.chance(risk)) {
    state.resources.approval = clamp(state.resources.approval - rng.int(2, 7), 10, 72);
    state.resources.scandal = clamp((state.resources.scandal ?? 0) + 10, 0, TUNING.scandalMax);
    pushNews(state, `Social backfire on "${topic.label}".`);
  } else {
    state.resources.momentum = clamp((state.resources.momentum ?? 0) + Math.round(buzz / 2), 0, 30);
    state.resources.nameRec = clamp((state.resources.nameRec ?? 0) + Math.min(8, Math.round(buzz / 2)), 5, 96);
    if (buzz > 10) pushNews(state, `Viral moment: "${topic.label}" dominates feeds.`);
  }
}

function partyPenalty(state) {
  return state.candidate.party === 'I';
}

function resolveEndorsementMeet(state, endorsementId, rng) {
  const group = ENDORSEMENTS.find((e) => e.id === endorsementId);
  if (!group) return;
  const dist = alignmentDistance(state.candidate.policies ?? {}, group.align);
  if (dist <= 3 && rng.chance(0.55)) {
    state.endorsements = [...new Set([...(state.endorsements ?? []), group.id])];
    state.resources.base = clamp((state.resources.base ?? 0) + 4, 10, 88);
    state.resources.approval = clamp((state.resources.approval ?? 0) + 2, 12, 72);
    pushNews(state, `${group.label} endorses your campaign.`, { endorsement: group.id });
    state.statsRecap.keyMoments.push(`${group.label} endorsement`);
  } else if (dist > 6) {
    state.resources.approval = clamp((state.resources.approval ?? 0) - 2, 10, 72);
    pushNews(state, `${group.label} meeting leaks — activists unhappy.`);
  } else {
    pushNews(state, `${group.label}: polite hearing, no endorsement yet.`);
  }
}

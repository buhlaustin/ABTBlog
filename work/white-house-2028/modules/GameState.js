import { TUNING, STATES, BACKGROUNDS, getState, battlegroundStates } from './Data.js';
import { defaultPolicies, applyPolicyGeography, coalitionScore } from './Policies.js';
import { buildRunningMatePool, pickVpShortlist } from './RunningMates.js';
import { spawnPartyRivals, spawnGeneralOpponent } from './Rivals.js';
import { recomputePayroll, staffBonuses } from './Staff.js';

export function initialStateSupport(homeStateId, party, policies) {
  const support = {};
  const homeLean = party === 'R' ? 8 : party === 'D' ? 8 : 2;
  for (const st of STATES) {
    const lean = st.partisanLean ?? 0;
    let base = 46 - lean * (party === 'R' ? 0.35 : party === 'D' ? -0.35 : 0.15);
    if (st.id === homeStateId) base += homeLean;
    if (party === 'I') base -= 3;
    support[st.id] = Math.max(26, Math.min(64, Math.round(base)));
  }
  const stub = { candidate: { party, policies: policies ?? defaultPolicies(party) }, stateSupport: support, resources: {} };
  applyPolicyGeography(stub);
  return stub.stateSupport;
}

export function derivePhase(week, party) {
  if (week <= 25) return party === 'I' ? 'independent_primary' : 'primary';
  if (week === 26) return party === 'I' ? 'ballot_check' : 'primary_election';
  if (week >= TUNING.conventionPrepStart && week < TUNING.conventionWeek) return 'convention_prep';
  if (week === TUNING.conventionWeek) return 'convention';
  if (week >= TUNING.generalStart && week < TUNING.electionNightWeek) return 'general';
  if (week === TUNING.electionNightWeek) return 'election_night';
  return 'campaign';
}

export function createNewGame({ name, homeState, backgroundId, party, seed, policies }) {
  const bg = BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
  const runSeed = seed ?? (Date.now() & 0xffffffff);
  const home = getState(homeState)?.id ?? 'OH';
  const pol = policies ?? defaultPolicies(party);
  const stats = {
    organization: 50 + (bg.mods.organization ?? 0),
    fundraising: 50 + (bg.mods.fundraising ?? 0),
    media: 50 + (bg.mods.media ?? 0),
    debate: 50 + (bg.mods.debate ?? 0),
    stamina: 50 + (bg.mods.stamina ?? 0)
  };
  const matePool = buildRunningMatePool(runSeed);
  const oppParty = party === 'R' ? 'D' : party === 'D' ? 'R' : 'R';
  const state = {
    version: 2,
    screen: 'announcement',
    seed: runSeed,
    week: 0,
    candidate: {
      name: name.trim().slice(0, 40) || 'Candidate',
      homeState: home,
      backgroundId: bg.id,
      backgroundLabel: bg.label,
      party,
      stats,
      policies: pol
    },
    resources: {
      cash: party === 'I' ? 620000 : 1250000,
      approval: 44,
      nameRec: 36,
      momentum: 5,
      base: 47,
      energy: 90,
      scandal: 8
    },
    stateSupport: initialStateSupport(home, party, pol),
    staff: party === 'I' ? 8 : 12,
    staffRoles: [],
    weeklyBurn: 0,
    delegates: 0,
    ballotAccess: party === 'I' ? { [home]: true } : {},
    petitionProgress: party === 'I' ? { [home]: 100 } : {},
    weekPlan: freshWeekPlan(null),
    pendingEvent: null,
    pendingDebate: false,
    rivals: party === 'I' ? [] : spawnPartyRivals(party, runSeed),
    generalOpponent: null,
    independentNpc: party !== 'I' ? spawnGeneralOpponent('I', runSeed) : null,
    nomineeWonPrimary: false,
    matePool,
    vpShortlist: [],
    runningMate: null,
    conventionBounce: 0,
    conventionDone: false,
    debateBuff: 0,
    endorsements: [],
    news: [],
    statsRecap: {
      cashRaised: 0,
      cashSpent: 0,
      bestWeek: null,
      worstWeek: null,
      keyMoments: []
    },
    history: [],
    election: null,
    outcome: null,
    opponentParty: oppParty,
    lastWeekRecap: null
  };
  recomputePayroll(state);
  return state;
}

export function applyAnnouncement(state, announcementId) {
  const ann = state._announcements?.find((a) => a.id === announcementId);
  if (!ann) return { ok: false, reason: 'Pick an announcement tone.' };
  const e = ann.effects;
  state.resources.approval += e.approval ?? 0;
  state.resources.nameRec += e.buzz ?? 0;
  state.resources.base += e.base ?? 0;
  state.resources.momentum += Math.round((e.buzz ?? 0) / 2);
  state.mediaRisk = e.mediaRisk ?? 0;
  state.screen = 'play';
  state.week = 1;
  state.weekPlan = freshWeekPlan(state);
  pushNews(state, `Week 1: ${state.candidate.name} launches — "${ann.label}" message lands.`);
  state.statsRecap.keyMoments.push(`Announcement: ${ann.label}`);
  refreshDerived(state);
  return { ok: true };
}

export function freshWeekPlan(state) {
  const bonus = state ? (state._staffApBonus ?? 0) : 0;
  return { actions: [], apLeft: TUNING.actionPointsPerWeek + bonus, picks: {} };
}

export function pushNews(state, text, deltas = null) {
  state.news.unshift({ week: state.week, text, deltas, t: Date.now() });
  state.news = state.news.slice(0, 50);
}

export function nationalApproval(state) {
  const vals = Object.values(state.stateSupport);
  if (!vals.length) return state.resources.approval;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 0.55 + state.resources.approval * 0.45);
}

export function ballotAccessEv(state) {
  if (state.candidate.party !== 'I') return STATES.reduce((s, x) => s + x.ev, 0);
  let ev = 0;
  for (const [id, ok] of Object.entries(state.ballotAccess)) {
    if (ok) ev += getState(id)?.ev ?? 0;
  }
  return ev;
}

export function resetWeekPlan(state) {
  const b = staffBonuses(state);
  state._staffApBonus = b.apBonus;
  state.weekPlan = freshWeekPlan(state);
  state.debateBuff = Math.max(0, (state.debateBuff ?? 0) - 3);
}

export function refreshDerived(state) {
  state._coalitionScore = coalitionScore(state);
  state._battlegrounds = battlegroundStates(state);
}

export function normalizeLoaded(state) {
  if (!state.weekPlan) state.weekPlan = freshWeekPlan(state);
  if (!state.statsRecap) state.statsRecap = { cashRaised: 0, cashSpent: 0, keyMoments: [] };
  if (!state.ballotAccess) state.ballotAccess = {};
  if (!state.petitionProgress) state.petitionProgress = {};
  if (!state.candidate.policies) state.candidate.policies = defaultPolicies(state.candidate.party);
  if (!state.staffRoles) state.staffRoles = [];
  if (state.resources.scandal == null) state.resources.scandal = 10;
  if (!state.endorsements) state.endorsements = [];
  state.version = 2;
  recomputePayroll(state);
  refreshDerived(state);
  return state;
}

export function gameOverPrimary(state, winnerName) {
  state.screen = 'ended';
  state.outcome = { type: 'primary_loss', winner: winnerName, week: state.week };
}

export function gameOverBallot(state) {
  state.screen = 'ended';
  state.outcome = {
    type: 'ballot_fail',
    ev: ballotAccessEv(state),
    required: TUNING.independentBallotTargetEv
  };
}

export function gameOverScandal(state) {
  state.screen = 'ended';
  state.outcome = { type: 'scandal_out', week: state.week, scandal: state.resources.scandal };
}

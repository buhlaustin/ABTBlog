import { TUNING, STATES, BACKGROUNDS, getState } from './Data.js';
import { hashSeed } from './Rng.js';
import { buildRunningMatePool, pickVpShortlist } from './RunningMates.js';
import { spawnPartyRivals, spawnGeneralOpponent } from './Rivals.js';

export function initialStateSupport(homeStateId, party) {
  const support = {};
  const homeLean = party === 'R' ? 8 : party === 'D' ? 8 : 2;
  for (const st of STATES) {
    let base = 42 + ((st.id.charCodeAt(0) + st.id.charCodeAt(1)) % 9);
    if (party === 'R') base += st.region === 'south' ? 6 : st.region === 'northeast' ? -5 : 0;
    if (party === 'D') base += st.region === 'northeast' ? 6 : st.region === 'south' ? -4 : 0;
    if (party === 'I') base -= 4;
    if (st.id === homeStateId) base += homeLean;
    support[st.id] = Math.max(28, Math.min(62, base));
  }
  return support;
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

export function createNewGame({ name, homeState, backgroundId, party, seed }) {
  const bg = BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
  const runSeed = seed ?? (Date.now() & 0xffffffff);
  const home = getState(homeState)?.id ?? 'OH';
  const stats = {
    organization: 50 + (bg.mods.organization ?? 0),
    fundraising: 50 + (bg.mods.fundraising ?? 0),
    media: 50 + (bg.mods.media ?? 0),
    debate: 50 + (bg.mods.debate ?? 0),
    stamina: 50 + (bg.mods.stamina ?? 0)
  };
  const matePool = buildRunningMatePool(runSeed);
  const oppParty = party === 'R' ? 'D' : party === 'D' ? 'R' : 'R';
  return {
    version: 1,
    screen: 'announcement',
    seed: runSeed,
    week: 0,
    candidate: {
      name: name.trim().slice(0, 40) || 'Candidate',
      homeState: home,
      backgroundId: bg.id,
      backgroundLabel: bg.label,
      party,
      stats
    },
    resources: {
      cash: party === 'I' ? 650000 : 1200000,
      approval: 44,
      nameRec: 38,
      momentum: 6,
      base: 48,
      energy: 88
    },
    stateSupport: initialStateSupport(home, party),
    staff: party === 'I' ? 8 : 14,
    weeklyBurn: TUNING.weeklyPayrollBase + (party === 'I' ? 8 : 14) * TUNING.payrollPerStaff,
    delegates: 0,
    delegateRivals: {},
    ballotAccess: party === 'I' ? { [home]: true } : {},
    ballotEv: party === 'I' ? (getState(home)?.ev ?? 0) : 0,
    weekPlan: { actions: [], apLeft: TUNING.actionPointsPerWeek },
    pendingEvent: null,
    rivals: party === 'I' ? [] : spawnPartyRivals(party, runSeed),
    generalOpponent: null,
    independentNpc: party !== 'I' ? spawnGeneralOpponent('I', runSeed) : null,
    nomineeWonPrimary: false,
    matePool,
    vpShortlist: [],
    runningMate: null,
    conventionBounce: 0,
    debateBuff: 0,
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
    opponentParty: oppParty
  };
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
  state.weekPlan = freshWeekPlan();
  pushNews(state, `Week 1: ${state.candidate.name} launches — "${ann.label}" message lands.`);
  state.statsRecap.keyMoments.push(`Announcement: ${ann.label}`);
  return { ok: true };
}

export function freshWeekPlan() {
  return { actions: [], apLeft: TUNING.actionPointsPerWeek, picks: {} };
}

export function pushNews(state, text, deltas = null) {
  state.news.unshift({ week: state.week, text, deltas, t: Date.now() });
  state.news = state.news.slice(0, 40);
}

export function nationalApproval(state) {
  const vals = Object.values(state.stateSupport);
  if (!vals.length) return state.resources.approval;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Math.round(avg * 0.55 + state.resources.approval * 0.45);
}

export function ballotAccessEv(state) {
  if (state.candidate.party !== 'I') return totalEvAll();
  let ev = 0;
  for (const [id, ok] of Object.entries(state.ballotAccess)) {
    if (ok) ev += getState(id)?.ev ?? 0;
  }
  return ev;
}

function totalEvAll() {
  return STATES.reduce((s, x) => s + x.ev, 0);
}

export function resetWeekPlan(state) {
  state.weekPlan = freshWeekPlan();
  state.debateBuff = Math.max(0, state.debateBuff - 3);
}

export function normalizeLoaded(state) {
  if (!state.weekPlan) state.weekPlan = freshWeekPlan();
  if (!state.statsRecap) state.statsRecap = { cashRaised: 0, cashSpent: 0, keyMoments: [] };
  if (!state.ballotAccess) state.ballotAccess = {};
  return state;
}

export function gameOverPrimary(state, winnerName) {
  state.screen = 'ended';
  state.outcome = {
    type: 'primary_loss',
    winner: winnerName,
    week: state.week
  };
}

export function gameOverBallot(state) {
  state.screen = 'ended';
  state.outcome = {
    type: 'ballot_fail',
    ev: ballotAccessEv(state),
    required: TUNING.independentBallotTargetEv
  };
}

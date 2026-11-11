import { STATES, TUNING, PARTY_COLORS, getState } from './Data.js';
import { createRng } from './Rng.js';
import { nationalApproval, pushNews, ballotAccessEv } from './GameState.js';
import { spawnGeneralOpponent } from './Rivals.js';
import { statesByTimezoneOrder } from './Data.js';

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/** Week 26 — state-by-state primary for party nominees. */
export function resolvePrimaryWeek(state, rng) {
  const party = state.candidate.party;
  let playerDelegates = state.delegates;
  let rivalDelegates = {};
  for (const r of state.rivals) rivalDelegates[r.id] = r.delegates ?? 0;

  const results = [];
  for (const st of STATES) {
    const homeBump = st.id === state.candidate.homeState ? 6 : 0;
    const playerScore =
      (state.stateSupport[st.id] ?? 40) + homeBump + state.resources.momentum * 0.4 + rng.next() * 8;
    let bestRival = null;
    let bestScore = -1;
    for (const r of state.rivals) {
      const score = r.approval + (st.region === 'south' && party === 'R' ? 4 : 0) + rng.next() * 10;
      if (score > bestScore) {
        bestScore = score;
        bestRival = r;
      }
    }
    const delegates = Math.max(3, Math.round(st.ev * 0.85));
    if (playerScore >= bestScore) {
      playerDelegates += delegates;
      results.push({ state: st.id, winner: 'player', delegates });
    } else {
      rivalDelegates[bestRival.id] = (rivalDelegates[bestRival.id] ?? 0) + delegates;
      results.push({ state: st.id, winner: bestRival.name, delegates });
    }
  }

  state.delegates = playerDelegates;
  let topRival = 0;
  let topId = null;
  for (const [id, d] of Object.entries(rivalDelegates)) {
    if (d > topRival) {
      topRival = d;
      topId = id;
    }
    const rival = state.rivals.find((r) => r.id === id);
    if (rival) rival.delegates = d;
  }
  const totalDel = playerDelegates + Object.values(rivalDelegates).reduce((a, b) => a + b, 0);
  const need = Math.floor(totalDel * 0.5) + 1;
  const won = playerDelegates >= need || playerDelegates > topRival;
  let winner = state.candidate.name;
  if (!won) {
    const rival = state.rivals.find((r) => r.id === topId);
    winner = rival?.name ?? 'A rival';
  }
  return { won, winner, playerDelegates, need, results };
}

/** Assign delegates weekly during primary for display */
export function accruePrimaryDelegates(state, rng) {
  if (state.candidate.party === 'I') return;
  const del = rng.int(4, 14);
  state.delegates += del;
  const pick = rng.pick(state.rivals);
  if (pick) pick.delegates = (pick.delegates ?? 0) + rng.int(3, 12);
}

export function ensureGeneralOpponent(state) {
  if (!state.generalOpponent) {
    state.generalOpponent = spawnGeneralOpponent(state.opponentParty, state.seed);
  }
}

export function simulateElectionNight(state, rng) {
  ensureGeneralOpponent(state);
  const party = state.candidate.party;
  const opp = state.generalOpponent;
  const ind = state.independentNpc;

  const stateResults = {};
  const calls = [];
  let playerEv = 0;
  let oppEv = 0;
  let indEv = 0;

  for (const st of STATES) {
    let player = state.stateSupport[st.id] ?? 45;
    let opponent = opp.approval + (st.region === 'south' && opp.party === 'R' ? 5 : 0) + (st.region === 'northeast' && opp.party === 'D' ? 5 : 0);
    let independent = ind ? ind.approval - 6 : 0;
    if (party === 'I') {
      player -= 4;
      opponent += 2;
    }
    if (st.id === state.candidate.homeState) player += 5;
    if (state.runningMate?.homeState === st.id) player += 2;
    player += state.conventionBounce * 0.15;
    player += rng.int(-4, 4);
    opponent += rng.int(-3, 3);
    const total = player + opponent + Math.max(0, independent);
    const pvPlayer = total > 0 ? player / total : 0.33;
    const pvOpp = total > 0 ? opponent / total : 0.33;
    let winner = 'player';
    if (pvOpp > pvPlayer + 0.02) winner = 'opponent';
    else if (party !== 'I' && ind && independent / total > 0.28 && pvPlayer < 0.48 && pvOpp < 0.48) winner = 'independent';

    if (party === 'I' && !state.ballotAccess[st.id]) {
      winner = pvOpp > 0.5 ? 'opponent' : 'opponent';
      stateResults[st.id] = { winner: 'opponent', playerPct: 0, oppPct: 1, indPct: 0 };
      oppEv += st.ev;
      continue;
    }

    stateResults[st.id] = {
      winner,
      playerPct: Math.round(pvPlayer * 1000) / 10,
      oppPct: Math.round(pvOpp * 1000) / 10,
      indPct: ind ? Math.round((independent / total) * 1000) / 10 : 0
    };
    if (winner === 'player') playerEv += st.ev;
    else if (winner === 'opponent') oppEv += st.ev;
    else indEv += st.ev;
  }

  const order = statesByTimezoneOrder();
  const callScript = [];
  for (const st of order) {
    const res = stateResults[st.id];
    if (!res) continue;
    const label =
      res.winner === 'player'
        ? `${state.candidate.name} wins ${st.name}`
        : res.winner === 'opponent'
          ? `${opp.name} wins ${st.name}`
          : `${ind?.name ?? 'Independent'} wins ${st.name}`;
    callScript.push({ stateId: st.id, stateName: st.name, ev: st.ev, winner: res.winner, headline: label });
  }

  const won = playerEv >= TUNING.winThreshold;
  const popularPlayer = Object.values(stateResults).reduce((s, r) => s + (r.playerPct ?? 0), 0) / STATES.length;

  const outcome = {
    type: won ? 'win' : 'loss',
    playerEv,
    oppEv,
    indEv,
    popularVotePct: Math.round(popularPlayer * 10) / 10,
    opponentName: opp.name
  };
  state.outcome = outcome;
  state.screen = 'election_night';
  state.electionNight = { stateResults, callScript, playerEv, oppEv, indEv, won, partyColors: PARTY_COLORS, revealed: 0 };

  return { stateResults, callScript, playerEv, oppEv, indEv, won, partyColors: PARTY_COLORS };
}

import { createRng } from './Rng.js';
import { PARTY_LABELS, ACTIONS } from './Data.js';
import { pushNews } from './GameState.js';

const NAMES_R = ['Victor Hale', 'Martha Klein', 'Russell Boone', 'Nadia Cordell', 'Cole Merritt', 'Tessa Wainwright'];
const NAMES_D = ['Elena Marsh', 'David Truong', 'Priya Sandoval', 'Marcus Feldman', 'Lena Ortiz', 'Chris Hanley'];
const NAMES_I = ['Jordan Pike', 'Samira Cole'];

const STRATEGIES = ['organizer', 'money', 'fighter', 'technocrat'];

export function spawnPartyRivals(party, seed, count = 4) {
  const rng = createRng(seed ^ 0xabc);
  const names = party === 'R' ? NAMES_R : party === 'D' ? NAMES_D : NAMES_I;
  const rivals = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let name = rng.pick(names);
    while (used.has(name) && used.size < names.length) name = rng.pick(names);
    used.add(name);
    rivals.push({
      id: `rival-${party}-${i}`,
      name,
      party,
      partyLabel: PARTY_LABELS[party],
      approval: 38 + rng.int(0, 18),
      momentum: rng.int(0, 12),
      delegates: 0,
      cash: 800000 + rng.int(0, 400000),
      scandal: 0,
      strategy: rng.pick(STRATEGIES),
      alive: true
    });
  }
  return rivals;
}

export function spawnGeneralOpponent(party, seed) {
  const rng = createRng(seed ^ 0xdef01);
  const names = party === 'R' ? NAMES_R : NAMES_D;
  return {
    id: 'nominee-opp',
    name: rng.pick(names),
    party,
    partyLabel: PARTY_LABELS[party],
    approval: 44 + rng.int(0, 12),
    momentum: 8 + rng.int(0, 10),
    stateBonus: 0,
    strategy: rng.pick(STRATEGIES)
  };
}

export function rivalWeeklyTick(rival, rng, playerMomentum) {
  const swing = rng.int(-3, 4) + Math.round((playerMomentum - rival.momentum) * 0.1);
  rival.approval = Math.max(20, Math.min(62, rival.approval + swing));
  rival.momentum = Math.max(0, Math.min(20, rival.momentum + rng.int(-2, 3)));
  if (rng.chance(0.08)) rival.scandal += 1;
  return rival;
}

/** AI rivals spend invisible action points each week. */
export function rivalsAct(state, rng) {
  if (!state.rivals?.length) return;
  const count = 2;
  for (let i = 0; i < count; i++) {
    const rival = rng.pick(state.rivals);
    if (!rival?.alive) continue;
    if (rival.strategy === 'money') rival.approval += rng.chance(0.4) ? 1 : 0;
    if (rival.strategy === 'fighter' && rng.chance(0.35)) {
      state.resources.approval = Math.max(12, (state.resources.approval ?? 44) - 1);
      pushNews(state, `${rival.name} draws blood on cable.`, { approval: -1 });
    }
    if (rival.strategy === 'organizer') rival.delegates = (rival.delegates ?? 0) + rng.int(0, 2);
    rival.momentum = Math.min(20, (rival.momentum ?? 0) + rng.int(0, 2));
  }
}

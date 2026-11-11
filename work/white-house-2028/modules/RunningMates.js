import { STATES } from './Data.js';
import { createRng } from './Rng.js';

const FIRST = [
  'Jordan',
  'Morgan',
  'Riley',
  'Avery',
  'Quinn',
  'Harper',
  'Sydney',
  'Dakota',
  'Logan',
  'Parker',
  'Reese',
  'Blake',
  'Cameron',
  'Drew',
  'Emerson',
  'Hayden'
];
const LAST = [
  'Whitfield',
  'Chen',
  'Okafor',
  'Santos',
  'Nakamura',
  'Brooks',
  'Dalton',
  'Vasquez',
  'Kline',
  'Patel',
  'Sterling',
  'Holloway',
  'Marino',
  'Okonkwo',
  'Brennan',
  'Yates'
];
const STRENGTHS = [
  'Rust Belt credibility',
  'National security gravitas',
  'Sun Belt fundraising',
  'Youth turnout energy',
  'Business lane validator',
  'Progressive coalition glue',
  'Evangelical bridge',
  'Labor union trust',
  'Tech economy fluency',
  'Suburban parent appeal'
];
const WEAKNESSES = [
  'Thin federal resume',
  'Old vote record fodder',
  'Regional accent baggage',
  'Donor-class optics',
  'Scandal-adjacent rumor',
  'Flip-flop compilations exist',
  'Low name recognition',
  'Aggressive primary comments'
];
const HIDDEN = [
  'Secret offshore speech fees',
  'Family charity audit flag',
  'Undisclosed health scare',
  'Board seats with rival donors',
  'College plagiarism file',
  'Anonymous #MeToo whisper',
  'Classified briefing leak rumor',
  'Gambling debt (resolved)'
];

/** Build 100 fictional running mates — 2 per state. */
export function buildRunningMatePool(seed) {
  const rng = createRng(seed);
  const pool = [];
  for (const st of STATES) {
    for (let i = 0; i < 2; i++) {
      const id = `${st.id}-${i}`;
      pool.push({
        id,
        name: `${rng.pick(FIRST)} ${rng.pick(LAST)}`,
        homeState: st.id,
        homeName: st.name,
        strength: rng.pick(STRENGTHS),
        weakness: rng.pick(WEAKNESSES),
        hidden: rng.pick(HIDDEN),
        vettingRevealed: false,
        hiddenRevealed: false,
        score: 40 + rng.int(0, 35)
      });
    }
  }
  return pool;
}

export function pickVpShortlist(pool, seed) {
  const rng = createRng(seed + 90210);
  const shuffled = [...pool].sort(() => rng.next() - 0.5);
  return shuffled.slice(0, 5);
}

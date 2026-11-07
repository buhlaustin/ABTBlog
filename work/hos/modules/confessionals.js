import { escapeHtml, pickRandom } from './utils.js';

/**
 * @typedef {'hoh_win' | 'hoh_nominated' | 'on_block' | 'veto_saved' | 'veto_unused' | 'evicted' | 'survived_vote' | 'betrayal'} ConfessionalEvent
 */

/** @type {Record<string, Record<ConfessionalEvent, ((ctx: Record<string, string>, speaker: import('./Contestant.js').Contestant) => string)[]>>} */
const CONFESSIONAL_LINES = {
  manipulate: {
    hoh_win: [
      () => 'Power is leverage — now I decide who sweats.',
      () => 'The house thinks this was luck. It wasn’t.'
    ],
    hoh_nominated: [
      (ctx) => `Putting ${ctx.a} and ${ctx.b} up is chess, not chaos.`,
      (ctx) => `${ctx.a} and ${ctx.b} were the only two moves that keep my endgame clean.`
    ],
    on_block: [
      (ctx) => `On the block with ${ctx.other} — someone’s story ends Thursday.`,
      () => 'I need the house to pity me just long enough to flip a vote.'
    ],
    veto_saved: [
      (ctx) => `Using the veto on ${ctx.saved} buys my alliance another day.`,
      () => 'That veto was always the real plan.'
    ],
    veto_unused: [
      () => 'Keeping the veto — the block is exactly where I want them.',
      () => 'Sometimes the best move is letting the house bleed.'
    ],
    evicted: [
      () => 'I ran the best game I could — the jury better remember that.',
      () => 'Don’t romanticize who beat me. I would do it again.'
    ],
    survived_vote: [
      () => 'Close calls make legends. I’m still here.',
      (ctx) => `Surviving over ${ctx.other} changes every deal in this house.`
    ],
    betrayal: [
      (ctx) => `Turning on ${ctx.target} had to happen — they were coming for me.`,
      () => 'Loyalty is a tool. I’m done lending mine for free.'
    ]
  },
  ally: {
    hoh_win: [
      () => 'My alliance needed this — I’ll protect who I promised to.',
      () => 'HOH means I can finally shield the people who carried me.'
    ],
    hoh_nominated: [
      (ctx) => `Nominated ${ctx.a} and ${ctx.b} — brutal, but my people are safe.`,
      () => 'These noms hurt, but the house needed a clear message.'
    ],
    on_block: [
      () => 'My allies have to show up tonight — I’ve given them everything.',
      (ctx) => `${ctx.hoh} putting me up might be the biggest betrayal this week.`
    ],
    veto_saved: [
      (ctx) => `Had to save ${ctx.saved} — we made a deal for a reason.`,
      () => 'The veto was always for family, not friends.'
    ],
    veto_unused: [
      () => 'I trust the block we built — no veto needed.',
      () => 'Let the house vote — my alliance is solid.'
    ],
    evicted: [
      () => 'I stayed loyal. Maybe that was my mistake.',
      () => 'Tell the jury I played with my heart — not my knife.'
    ],
    survived_vote: [
      () => 'They tried to cut the glue of this house. I’m still here.',
      () => 'One more night means one more chance to honor my word.'
    ],
    betrayal: [
      (ctx) => `I broke my word to ${ctx.target} — I hate it, but I had to.`,
      () => 'Promises are expensive. I couldn’t afford that one anymore.'
    ]
  },
  survive: {
    hoh_win: [
      () => 'HOH keeps the target off me — I’ll float as long as I can.',
      () => 'Nobody expected me to win this. Perfect.'
    ],
    hoh_nominated: [
      (ctx) => `${ctx.a} and ${ctx.b} can take the heat — I need cover.`,
      () => 'Throwing names out there keeps the blood off my hands.'
    ],
    on_block: [
      () => 'I’m not the threat — why am I on the block?',
      (ctx) => `If ${ctx.other} goes home instead of me, I’ll take it.`
    ],
    veto_saved: [
      (ctx) => `Saving ${ctx.saved} keeps the numbers where I need them.`,
      () => 'Veto used — I’m still a pawn, but a useful one.'
    ],
    veto_unused: [
      () => 'Let them battle — I’m staying invisible.',
      () => 'No veto needed. The house can eat itself.'
    ],
    evicted: [
      () => 'I floated as long as I could. Almost worked.',
      () => 'Tell them I never made a big move — maybe that’s why I’m out.'
    ],
    survived_vote: [
      () => 'Still here. Still nobody’s priority — that’s the game.',
      () => 'Another week under the radar. I’ll take it.'
    ],
    betrayal: [
      () => 'I had to cut a deal loose to survive.',
      (ctx) => `${ctx.target} was weighing me down — sorry, not sorry.`
    ]
  },
  attack: {
    hoh_win: [
      () => 'Good. Now I can put the biggest mouths on the block.',
      () => 'HOH is a weapon — I’m ready to swing it.'
    ],
    hoh_nominated: [
      (ctx) => `${ctx.a} and ${ctx.b} have been dodging accountability — not anymore.`,
      () => 'These noms are personal. The house can deal with it.'
    ],
    on_block: [
      () => 'Put me up? Fine. I’ll torch the house on the way out.',
      () => 'They want drama — I’ll give them a show at this vote.'
    ],
    veto_saved: [
      (ctx) => `Vetoed ${ctx.saved} because the house doesn’t get to erase my picks that easy.`,
      () => 'That veto slap was intentional.'
    ],
    veto_unused: [
      () => 'Watch them squirm — veto stays in the box.',
      () => 'Let the block suffer. I’m enjoying this.'
    ],
    evicted: [
      () => 'I went out swinging. Remember that.',
      () => 'They’ll call me a villain — I call it honesty.'
    ],
    survived_vote: [
      () => 'The house tried to bury me. I’m still breathing fire.',
      () => 'Surviving this vote means war next week.'
    ],
    betrayal: [
      (ctx) => `I was never loyal to ${ctx.target} — they were just useful.`,
      () => 'Betrayal? I call it winning.'
    ]
  },
  befriend: {
    hoh_win: [
      () => 'Maybe now the house stops side-eyeing me.',
      () => 'I won HOH — time to prove I’m not just likable, I’m dangerous.'
    ],
    hoh_nominated: [
      (ctx) => `Nominating ${ctx.a} and ${ctx.b} is going to wreck some friendships.`,
      () => 'I hate putting friends on the block, but someone had to.'
    ],
    on_block: [
      () => 'I’ve been nice to everyone — somebody better return the favor.',
      () => 'Social game only works if they save me tonight.'
    ],
    veto_saved: [
      (ctx) => `I couldn’t let ${ctx.saved} go home — we’re bonded.`,
      () => 'The veto was the only humane move.'
    ],
    veto_unused: [
      () => 'The block needs to play it out — I’m staying neutral.',
      () => 'No veto. I’m letting the house choose.'
    ],
    evicted: [
      () => 'I thought being liked was enough. It wasn’t.',
      () => 'Wish the jury saw how hard I tried to keep the peace.'
    ],
    survived_vote: [
      () => 'The house still likes me — that might save my whole game.',
      () => 'One more chance to prove nice guys finish… somewhere.'
    ],
    betrayal: [
      (ctx) => `I ghosted ${ctx.target} — it’s survival, not malice.`,
      () => 'I’m sorry in advance for every vote I have to flip.'
    ]
  },
  chaos: {
    hoh_win: [
      () => 'HOH? Cool. I have absolutely no plan, which is the plan.',
      () => 'Let’s see what happens when I’m in charge. Chaos.'
    ],
    hoh_nominated: [
      (ctx) => `${ctx.a} and ${ctx.b} — random? Maybe. Fun? Definitely.`,
      () => 'The block needs spice. I’m the whole seasoning rack.'
    ],
    on_block: [
      () => 'On the block is content — I’m thriving.',
      () => 'If I go home, at least the vote will be messy.'
    ],
    veto_saved: [
      (ctx) => `Veto on ${ctx.saved} because why not flip the night upside down?`,
      () => 'Chaos served hot — veto used.'
    ],
    veto_unused: [
      () => 'Veto stays unused — let the house explode.',
      () => 'I love watching plans crumble.'
    ],
    evicted: [
      () => 'Went out in a blaze of nonsense. Worth it.',
      () => 'Tell the jury I was entertainment first, strategist second.'
    ],
    survived_vote: [
      () => 'Survived! The house has no idea what to do with me.',
      () => 'Another week of pure mayhem — let’s go.'
    ],
    betrayal: [
      () => 'Backstab? Plot twist! That’s my brand.',
      (ctx) => `Sorry ${ctx.target} — actually, not sorry.`
    ]
  },
  win: {
    hoh_win: [
      () => 'Comp beast mode — HOH was the only acceptable outcome.',
      () => 'I train for this. The block should be scared.'
    ],
    hoh_nominated: [
      (ctx) => `${ctx.a} and ${ctx.b} can’t compete with me — send them home.`,
      () => 'These are the biggest threats on the board. Goodbye.'
    ],
    on_block: [
      () => 'Put the comp winner on the block? They’re terrified.',
      () => 'I’ll win veto or win the vote — either works.'
    ],
    veto_saved: [
      (ctx) => `Pulled ${ctx.saved} off — physical threats need allies.`,
      () => 'Veto used. I protect my own.'
    ],
    veto_unused: [
      () => 'The block stands. I’ll win the next comp too.',
      () => 'No veto needed — I like this matchup.'
    ],
    evicted: [
      () => 'Shocked the house beat a comp threat — respect.',
      () => 'Jury, remember the wins, not the blindside.'
    ],
    survived_vote: [
      () => 'Told you I’m not going anywhere.',
      () => 'They targeted a winner — I’m still standing.'
    ],
    betrayal: [
      () => 'Alliances slow me down — I cut the dead weight.',
      (ctx) => `${ctx.target} couldn’t keep up with my game.`
    ]
  }
};

/**
 * @param {import('./Contestant.js').Contestant} speaker
 * @param {ConfessionalEvent} eventKey
 * @param {Record<string, string>} [ctx]
 */
export function pickConfessionalLine(speaker, eventKey, ctx = {}) {
  const strat = speaker.personality?.strategy || 'survive';
  const bucket =
    CONFESSIONAL_LINES[strat]?.[eventKey] ||
    CONFESSIONAL_LINES.survive[eventKey];
  if (!bucket?.length) return null;
  const template = pickRandom(bucket);
  return typeof template === 'function' ? template(ctx, speaker) : template;
}

/**
 * @param {import('./Contestant.js').Contestant} speaker
 * @param {string} line
 */
export function buildConfessionalEntry(speaker, line) {
  return {
    type: 'confessional',
    confessionalSpeakerId: speaker.id,
    text: `Confessional — <strong>${escapeHtml(speaker.name)}</strong>: “${escapeHtml(line)}”`
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildConfessionalIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const log = state.confessionalLog || [];
  if (!log.length) return null;

  return {
    id: 'confessionals',
    title: 'Confessionals',
    tone: 'neutral',
    items: log
      .slice(-4)
      .reverse()
      .map((row) => ({
        key: `conf-${row.week}-${row.day}-${row.speakerId}`,
        name: row.speakerName,
        detail: row.line
      }))
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} speaker
 * @param {string} line
 */
export function recordConfessional(state, speaker, line) {
  if (!state.confessionalLog) state.confessionalLog = [];
  state.confessionalLog.push({
    week: state.week,
    day: state.day,
    speakerId: speaker.id,
    speakerName: speaker.name,
    line
  });
  if (state.confessionalLog.length > 12) {
    state.confessionalLog = state.confessionalLog.slice(-12);
  }
}

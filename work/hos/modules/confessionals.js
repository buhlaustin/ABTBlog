import { escapeHtml, pickRandom } from './utils.js';

/**
 * @typedef {'hoh_win' | 'hoh_nominated' | 'on_block' | 'veto_saved' | 'veto_unused' | 'veto_won' | 'veto_spared' | 'evicted' | 'survived_vote' | 'double_eviction' | 'jury_seat' | 'betrayal' | 'betrayed_by' | 'alliance_formed' | 'alliance_exposed' | 'new_promise' | 'campaign' | 'backdoor' | 'lay_low' | 'replacement_nom' | 'replacement_pick' | 'premiere' | 'veteran_return' | 'rookie_pressure' | 'crowded_house' | 'brains_season'} ConfessionalEvent
 */

export const CONFESSIONAL_EVENT_LABELS = {
  hoh_win: 'HOH win',
  hoh_nominated: 'Sent to block',
  on_block: 'On the block',
  veto_saved: 'Veto used',
  veto_unused: 'Veto held',
  veto_won: 'Won POV',
  veto_spared: 'Saved by veto',
  evicted: 'Evicted',
  double_eviction: 'Double eviction',
  jury_seat: 'Jury seat',
  survived_vote: 'Survived vote',
  betrayal: 'Broke a deal',
  betrayed_by: 'Betrayed',
  alliance_formed: 'New alliance',
  alliance_exposed: 'Alliance busted',
  new_promise: 'Promise',
  campaign: 'Campaign',
  backdoor: 'Backdoor plan',
  lay_low: 'Lay low',
  replacement_nom: 'Replacement nom',
  replacement_pick: 'Replacement pick',
  premiere: 'Move-in',
  veteran_return: 'All-Star return',
  rookie_pressure: 'Rookie lane',
  crowded_house: 'Crowded cast',
  brains_season: 'Brains twist'
};

/** @type {Record<string, ((ctx: Record<string, string>) => string)[]>} */
const GENERIC_LINES = {
  alliance_formed: [
    (ctx) => `Shaking with ${ctx.partner} — this could carry me to the end.`,
    (ctx) => `Secret deal with ${ctx.partner}. The house can’t know yet.`
  ],
  new_promise: [
    (ctx) => `Promised ${ctx.partner} my vote — hope they hold up their end.`,
    (ctx) => `Made a ${ctx.dealType || 'deal'} with ${ctx.partner}. That’s binding.`
  ],
  campaign: [
    (ctx) => `The house is turning on ${ctx.target} — I started that fire.`,
    (ctx) => `${ctx.target} is the villain this week. I need it to stick.`
  ],
  backdoor: [
    (ctx) => `Backdoor is set on ${ctx.target} — pawns first, truth later.`,
    (ctx) => `${ctx.target} won’t see the block coming if this works.`
  ],
  betrayed_by: [
    (ctx) => `${ctx.betrayer} flipped — I won’t forget it.`,
    (ctx) => `I trusted ${ctx.betrayer}. That was the mistake.`
  ],
  veto_won: [
    () => 'Golden veto in my hands — someone’s getting saved or I’m saving myself.',
    () => 'POV win. The block just became negotiable.'
  ],
  premiere: [
    () => 'First day energy — smile now, strategize in the shower.',
    () => 'Nobody knows my game yet. That’s the advantage.'
  ],
  veteran_return: [
    () => 'The house knows my resume — I still have to prove it again.',
    () => 'Returnee target on my back. Good. I play better under pressure.',
    () => 'Second (or third) time in — the fans remember; the jury will too.'
  ],
  rookie_pressure: [
    () => 'Rookie in a house of legends. Fine — they underestimate hunger.',
    () => 'No past footage on me. That’s the only edge I need this week.',
    () => 'They want the all-stars safe. I’m not here to applaud.'
  ],
  crowded_house: [
    () => 'Twenty-plus people in one house — someone will snap by Week 3.',
    () => 'Worst bathroom line in history. Best social game ever.',
    () => 'Mega cast means mega threats. Float or get drowned.'
  ],
  brains_season: [
    () => 'This cast is all chess — one dumb move and they eat you alive.',
    () => 'Brains twist? Perfect. I was born for this cast.'
  ],
  lay_low: [
    () => 'I stayed invisible today — the radar can’t find what it doesn’t see.',
    () => 'Let them scream; I’m taking the quiet lane.'
  ],
  replacement_nom: [
    (ctx) => `${ctx.hoh || 'The HOH'} just put me on the block as the replacement — blindsided.`,
    () => 'Veto save flipped the week and I drew the short stick.'
  ],
  replacement_pick: [
    (ctx) => `Naming ${ctx.target} as the replacement protects my real target.`,
    (ctx) => `${ctx.saved || 'They'} got saved — ${ctx.target} pays the price.`
  ],
  veto_spared: [
    (ctx) => `${ctx.saver || 'They'} pulled me off the block — I owe them everything.`,
    () => 'Veto save. I’m breathing again, barely.'
  ],
  alliance_exposed: [
    (ctx) => `The house caught me with ${ctx.partner} — cover blown.`,
    () => 'Exposed alliance. Time to rebrand or go down swinging.'
  ],
  jury_seat: [
    () => 'Evicted, but the game isn’t over — jury remembers grudges.',
    () => 'I’ll be watching from the jury. Every lie gets a receipt.'
  ],
  double_eviction: [
    (ctx) => `${ctx.other || 'Someone'} is out and we’re doing this again tonight.`,
    () => 'Double eviction chaos — survive round one, pray for round two.'
  ]
};

/** Archetype-specific lines for social / floater events (merged when core bucket missing). */
/** @type {Record<string, Partial<Record<ConfessionalEvent, ((ctx: Record<string, string>, speaker: import('./Contestant.js').Contestant) => string)[]>>>} */
const ARCHETYPE_SOCIAL = {
  manipulate: {
    lay_low: [
      () => 'Laying low lets me listen — information beats visibility.',
      () => 'Invisible today, dangerous tomorrow.'
    ],
    alliance_formed: [
      (ctx) => `New lever with ${ctx.partner} — the house won’t see the strings.`,
      (ctx) => `${ctx.partner} thinks it’s friendship. It’s math.`
    ],
    betrayed_by: [
      (ctx) => `${ctx.betrayer} flipped — I already have the counter-move.`,
      (ctx) => `Not shocked ${ctx.betrayer} lied. Disappointed I trusted the sell.`
    ],
    replacement_nom: [
      () => 'Replacement nom? Fine — pity wins votes if I sell it right.',
      (ctx) => `${ctx.hoh} put me up as the sacrificial pawn. Joke’s on them.`
    ]
  },
  ally: {
    lay_low: [
      () => 'My alliance needs me quiet today — not flashy.',
      () => 'I’ll let the house fight while I tend my people.'
    ],
    alliance_formed: [
      (ctx) => `${ctx.partner} and I are locked — ride or die.`,
      () => 'Another soldier in the army. Grateful.'
    ],
    betrayed_by: [
      (ctx) => `${ctx.betrayer} broke our word. The alliance felt that.`,
      () => 'Betrayal hurts more when you meant the promise.'
    ]
  },
  survive: {
    lay_low: [
      () => 'Floater mode: smile, hide, survive.',
      () => 'Nobody talking about me is the win.'
    ],
    alliance_formed: [
      (ctx) => `Soft alliance with ${ctx.partner} — might keep me off the block.`,
      () => 'I need numbers without becoming a target.'
    ],
    replacement_nom: [
      () => 'Replacement nom on a floater? Classic house mistake.',
      () => 'They think I’m easy to evict. We’ll see.'
    ]
  },
  attack: {
    lay_low: [
      () => 'Rare quiet day — saving ammunition.',
      () => 'Even villains need a nap.'
    ],
    campaign: [
      (ctx) => `Blood in the water around ${ctx.target} — I started the feeding frenzy.`,
      () => 'The house is hunting and I picked the prey.'
    ],
    betrayed_by: [
      (ctx) => `${ctx.betrayer} crossed me — they’re on the hit list now.`,
      () => 'Betrayal just made my week personal.'
    ]
  },
  befriend: {
    lay_low: [
      () => 'Being likable means letting others be the drama today.',
      () => 'I’ll bake cookies while they scream.'
    ],
    alliance_formed: [
      (ctx) => `${ctx.partner} feels like family already.`,
      () => 'Another friend in the house — I hope that’s enough.'
    ],
    veto_spared: [
      (ctx) => `${ctx.saver} saved me — I’ll never stop thanking them.`,
      () => 'Veto save. My social game might actually work.'
    ]
  },
  chaos: {
    lay_low: [
      () => 'Even chaos agents need a day off from the blast radius.',
      () => 'Quiet today so tomorrow’s mess hits harder.'
    ],
    alliance_exposed: [
      () => 'Busted alliance? Now the fun starts.',
      (ctx) => `Caught with ${ctx.partner} — time to spin a new story.`
    ],
    double_eviction: [
      () => 'Two boots tonight? Music to my ears.',
      () => 'Double eviction is my favorite holiday.'
    ]
  },
  win: {
    lay_low: [
      () => 'Rest day — comps are where I print power.',
      () => 'Threat drops when I’m not flexing in the yard.'
    ],
    veto_won: [
      () => 'Veto win. Physical dominance plus power — ideal.',
      () => 'Golden veto. The block fears me for a reason.'
    ],
    jury_seat: [
      () => 'Evicted as a comp beast — jury better respect the wins.',
      () => 'I’ll vote for whoever played hardest, not nicest.'
    ]
  }
};

/** Player diary lines override archetype templates when `speaker.isPlayer`. */
/** @type {Record<string, ((ctx: Record<string, string>) => string)[]>} */
const PLAYER_LINES = {
  hoh_win: [
    () => 'I’ve got the keys — every nom has to serve my game.',
    () => 'HOH was the plan. Now I have to look like it wasn’t.'
  ],
  hoh_nominated: [
    (ctx) => `Putting ${ctx.a} and ${ctx.b} up — brutal, but necessary.`,
    (ctx) => `${ctx.a} and ${ctx.b} drew the short sticks. I hate it, I need it.`
  ],
  on_block: [
    (ctx) => `On the block with ${ctx.other} — I need votes tonight.`,
    () => 'I did not come here to be the first boot.'
  ],
  veto_saved: [
    (ctx) => `Used the veto on ${ctx.saved} — the house will talk.`,
    () => 'Veto burned. Worth it.'
  ],
  veto_unused: [
    () => 'Holding the veto — the block stays messy on purpose.',
    () => 'Didn’t use it. Let them sweat.'
  ],
  evicted: [
    () => 'My game is over — jury, remember who played.',
    () => 'Evicted. I gave this house everything.'
  ],
  survived_vote: [
    (ctx) => `Stayed over ${ctx.other} — I’m still in control.`,
    () => 'Another vote survived. They’ll come for me again.'
  ],
  betrayal: [
    (ctx) => `Had to break my word to ${ctx.target} — survival first.`,
    (ctx) => `${ctx.target} was a liability. Sorry, not sorry.`
  ],
  alliance_formed: [
    (ctx) => `New secret deal with ${ctx.partner} — separate from everything else.`,
    () => 'Another alliance chip in my pocket.'
  ],
  new_promise: [
    (ctx) => `Locked a ${ctx.dealType || 'deal'} with ${ctx.partner}. I’ll honor it… for now.`,
    () => 'Promises are currency. I just spent some.'
  ],
  campaign: [
    (ctx) => `Campaign against ${ctx.target} is working — threat’s worth it.`,
    () => 'Whisper game strong. The house is moving my way.'
  ],
  backdoor: [
    (ctx) => `Backdoor lane open on ${ctx.target} — don’t blow this.`,
    () => 'Pawns, veto, replacement — I’ve got the route mapped.'
  ],
  premiere: [
    () => 'First confessional of the season — my real game starts now.',
    () => 'Smile for the cameras; the plans stay in my head.'
  ],
  veto_won: [
    () => 'POV around my neck — I decide who sweats this week.',
    () => 'Veto win. The block is mine to reshape.'
  ],
  veto_spared: [
    (ctx) => `${ctx.saver || 'They'} yanked me off the block — I’m not wasting that.`,
    () => 'Saved by veto. Time to work the guilt.'
  ],
  betrayed_by: [
    (ctx) => `${ctx.betrayer} stabbed me — I’ll remember every vote.`,
    () => 'Trust broke. My game just got personal.'
  ],
  lay_low: [
    () => 'I took the Rest action — let the loud ones burn threat.',
    () => 'Floating today. Threat down, patience up.'
  ],
  replacement_nom: [
    (ctx) => `Replacement nom courtesy of ${ctx.hoh} — didn’t see it coming.`,
    () => 'Veto chaos landed me on the block. Not ideal.'
  ],
  replacement_pick: [
    (ctx) => `Replacement ${ctx.target} — the path I mapped finally paid off.`,
    (ctx) => `Saved ${ctx.saved}, sacrificed ${ctx.target}. Cold, correct.`
  ],
  jury_seat: [
    () => 'Evicted but not done — jury votes are my last move.',
    () => 'I’ll sit in that jury house and judge who lied.'
  ],
  double_eviction: [
    () => 'Double eviction night — one down, maybe two to go.',
    (ctx) => `${ctx.other || 'They'}’re out; I need to survive the encore.`
  ],
  alliance_exposed: [
    (ctx) => `House caught my deal with ${ctx.partner} — damage control mode.`,
    () => 'Exposed alliance. Spin or sink.'
  ]
};

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
  if (speaker.isPlayer && PLAYER_LINES[eventKey]?.length) {
    const playerTemplate = pickRandom(PLAYER_LINES[eventKey]);
    return typeof playerTemplate === 'function'
      ? playerTemplate(ctx, speaker)
      : playerTemplate;
  }

  const strat = speaker.personality?.strategy || 'survive';
  let bucket =
    CONFESSIONAL_LINES[strat]?.[eventKey] ||
    ARCHETYPE_SOCIAL[strat]?.[eventKey] ||
    CONFESSIONAL_LINES.survive[eventKey] ||
    ARCHETYPE_SOCIAL.survive?.[eventKey];
  if (!bucket?.length) {
    bucket = GENERIC_LINES[eventKey];
  }
  if (!bucket?.length) return null;
  const template = pickRandom(bucket);
  return typeof template === 'function' ? template(ctx, speaker) : template;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function countConfessionalsThisWeek(state) {
  return (state.confessionalLog || []).filter((r) => r.week === state.week).length;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} replacement
 */
export function buildReplacementConfessionalExtras(state, replacement) {
  const hoh = state.getActiveContestants().find((c) => c.isHOH);
  const saved = state.vetoSavedNomineeId
    ? state.getContestant(state.vetoSavedNomineeId)
    : null;
  /** @type {{ speaker: import('./Contestant.js').Contestant, eventKey: string, ctx?: Record<string, string> }[]} */
  const extras = [{
    speaker: replacement,
    eventKey: 'replacement_nom',
    ctx: { hoh: hoh?.name || 'the HOH' }
  }];
  if (hoh) {
    extras.push({
      speaker: hoh,
      eventKey: 'replacement_pick',
      ctx: {
        target: replacement.name,
        saved: saved?.name || 'a nominee'
      }
    });
  }
  return extras;
}

export function getConfessionalFeedBanner(state) {
  const last = state.confessionalLog?.[state.confessionalLog.length - 1];
  if (!last) return '';
  const label = CONFESSIONAL_EVENT_LABELS[last.eventKey] || 'Diary';
  const snippet =
    last.line.length > 42 ? `${last.line.slice(0, 40)}…` : last.line;
  const weekCount = countConfessionalsThisWeek(state);
  const prefix =
    weekCount > 1
      ? `Confessionals · ${weekCount} this week · `
      : 'Confessional · ';
  return `${prefix}${last.speakerName} (${label}): “${snippet}”`;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {string} speakerId
 * @param {string} eventKey
 */
export function shouldSkipConfessional(state, speakerId, eventKey) {
  const key = `${state.week}:${state.day}:${speakerId}:${eventKey}`;
  const seen = state.confessionalDedupeKeys || [];
  if (seen.includes(key)) return true;
  return false;
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {string} speakerId
 * @param {string} eventKey
 */
export function markConfessionalPlayed(state, speakerId, eventKey) {
  if (!state.confessionalDedupeKeys) state.confessionalDedupeKeys = [];
  const key = `${state.week}:${state.day}:${speakerId}:${eventKey}`;
  if (!state.confessionalDedupeKeys.includes(key)) {
    state.confessionalDedupeKeys.push(key);
  }
  if (state.confessionalDedupeKeys.length > 40) {
    state.confessionalDedupeKeys = state.confessionalDedupeKeys.slice(-40);
  }
}

/**
 * @param {import('./Contestant.js').Contestant} speaker
 * @param {string} line
 */
export function buildConfessionalEntry(speaker, line, eventKey = null) {
  const arch = speaker.personality?.name;
  const who = arch && !speaker.isPlayer
    ? `${speaker.name} (${arch})`
    : speaker.name;
  return {
    type: 'confessional',
    confessionalSpeakerId: speaker.id,
    confessionalEvent: eventKey,
    text: `Confessional — <strong>${escapeHtml(who)}</strong>: “${escapeHtml(line)}”`
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

  const thisWeek = log.filter((r) => r.week === state.week);
  const weekCount = thisWeek.length;
  const speakerCount = new Set(thisWeek.map((r) => r.speakerId)).size;
  const playerLines = player
    ? thisWeek.filter((r) => r.speakerId === player.id).length
    : 0;

  return {
    id: 'confessionals',
    title: 'Confessionals',
    tone: 'neutral',
    items: [
      ...(weekCount
        ? [{
          key: 'conf-week-count',
          name: 'This week',
          detail: `${weekCount} line${weekCount === 1 ? '' : 's'} · ${speakerCount} HG${speakerCount === 1 ? '' : 's'} spoke${playerLines ? ` · you: ${playerLines}` : ''}.`
        }]
        : []),
      ...log
        .slice(-6)
        .reverse()
        .map((row) => {
          const tag = CONFESSIONAL_EVENT_LABELS[row.eventKey] || row.eventKey || 'Diary';
          const src = row.source === 'api' ? ' · narrated' : '';
          const arch = row.archetype && row.archetype !== 'Player'
            ? ` (${row.archetype})`
            : '';
          return {
            key: `conf-${row.week}-${row.day}-${row.speakerId}-${row.eventKey || 'x'}`,
            name: `${row.speakerName}${arch}`,
            detail: `${tag}${src} · “${row.line}”`
          };
        })
    ].slice(0, 8)
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} speaker
 * @param {string} line
 */
export function recordConfessional(state, speaker, line, eventKey = null, source = 'local') {
  if (speaker.isPlayer) {
    if (!state.playerStatCounters) state.playerStatCounters = { confessionals: 0, layLowDr: 0 };
    state.playerStatCounters.confessionals += 1;
    if (eventKey === 'lay_low') state.playerStatCounters.layLowDr += 1;
  }
  if (!state.confessionalLog) state.confessionalLog = [];
  state.confessionalLog.push({
    week: state.week,
    day: state.day,
    speakerId: speaker.id,
    speakerName: speaker.name,
    eventKey,
    source,
    archetype: speaker.personality?.name || null,
    line
  });
  if (state.confessionalLog.length > 20) {
    state.confessionalLog = state.confessionalLog.slice(-20);
  }
}

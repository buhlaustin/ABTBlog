import { escapeHtml, pickRandom } from './utils.js';
import { getThreatBand } from './threatBands.js';

/**
 * @param {import('./GameState.js').GameState} state
 * @param {number} [id]
 */
function nameFor(state, id) {
  if (!id) return null;
  return state.getContestant(id)?.name ?? 'Unknown';
}

/**
 * @param {import('./GameState.js').GameState} state
 */
function powerRound(state) {
  return state.doubleEvictionRound > 1 ? 2 : 1;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function compileWeekRecap(state) {
  const week = state.week;
  const events = (state.history || []).filter((e) => e.week === week);

  const hohWins = events
    .filter((e) => e.type === 'hoh')
    .map((e) => ({
      name: nameFor(state, e.hohId),
      round: e.powerRound ?? 1
    }));

  const nominationSets = events
    .filter((e) => e.type === 'nominations')
    .map((e) => ({
      hoh: nameFor(state, e.hoh),
      nominees: (e.nominees || []).map((id) => nameFor(state, id)).filter(Boolean),
      round: e.powerRound ?? 1
    }));

  const vetoWins = events
    .filter((e) => e.type === 'veto_win')
    .map((e) => ({
      name: nameFor(state, e.holderId),
      round: e.powerRound ?? 1
    }));

  const vetoMoves = events
    .filter((e) => e.type === 'veto_ceremony')
    .map((e) => ({
      holder: nameFor(state, e.holderId),
      used: Boolean(e.vetoUsed),
      saved: e.savedId ? nameFor(state, e.savedId) : null,
      replacement: e.replacementId ? nameFor(state, e.replacementId) : null,
      round: e.powerRound ?? 1
    }));

  if (!vetoMoves.length && state.lastVetoRecapWeek === week && state.lastVetoRecapText) {
    vetoMoves.push({
      holder: null,
      used: null,
      saved: null,
      replacement: null,
      round: 1,
      summary: state.lastVetoRecapText
    });
  }

  let evicted = events
    .filter((e) => e.type === 'eviction')
    .map((e) => ({
      name: nameFor(state, e.evictedId),
      round: e.powerRound ?? 1
    }));

  if (!evicted.length && state.evictedThisWeek) {
    evicted = [{
      name: nameFor(state, state.evictedThisWeek),
      round: powerRound(state)
    }];
  }

  const player = state.getPlayer();
  const active = state.getActiveContestants();
  const topThreats = active
    .filter((c) => !c.isPlayer)
    .sort((a, b) => b.threat - a.threat)
    .slice(0, 3)
    .map((c) => ({ name: c.name, threat: c.threat }));

  const playerThreat = player && !player.evicted ? player.threat : null;
  const playerBand = playerThreat != null ? getThreatBand(playerThreat).label : null;

  const twists = [];
  if (hohWins.length > 1 || evicted.length > 1) twists.push('Double eviction');
  if (state.mvpTwistWeekActive || state.mvpTwistScheduledWeek === week) twists.push('MVP twist');
  if (state.battleBackWeekActive || state.battleBackScheduledWeek === week) twists.push('Battle Back');

  return {
    week,
    remaining: active.length,
    hohWins,
    nominationSets,
    vetoWins,
    vetoMoves,
    evicted,
    twists,
    danger: {
      topThreats,
      playerThreat,
      playerBand,
      playerOnRadar: playerThreat != null && playerThreat >= 32
    },
    compiledAt: Date.now()
  };
}

/**
 * @param {import('./weekEndRecap.js').WeekRecap} recap
 */
function formatNomLine(set) {
  const label = set.round > 1 ? ` (R${set.round})` : '';
  const noms = set.nominees?.length ? set.nominees.join(' & ') : '—';
  return `<strong>${escapeHtml(set.hoh || 'HOH')}</strong>${label} → ${escapeHtml(noms)}`;
}

/**
 * @param {ReturnType<typeof compileWeekRecap>} recap
 */
export function buildWeekRecapFeedEntries(recap) {
  const lines = [];
  lines.push(
    `<span class="week-recap-label">Week ${recap.week} recap</span> · `
    + `<strong>${recap.remaining}</strong> houseguests remain.`
  );

  if (recap.hohWins.length) {
    const hohText = recap.hohWins
      .map((h) => (h.round > 1 ? `${h.name} (R${h.round})` : h.name))
      .join(' → ');
    lines.push(`HOH: ${escapeHtml(hohText)}`);
  }

  if (recap.nominationSets.length) {
    lines.push(`Nominations: ${recap.nominationSets.map(formatNomLine).join(' · ')}`);
  }

  if (recap.vetoWins.length) {
    const vetoText = recap.vetoWins
      .map((v) => (v.round > 1 ? `${v.name} (R${v.round})` : v.name))
      .join(', ');
    lines.push(`POV: ${escapeHtml(vetoText)}`);
  }

  if (recap.vetoMoves.length) {
    const vetoParts = recap.vetoMoves.map((v) => {
      if (v.summary) return escapeHtml(v.summary);
      if (!v.used) return `${v.holder || 'Holder'} held the veto`;
      let s = `${v.holder} used veto on ${v.saved || 'a nominee'}`;
      if (v.replacement) s += ` · ${v.replacement} replaced`;
      if (v.round > 1) s += ` (R${v.round})`;
      return escapeHtml(s);
    });
    lines.push(`Veto: ${vetoParts.join(' · ')}`);
  }

  if (recap.evicted.length) {
    const out = recap.evicted
      .map((e) => (e.round > 1 ? `${e.name} (R${e.round})` : e.name))
      .join(' & ');
    lines.push(`Evicted: <strong>${escapeHtml(out)}</strong>`);
  } else {
    lines.push('Evicted: <em>none recorded</em>');
  }

  const danger = recap.danger;
  if (danger?.topThreats?.length) {
    const names = danger.topThreats.map((t) => `${t.name} (${t.threat})`).join(', ');
    lines.push(`Next week radar: ${escapeHtml(names)}`);
  }
  if (danger?.playerBand && danger.playerThreat != null) {
    lines.push(
      `Your threat: <strong>${danger.playerThreat}</strong> (${escapeHtml(danger.playerBand)})`
      + (danger.playerOnRadar ? ' — on the nomination radar' : '')
    );
  }

  if (recap.twists?.length) {
    lines.push(`Twists: ${escapeHtml(recap.twists.join(' · '))}`);
  }

  return [{
    type: 'week-recap',
    text: lines.join('<br>'),
    weekRecap: recap
  }];
}

/**
 * @param {ReturnType<typeof compileWeekRecap>} recap
 */
export function getLocalWeekRecapVoiceover(recap) {
  const evictedNames = recap.evicted.map((e) => e.name).filter(Boolean);
  const hoh = recap.hohWins[recap.hohWins.length - 1]?.name || 'a new HOH';
  const danger = recap.danger?.topThreats?.[0]?.name;

  let line;
  if (evictedNames.length >= 2) {
    line = pickRandom([
      `What a week — ${hoh} ran the house, and ${evictedNames.join(' and ')} both went to the jury. The target list starts with ${danger || 'everyone'}.`,
      `Double eviction fallout: ${evictedNames.join(', ')} are out. ${recap.remaining} players left and ${danger || 'the threats'} are still hunting.`
    ]);
  } else if (evictedNames.length === 1) {
    line = pickRandom([
      `Week ${recap.week} closes with ${evictedNames[0]} evicted. ${hoh} held the keys; ${danger || 'the big threats'} eye next week.`,
      `${evictedNames[0]} is gone — ${recap.remaining} remain. Watch ${danger || 'whoever won POV'} and your own threat meter.`
    ]);
  } else {
    line = pickRandom([
      `Week ${recap.week} wraps with ${recap.remaining} still inside. ${hoh} was in charge — nominations and veto drama set up next week’s bloodbath.`,
      `No eviction stuck in the ledger, but ${hoh} shaped the board. ${danger || 'Pressure'} builds before Friday.`
    ]);
  }

  return {
    type: 'ai-host',
    text: `<strong>Recap:</strong> ${line}`,
    hostBeatKind: 'week_recap'
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function getWeekRecapBanner(state) {
  const recap = state.lastWeekRecap;
  if (!recap || recap.week !== state.week - 1) return '';
  const evicted = recap.evicted.map((e) => e.name).filter(Boolean).join(', ') || '—';
  const hoh = recap.hohWins.map((h) => h.name).filter(Boolean).pop() || '—';
  return `Week ${recap.week} recap · HOH ${hoh} · Out: ${evicted} · ${recap.remaining} left`;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildWeekRecapIntelSection(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const recap = state.lastWeekRecap;
  if (!recap) return null;

  /** @type {{ key: string, name: string, detail: string }[]} */
  const items = [{
    key: 'wr-week',
    name: `Week ${recap.week}`,
    detail: `${recap.remaining} HG remain · ${recap.evicted.length} evicted this week`
  }];

  if (recap.hohWins.length) {
    items.push({
      key: 'wr-hoh',
      name: 'HOH',
      detail: recap.hohWins.map((h) => h.name).filter(Boolean).join(' → ')
    });
  }

  if (recap.evicted.length) {
    items.push({
      key: 'wr-evict',
      name: 'Evicted',
      detail: recap.evicted.map((e) => e.name).filter(Boolean).join(', ')
    });
  }

  if (recap.danger?.topThreats?.length) {
    items.push({
      key: 'wr-danger',
      name: 'Next-week heat',
      detail: recap.danger.topThreats.map((t) => `${t.name} (${t.threat})`).join(' · ')
    });
  }

  if (recap.danger?.playerThreat != null) {
    items.push({
      key: 'wr-you',
      name: 'Your threat',
      detail: `${recap.danger.playerThreat} — ${recap.danger.playerBand || '—'}`
    });
  }

  const log = state.weekRecapLog || [];
  for (const past of log.slice(-3).reverse()) {
    if (past.week === recap.week) continue;
    const names = past.evicted.map((e) => e.name).filter(Boolean).join(', ') || '—';
    items.push({
      key: `wr-past-${past.week}`,
      name: `Week ${past.week}`,
      detail: `Out: ${names} · ${past.remaining} left`
    });
  }

  return {
    id: 'week-recap',
    title: 'Week recap',
    tone: 'neutral',
    items: items.slice(0, 8)
  };
}

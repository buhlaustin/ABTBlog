import { escapeHtml, JURY_START_HOUSE_COUNT, pickRandom } from './utils.js';
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
 * @param {number} week
 * @param {object[]} events
 */
function summarizePlayerWeek(state, week, events) {
  const player = state.getPlayer();
  if (!player || player.evicted) return null;

  const pid = player.id;
  /** @type {string[]} */
  const roles = [];

  if (events.some((e) => e.type === 'hoh' && e.hohId === pid)) roles.push('HOH');
  if (events.some((e) => e.type === 'veto_win' && e.holderId === pid)) roles.push('Won POV');
  if (events.some((e) => e.type === 'nominations' && (e.nominees || []).includes(pid))) {
    roles.push('On the block');
  }
  if (events.some((e) => e.type === 'veto_ceremony' && e.holderId === pid && e.vetoUsed)) {
    roles.push('Used veto');
  }
  const wasNominated = events.some(
    (e) => e.type === 'nominations' && (e.nominees || []).includes(pid)
  );
  const evictedSelf = events.some((e) => e.type === 'eviction' && e.evictedId === pid);
  if (wasNominated && !evictedSelf) {
    roles.push('Survived eviction');
  }

  let threatDelta = null;
  if (typeof state.playerThreatWeekStart === 'number') {
    threatDelta = player.threat - state.playerThreatWeekStart;
  }

  const confessionalsThisWeek = (state.confessionalLog || []).filter((r) => r.week === week).length;
  const yourConfessionals = (state.confessionalLog || []).filter(
    (r) => r.week === week && r.speakerId === pid
  ).length;

  let betrayalsReceived = 0;
  for (const c of state.contestants) {
    for (const b of c.betrayals || []) {
      if (b.byId !== pid) continue;
      if (b.week === week) betrayalsReceived += 1;
    }
  }

  return {
    roles,
    threatDelta,
    threatNow: player.threat,
    threatBand: getThreatBand(player.threat).label,
    confessionalsThisWeek,
    yourConfessionals,
    betrayalsReceived
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {number} week
 */
function summarizeJuryWeek(state, week) {
  const seated = state.contestants
    .filter((c) => c.isJuror && c.evictedWeek === week)
    .map((c) => c.name);
  const total = state.getJurors?.().length ?? state.contestants.filter((c) => c.isJuror).length;
  return {
    seated,
    total,
    juryPhase: state.getActiveContestants().length < JURY_START_HOUSE_COUNT
  };
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
      archetype: e.hohArchetype || null,
      round: e.powerRound ?? 1
    }));

  const nominationSets = events
    .filter((e) => e.type === 'nominations')
    .map((e) => ({
      hoh: nameFor(state, e.hoh),
      hohArchetype: e.hohArchetype || null,
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

  const playerWeek = summarizePlayerWeek(state, week, events);
  const jury = summarizeJuryWeek(state, week);

  const hohLeans = nominationSets
    .map((n) => n.hohArchetype)
    .filter(Boolean);

  return {
    week,
    remaining: active.length,
    hohWins,
    nominationSets,
    vetoWins,
    vetoMoves,
    evicted,
    twists,
    playerWeek,
    jury,
    hohLeans,
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
 * @param {ReturnType<typeof compileWeekRecap>['playerWeek']} digest
 */
export function formatPlayerWeekDigest(digest) {
  if (!digest) return '';
  const parts = [];
  if (digest.roles?.length) parts.push(digest.roles.join(' · '));
  if (digest.threatDelta != null && digest.threatDelta !== 0) {
    const sign = digest.threatDelta > 0 ? '+' : '−';
    parts.push(`threat ${sign}${Math.abs(digest.threatDelta)}`);
  } else if (digest.threatNow != null) {
    parts.push(`threat ${digest.threatNow} (${digest.threatBand})`);
  }
  if (digest.yourConfessionals) {
    parts.push(`${digest.yourConfessionals} DR line${digest.yourConfessionals === 1 ? '' : 's'}`);
  }
  if (digest.betrayalsReceived) {
    parts.push(`${digest.betrayalsReceived} betrayal${digest.betrayalsReceived === 1 ? '' : 's'} logged`);
  }
  return parts.join(' · ');
}

function formatNomLine(set) {
  const label = set.round > 1 ? ` (R${set.round})` : '';
  const arch = set.hohArchetype ? ` (${set.hohArchetype})` : '';
  const noms = set.nominees?.length ? set.nominees.join(' & ') : '—';
  return `<strong>${escapeHtml(set.hoh || 'HOH')}</strong>${escapeHtml(arch)}${label} → ${escapeHtml(noms)}`;
}

function formatHohLine(h) {
  const arch = h.archetype ? ` (${h.archetype})` : '';
  return h.round > 1 ? `${h.name}${arch} (R${h.round})` : `${h.name}${arch}`;
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
    const hohText = recap.hohWins.map(formatHohLine).join(' → ');
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

  if (recap.jury?.seated?.length) {
    lines.push(
      `Jury: <strong>${escapeHtml(recap.jury.seated.join(', '))}</strong> seated `
      + `(${recap.jury.total} total)`
    );
  } else if (recap.jury?.juryPhase) {
    lines.push(`Jury: ${recap.jury.total} seated — endgame jury phase`);
  }

  const digestLine = formatPlayerWeekDigest(recap.playerWeek);
  if (digestLine) {
    lines.push(`<span class="week-recap-you">Your week:</span> ${escapeHtml(digestLine)}`);
  }

  const danger = recap.danger;
  if (danger?.topThreats?.length) {
    const names = danger.topThreats.map((t) => `${t.name} (${t.threat})`).join(', ');
    lines.push(`Next week radar: ${escapeHtml(names)}`);
  }
  if (danger?.playerBand && danger.playerThreat != null && !digestLine?.includes('threat')) {
    lines.push(
      `Your threat: <strong>${danger.playerThreat}</strong> (${escapeHtml(danger.playerBand)})`
      + (danger.playerOnRadar ? ' — on the nomination radar' : '')
    );
  }

  if (recap.playerWeek?.confessionalsThisWeek > 0 && !recap.playerWeek?.yourConfessionals) {
    lines.push(`Diary room: ${recap.playerWeek.confessionalsThisWeek} confessional line(s) this week`);
  }

  if (recap.twists?.length) {
    lines.push(`Twists: ${escapeHtml(recap.twists.join(' · '))}`);
  }

  const entries = [{
    type: 'week-recap',
    text: lines.join('<br>'),
    weekRecap: recap
  }];

  if (recap.playerWeek?.roles?.length) {
    entries.push({
      type: 'week-recap-digest',
      text: `<span class="week-recap-label">Week ${recap.week} — your arc</span> · ${escapeHtml(recap.playerWeek.roles.join(' → '))}`
    });
  }

  return entries;
}

/**
 * @param {ReturnType<typeof compileWeekRecap>} recap
 */
export function getLocalWeekRecapVoiceover(recap) {
  const evictedNames = recap.evicted.map((e) => e.name).filter(Boolean);
  const hoh = recap.hohWins[recap.hohWins.length - 1]?.name || 'a new HOH';
  const danger = recap.danger?.topThreats?.[0]?.name;
  const you = recap.playerWeek;
  const youNote = you?.roles?.length ? `You played: ${you.roles.join(', ')}.` : '';
  const juryNote = recap.jury?.seated?.length
    ? `${recap.jury.seated.join(' and ')} join the jury. `
    : '';

  let line;
  if (evictedNames.length >= 2) {
    line = pickRandom([
      `What a week — ${hoh} ran the house, and ${evictedNames.join(' and ')} both went to the jury. ${juryNote}${youNote} The target list starts with ${danger || 'everyone'}.`,
      `Double eviction fallout: ${evictedNames.join(', ')} are out. ${recap.remaining} players left. ${youNote}`
    ]);
  } else if (evictedNames.length === 1) {
    line = pickRandom([
      `Week ${recap.week} closes with ${evictedNames[0]} evicted. ${juryNote}${hoh} held the keys. ${youNote}`,
      `${evictedNames[0]} is gone — ${recap.remaining} remain. ${youNote} Watch ${danger || 'the threats'} next week.`
    ]);
  } else {
    line = pickRandom([
      `Week ${recap.week} wraps with ${recap.remaining} still inside. ${youNote} ${hoh} shaped the board before Friday returns.`,
      `The ledger is messy but everyone survived eviction night. ${youNote} Pressure builds.`
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
  const you = formatPlayerWeekDigest(recap.playerWeek);
  const youBit = you ? ` · You: ${you.split(' · ')[0]}` : '';
  return `Week ${recap.week} recap · HOH ${hoh} · Out: ${evicted} · ${recap.remaining} left${youBit}`;
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
    detail: `${recap.remaining} HG remain · ${recap.evicted.length} evicted`
  }];

  if (recap.hohWins.length) {
    items.push({
      key: 'wr-hoh',
      name: 'HOH',
      detail: recap.hohWins.map((h) => {
        const arch = h.archetype ? ` (${h.archetype})` : '';
        return `${h.name}${arch}`;
      }).filter(Boolean).join(' → ')
    });
  }

  if (recap.nominationSets.length) {
    items.push({
      key: 'wr-noms',
      name: 'Blocks',
      detail: recap.nominationSets
        .map((n) => `${n.nominees.join(' & ')}`)
        .join(' · ')
    });
  }

  if (recap.vetoMoves.length) {
    const vetoDetail = recap.vetoMoves.map((v) => {
      if (v.summary) return v.summary.slice(0, 72);
      if (!v.used) return 'Veto unused';
      return `Saved ${v.saved || '—'}${v.replacement ? ` → ${v.replacement}` : ''}`;
    }).join(' · ');
    items.push({ key: 'wr-veto', name: 'Veto', detail: vetoDetail });
  }

  if (recap.evicted.length) {
    items.push({
      key: 'wr-evict',
      name: 'Evicted',
      detail: recap.evicted.map((e) => e.name).filter(Boolean).join(', ')
    });
  }

  if (recap.jury?.seated?.length) {
    items.push({
      key: 'wr-jury',
      name: 'New jurors',
      detail: `${recap.jury.seated.join(', ')} (${recap.jury.total} total)`
    });
  }

  const digest = formatPlayerWeekDigest(recap.playerWeek);
  if (digest) {
    items.push({ key: 'wr-you', name: 'Your week', detail: digest });
  }

  if (recap.danger?.topThreats?.length) {
    items.push({
      key: 'wr-danger',
      name: 'Next-week heat',
      detail: recap.danger.topThreats.map((t) => `${t.name} (${t.threat})`).join(' · ')
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
    items: items.slice(0, 10)
  };
}

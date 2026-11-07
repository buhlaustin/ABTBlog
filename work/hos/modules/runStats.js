import { escapeHtml } from './utils.js';
import { getCastPreset } from './castPresets.js';

export const PROFILE_VERSION = 1;

/** @typedef {import('./GameState.js').GameState} GameState */

/**
 * @param {GameState} state
 * @param {{ live?: boolean }} [opts]
 */
export function buildRunMetrics(state, { live = false } = {}) {
  const player = state.getPlayer();
  if (!player) {
    return null;
  }
  const pid = player.id;
  const history = state.history || [];

  let hohWins = 0;
  let vetoWins = 0;
  const nomWeeks = new Set();

  for (const e of history) {
    if (e.type === 'hoh' && e.hohId === pid) hohWins += 1;
    if (e.type === 'veto_win' && e.holderId === pid) vetoWins += 1;
    if (e.type === 'nominations' && (e.nominees || []).includes(pid)) {
      nomWeeks.add(e.week);
    }
  }

  let evictionVotesSurvived = 0;
  for (const week of nomWeeks) {
    const evictedSelf = history.some(
      (e) => e.type === 'eviction' && e.week === week && e.evictedId === pid
    );
    if (!evictedSelf) evictionVotesSurvived += 1;
  }

  const promises = player.promises || [];
  const promisesKept = promises.filter((p) => p.kept === true).length;
  const promisesBroken = promises.filter((p) => p.kept === false).length;
  const promisesOpen = promises.filter((p) => p.kept === null).length;

  const betrayalsAgainst = (player.betrayals || []).length;
  let betrayalsByPlayer = 0;
  for (const c of state.contestants) {
    if (c.id === pid) continue;
    betrayalsByPlayer += (c.betrayals || []).filter((b) => b.byId === pid).length;
  }

  const confessionalCount =
    state.playerStatCounters?.confessionals ??
    (state.confessionalLog || []).filter((e) => e.speakerId === pid).length;
  const layLowDr = state.playerStatCounters?.layLowDr ?? 0;
  const allianceCount = player.allianceIds?.length || 0;
  const won = !live && Boolean(state.winner?.isPlayer);
  const wasJuror = Boolean(player.isJuror);
  const reachedFinale =
    won ||
    (state.inFinale && !player.evicted) ||
    (!player.evicted && state.getActiveContestants().length <= 3);
  const twistsAll =
    state.doubleEvictionEnabled && state.battleBackEnabled && state.mvpTwistEnabled;

  return {
    castPreset: state.castPreset || 'standard',
    castLabel: getCastPreset(state.castPreset).label,
    difficulty: state.difficulty,
    week: state.week,
    won,
    wasJuror,
    reachedFinale,
    playerWasRookie: Boolean(player.isRookie),
    timesNominated: nomWeeks.size,
    evictionVotesSurvived,
    hohWins,
    vetoWins,
    competitionWins: hohWins + vetoWins,
    promisesMade: promises.length,
    promisesKept,
    promisesBroken,
    promisesOpen,
    betrayalsAgainst,
    betrayalsByPlayer,
    alliancesJoined: allianceCount,
    confessionalCount,
    layLowDr,
    peakThreat: Math.round(state.playerPeakThreat ?? player.threat),
    finalThreat: Math.round(player.threat),
    finalSocial: player.social,
    finalCompetition: player.competition,
    evictedWeek: player.evictedWeek,
    doubleEvictionEnabled: Boolean(state.doubleEvictionEnabled),
    battleBackEnabled: Boolean(state.battleBackEnabled),
    mvpTwistEnabled: Boolean(state.mvpTwistEnabled),
    twistsAll
  };
}

/**
 * @param {GameState} state
 */
export function compilePlayerRunStats(state) {
  const m = buildRunMetrics(state);
  if (!m) return emptyRunStats();
  return {
    version: 1,
    endedAt: Date.now(),
    ...m
  };
}

/** @param {GameState} state */
export function compileLiveRunStats(state) {
  const m = buildRunMetrics(state, { live: true });
  if (!m) return null;
  return { ...m, live: true };
}

function emptyRunStats() {
  return {
    version: 1,
    endedAt: Date.now(),
    castPreset: 'standard',
    castLabel: 'Standard',
    difficulty: 'normal',
    week: 0,
    won: false,
    wasJuror: false,
    reachedFinale: false,
    playerWasRookie: false,
    timesNominated: 0,
    evictionVotesSurvived: 0,
    hohWins: 0,
    vetoWins: 0,
    competitionWins: 0,
    promisesMade: 0,
    promisesKept: 0,
    promisesBroken: 0,
    promisesOpen: 0,
    betrayalsAgainst: 0,
    betrayalsByPlayer: 0,
    alliancesJoined: 0,
    confessionalCount: 0,
    layLowDr: 0,
    peakThreat: 0,
    finalThreat: 0,
    twistsAll: false,
    finalSocial: 0,
    finalCompetition: 0,
    evictedWeek: null,
    doubleEvictionEnabled: false,
    battleBackEnabled: false,
    mvpTwistEnabled: false
  };
}

export const ACHIEVEMENT_DEFS = [
  {
    id: 'first_win',
    title: 'Champion',
    description: 'Win your first season.',
    test: (r) => r.won
  },
  {
    id: 'triple_hoh',
    title: 'Reigning Monarch',
    description: 'Win Head of Household three times in one season.',
    test: (r) => r.hohWins >= 3
  },
  {
    id: 'veto_king',
    title: 'Veto King',
    description: 'Win the Power of Veto twice in one season.',
    test: (r) => r.vetoWins >= 2
  },
  {
    id: 'block_beast',
    title: 'Block Beast',
    description: 'Survive three eviction votes while on the block.',
    test: (r) => r.evictionVotesSurvived >= 3
  },
  {
    id: 'invisible',
    title: 'Invisible',
    description: 'Win without ever being nominated.',
    test: (r) => r.won && r.timesNominated === 0
  },
  {
    id: 'big_target',
    title: 'Big Target',
    description: 'Win with threat at 70 or higher.',
    test: (r) => r.won && r.finalThreat >= 70
  },
  {
    id: 'word_is_bond',
    title: 'Word Is Bond',
    description: 'Win after honoring every deal (3+ deals, none broken).',
    test: (r) =>
      r.won && r.promisesMade >= 3 && r.promisesBroken === 0 && r.promisesKept >= 3
  },
  {
    id: 'snake',
    title: 'Snake',
    description: 'Break three promises in a single season.',
    test: (r) => r.promisesBroken >= 3
  },
  {
    id: 'bitter_juror',
    title: 'Bitter Juror',
    description: 'Reach the jury house.',
    test: (r) => r.wasJuror
  },
  {
    id: 'final_chair',
    title: 'Final Chair',
    description: 'Reach the finale.',
    test: (r) => r.reachedFinale
  },
  {
    id: 'crowd_control',
    title: 'Crowd Control',
    description: 'Win a Mega cast (24) season.',
    test: (r) => r.won && r.castPreset === 'megacast'
  },
  {
    id: 'rookie_revolution',
    title: 'Rookie Revolution',
    description: 'Win the All-Stars season as the rookie.',
    test: (r) => r.won && r.castPreset === 'all_stars' && r.playerWasRookie
  },
  {
    id: 'comp_beast',
    title: 'Comp Beast',
    description: 'Win four or more competitions in one season.',
    test: (r) => r.competitionWins >= 4
  },
  {
    id: 'dr_machine',
    title: 'Confessional King',
    description: 'Record ten confessionals in one season.',
    test: (r) => r.confessionalCount >= 10
  },
  {
    id: 'hard_mode_hero',
    title: 'Hard Mode Hero',
    description: 'Win on Hard difficulty.',
    test: (r) => r.won && r.difficulty === 'hard'
  },
  {
    id: 'easy_does_it',
    title: 'Cruise Control',
    description: 'Win on Easy difficulty.',
    test: (r) => r.won && r.difficulty === 'easy'
  },
  {
    id: 'betrayal_survivor',
    title: 'Forgive & Forget',
    description: 'Win after suffering two betrayals.',
    test: (r) => r.won && r.betrayalsAgainst >= 2
  },
  {
    id: 'twist_master',
    title: 'Twist Master',
    description: 'Win with every season twist enabled.',
    test: (r) => r.won && r.twistsAll
  },
  {
    id: 'jury_sprint_champ',
    title: 'Sprint Winner',
    description: 'Win a Jury Sprint cast.',
    test: (r) => r.won && r.castPreset === 'jury_sprint'
  },
  {
    id: 'brains_trust',
    title: 'Brains Trust',
    description: 'Win a Brains season.',
    test: (r) => r.won && r.castPreset === 'brains'
  },
  {
    id: 'peak_monster',
    title: 'Peak Monster',
    description: 'Hit 85 threat and still win.',
    test: (r) => r.won && r.peakThreat >= 85
  },
  {
    id: 'ghost_mode',
    title: 'Ghost Mode',
    description: 'Five lay-low confessionals in one season.',
    test: (r) => r.layLowDr >= 5
  }
];

/** Career milestones (profile-level). */
export const CAREER_ACHIEVEMENT_DEFS = [
  {
    id: 'mainstay',
    title: 'Mainstay',
    description: 'Finish five seasons.',
    test: (p) => (p.gamesPlayed || 0) >= 5
  },
  {
    id: 'dynasty',
    title: 'Dynasty',
    description: 'Win three seasons in a row.',
    test: (p) => (p.currentWinStreak || 0) >= 3
  },
  {
    id: 'hall_of_fame',
    title: 'Hall of Fame',
    description: 'Unlock fifteen achievements (any type).',
    test: (p) => Object.keys(p.achievements || {}).length >= 15
  },
  {
    id: 'comp_collector',
    title: 'Comp Collector',
    description: 'Win twenty HOH or POV competitions across your career.',
    test: (p) => (p.totalCompWins || 0) >= 20
  }
];

/**
 * @param {ReturnType<typeof compilePlayerRunStats>} run
 * @param {object} profile
 */
export function evaluateNewAchievements(run, profile) {
  const existing = profile?.achievements || {};
  const unlocked = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (!def.test(run)) continue;
    if (existing[def.id]) continue;
    unlocked.push(def);
  }
  return unlocked;
}

/**
 * @param {object} profile
 */
export function evaluateNewCareerAchievements(profile) {
  const existing = profile?.achievements || {};
  const unlocked = [];
  for (const def of CAREER_ACHIEVEMENT_DEFS) {
    if (!def.test(profile)) continue;
    if (existing[def.id]) continue;
    unlocked.push(def);
  }
  return unlocked;
}

/**
 * @param {ReturnType<typeof compilePlayerRunStats>} run
 * @param {object|null} profile
 * @returns {{ id: string, title: string, detail: string, done: boolean }[]}
 */
export function getSeasonAchievementProgress(run, profile = null) {
  const lines = [];
  const unlocked = profile?.achievements || {};
  const track = [
    { id: 'triple_hoh', title: 'Reigning Monarch', detail: () => `${run.hohWins}/3 HOH`, done: run.hohWins >= 3 },
    { id: 'veto_king', title: 'Veto King', detail: () => `${run.vetoWins}/2 POV`, done: run.vetoWins >= 2 },
    { id: 'block_beast', title: 'Block Beast', detail: () => `${run.evictionVotesSurvived}/3 survives`, done: run.evictionVotesSurvived >= 3 },
    { id: 'dr_machine', title: 'Confessional King', detail: () => `${run.confessionalCount}/10 DRs`, done: run.confessionalCount >= 10 },
    { id: 'ghost_mode', title: 'Ghost Mode', detail: () => `${run.layLowDr}/5 lay-low DRs`, done: run.layLowDr >= 5 },
    { id: 'comp_beast', title: 'Comp Beast', detail: () => `${run.competitionWins}/4 comps`, done: run.competitionWins >= 4 }
  ];
  for (const row of track) {
    if (unlocked[row.id]) continue;
    lines.push({
      id: row.id,
      title: row.title,
      detail: row.detail(),
      done: row.done
    });
  }
  return lines;
}

/**
 * @param {ReturnType<typeof compileLiveRunStats>} live
 */
export function getRunStatsBanner(live) {
  if (!live) return '';
  const parts = [`HOH ${live.hohWins}`, `POV ${live.vetoWins}`, `noms ${live.timesNominated}`];
  parts.push(`peak threat ${live.peakThreat}`);
  return `Run · ${parts.join(' · ')}`;
}

/**
 * Near-miss achievements at season end.
 * @param {ReturnType<typeof compilePlayerRunStats>} run
 * @param {object} profile
 */
export function getNearMissAchievements(run, profile) {
  const existing = profile?.achievements || {};
  const misses = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (existing[def.id] || def.test(run)) continue;
    const near = isNearMiss(def, run);
    if (near) misses.push({ ...def, near });
  }
  return misses.slice(0, 4);
}

function isNearMiss(def, run) {
  switch (def.id) {
    case 'triple_hoh':
      return run.hohWins === 2 ? 'one HOH short' : false;
    case 'veto_king':
      return run.vetoWins === 1 ? 'one POV short' : false;
    case 'block_beast':
      return run.evictionVotesSurvived === 2 ? 'one vote shy' : false;
    case 'comp_beast':
      return run.competitionWins === 3 ? 'one comp short' : false;
    case 'dr_machine':
      return run.confessionalCount >= 7 ? `${10 - run.confessionalCount} DRs short` : false;
    case 'ghost_mode':
      return run.layLowDr >= 3 ? `${5 - run.layLowDr} lay-low DRs short` : false;
    case 'big_target':
      return run.won && run.finalThreat >= 60 && run.finalThreat < 70 ? 'threat under 70' : false;
    case 'peak_monster':
      return run.won && run.peakThreat >= 75 && run.peakThreat < 85 ? 'peak under 85' : false;
    default:
      return false;
  }
}

/**
 * @param {object|null} profile
 */
export function renderCareerSetupPanelHtml(profile) {
  if (!profile?.gamesPlayed) {
    return '<p class="career-panel-empty">Play a full season to start your career log.</p>';
  }
  let html = '<ul class="career-panel-stats">';
  html += `<li>${profile.wins} wins · ${profile.gamesPlayed} seasons · ${profile.totalWeeks || 0} weeks played</li>`;
  html += `<li>${profile.totalHohWins || 0} career HOH · ${profile.totalVetoWins || 0} career POV</li>`;
  html += '</ul>';
  const ids = Object.keys(profile.achievements || {});
  if (ids.length) {
    html += '<p class="career-panel-ach-title">Unlocked badges</p><ul class="career-panel-ach">';
    for (const id of ids.slice(0, 8)) {
      const meta = profile.achievements[id];
      const def =
        ACHIEVEMENT_DEFS.find((d) => d.id === id) ||
        CAREER_ACHIEVEMENT_DEFS.find((d) => d.id === id);
      html += `<li>★ ${escapeHtml(meta.title || def?.title || id)}</li>`;
    }
    if (ids.length > 8) html += `<li>+${ids.length - 8} more</li>`;
    html += '</ul>';
  }
  if (profile.lastRun) {
    const lr = profile.lastRun;
    html += `<p class="career-panel-last">Last season: ${lr.won ? 'Win' : 'Loss'} · Wk ${lr.week} · ${lr.hohWins} HOH / ${lr.vetoWins} POV</p>`;
  }
  return html;
}

/**
 * @param {object} profile
 * @param {ReturnType<typeof compilePlayerRunStats>} run
 * @param {typeof ACHIEVEMENT_DEFS[number][]} newAchievements
 */
export function mergeRunIntoProfile(profile, run, newAchievements = []) {
  const base = profile || defaultProfile();
  base.gamesPlayed = (base.gamesPlayed || 0) + 1;
  base.wins = (base.wins || 0) + (run.won ? 1 : 0);
  base.totalWeeks = (base.totalWeeks || 0) + run.week;
  base.totalNominations = (base.totalNominations || 0) + run.timesNominated;
  base.totalHohWins = (base.totalHohWins || 0) + run.hohWins;
  base.totalVetoWins = (base.totalVetoWins || 0) + run.vetoWins;
  base.totalCompWins = (base.totalCompWins || 0) + run.competitionWins;
  base.totalConfessionals = (base.totalConfessionals || 0) + run.confessionalCount;
  base.lastRun = { ...run, endedAt: run.endedAt };

  if (run.won) {
    base.currentWinStreak = (base.currentWinStreak || 0) + 1;
    base.bestWinStreak = Math.max(base.bestWinStreak || 0, base.currentWinStreak);
  } else {
    base.currentWinStreak = 0;
  }

  if (!base.achievements) base.achievements = {};
  const prior = { ...base.achievements };
  const now = new Date(run.endedAt).toISOString();
  for (const def of newAchievements) {
    base.achievements[def.id] = {
      title: def.title,
      unlockedAt: now,
      times: 1
    };
  }
  for (const def of ACHIEVEMENT_DEFS) {
    if (!def.test(run)) continue;
    if (prior[def.id]) {
      base.achievements[def.id].times = (prior[def.id].times || 1) + 1;
    }
  }

  return base;
}

export function defaultProfile() {
  return {
    version: PROFILE_VERSION,
    gamesPlayed: 0,
    wins: 0,
    totalWeeks: 0,
    totalNominations: 0,
    totalHohWins: 0,
    totalVetoWins: 0,
    totalCompWins: 0,
    totalConfessionals: 0,
    bestWinStreak: 0,
    currentWinStreak: 0,
    achievements: {},
    lastRun: null
  };
}

/**
 * @param {ReturnType<typeof compilePlayerRunStats>} run
 * @param {object} profile
 * @param {typeof ACHIEVEMENT_DEFS[number][]} newAchievements
 */
export function renderRunStatsEndHtml(run, profile, newAchievements = [], previousLastRun = null) {
  const resultLabel = run.won ? 'Victory' : run.wasJuror ? 'Jury exit' : run.evictedWeek ? `Evicted Week ${run.evictedWeek}` : 'Season over';
  let html = '<div class="run-stats-panel">';
  html += '<h3>This season</h3>';
  html += '<ul class="run-stats-list">';
  html += `<li><span class="run-stat-label">Result</span> ${escapeHtml(resultLabel)} · ${escapeHtml(run.castLabel)} · ${escapeHtml(run.difficulty)}</li>`;
  html += `<li><span class="run-stat-label">Weeks</span> ${run.week}</li>`;
  html += `<li><span class="run-stat-label">Nominations</span> ${run.timesNominated} · survived ${run.evictionVotesSurvived} vote${run.evictionVotesSurvived === 1 ? '' : 's'}</li>`;
  html += `<li><span class="run-stat-label">HOH / POV</span> ${run.hohWins} / ${run.vetoWins}</li>`;
  html += `<li><span class="run-stat-label">Deals</span> ${run.promisesKept} kept · ${run.promisesBroken} broken · ${run.promisesOpen} open</li>`;
  html += `<li><span class="run-stat-label">Threat</span> ${run.finalThreat} (peak ${run.peakThreat ?? run.finalThreat}) · DRs ${run.confessionalCount}</li>`;
  if (run.layLowDr > 0) {
    html += `<li><span class="run-stat-label">Lay-low DRs</span> ${run.layLowDr}</li>`;
  }
  if (run.betrayalsAgainst > 0) {
    html += `<li><span class="run-stat-label">Betrayals suffered</span> ${run.betrayalsAgainst}</li>`;
  }
  html += '</ul>';

  const near = getNearMissAchievements(run, profile);
  if (near.length) {
    html += '<p class="ach-near-miss">Almost unlocked:</p><ul class="run-stats-list ach-near-list">';
    for (const n of near) {
      html += `<li>${escapeHtml(n.title)} — ${escapeHtml(n.near)}</li>`;
    }
    html += '</ul>';
  }

  if (previousLastRun && profile?.gamesPlayed > 1) {
    const prev = previousLastRun;
    html += '<h3>Vs last season</h3><ul class="run-stats-list">';
    const compDelta = run.competitionWins - (prev.competitionWins || 0);
    const nomDelta = run.timesNominated - (prev.timesNominated || 0);
    html += `<li><span class="run-stat-label">Comps</span> ${formatDelta(compDelta)}</li>`;
    html += `<li><span class="run-stat-label">Nominations</span> ${formatDelta(nomDelta, true)}</li>`;
    html += '</ul>';
  }

  if (profile && profile.gamesPlayed > 0) {
    html += '<h3>Career</h3>';
    html += '<ul class="run-stats-list run-stats-career">';
    html += `<li><span class="run-stat-label">Record</span> ${profile.wins} win${profile.wins === 1 ? '' : 's'} / ${profile.gamesPlayed} season${profile.gamesPlayed === 1 ? '' : 's'}</li>`;
    html += `<li><span class="run-stat-label">Totals</span> ${profile.totalHohWins} HOH · ${profile.totalVetoWins} POV · ${profile.totalNominations} noms</li>`;
    if (profile.bestWinStreak > 1) {
      html += `<li><span class="run-stat-label">Win streak</span> Best ${profile.bestWinStreak}</li>`;
    }
    html += '</ul>';
  }

  const totalDefs = ACHIEVEMENT_DEFS.length + CAREER_ACHIEVEMENT_DEFS.length;
  const achCount = Object.keys(profile?.achievements || {}).length;
  html += `<h3>Achievements <span class="ach-count">${achCount}/${totalDefs}</span></h3>`;

  if (newAchievements.length) {
    html += '<p class="ach-new-intro">Unlocked this season:</p>';
    html += '<ul class="achievement-list achievement-list-new">';
    for (const a of newAchievements) {
      html += `<li class="achievement-item achievement-unlocked" title="${escapeHtml(a.description)}">
        <span class="ach-badge">★</span>
        <span class="ach-title">${escapeHtml(a.title)}</span>
        <span class="ach-desc">${escapeHtml(a.description)}</span>
      </li>`;
    }
    html += '</ul>';
  }

  html += '<details class="achievement-catalog" open><summary>Season achievements</summary><ul class="achievement-list">';
  for (const def of ACHIEVEMENT_DEFS) {
    html += renderAchievementCatalogItem(def, profile);
  }
  html += '</ul></details>';
  html += '<details class="achievement-catalog"><summary>Career milestones</summary><ul class="achievement-list">';
  for (const def of CAREER_ACHIEVEMENT_DEFS) {
    html += renderAchievementCatalogItem(def, profile);
  }
  html += '</ul></details></div>';
  return html;
}

function renderAchievementCatalogItem(def, profile) {
  const have = profile?.achievements?.[def.id];
  const cls = have ? 'achievement-unlocked' : 'achievement-locked';
  const badge = have ? '★' : '○';
  return `<li class="achievement-item ${cls}" title="${escapeHtml(def.description)}">
      <span class="ach-badge">${badge}</span>
      <span class="ach-title">${escapeHtml(def.title)}</span>
      <span class="ach-desc">${escapeHtml(def.description)}</span>
    </li>`;
}

function formatDelta(n, invertGood = false) {
  if (n === 0) return 'same';
  const good = invertGood ? n < 0 : n > 0;
  const sign = n > 0 ? '+' : '';
  return `<span class="${good ? 'delta-good' : 'delta-bad'}">${sign}${n}</span>`;
}

/**
 * @param {object|null} profile
 */
export function formatCareerSetupHint(profile) {
  if (!profile || !profile.gamesPlayed) {
    return 'No career stats yet — finish a season to unlock achievements.';
  }
  const ach = Object.keys(profile.achievements || {}).length;
  const total = ACHIEVEMENT_DEFS.length + CAREER_ACHIEVEMENT_DEFS.length;
  return `Career: ${profile.wins} win${profile.wins === 1 ? '' : 's'} · ${profile.gamesPlayed} season${profile.gamesPlayed === 1 ? '' : 's'} · ${ach}/${total} badges`;
}

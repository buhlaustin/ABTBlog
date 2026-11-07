import { escapeHtml } from './utils.js';
import { getCastPreset } from './castPresets.js';

export const PROFILE_VERSION = 1;

/** @typedef {import('./GameState.js').GameState} GameState */

/**
 * @param {GameState} state
 */
export function compilePlayerRunStats(state) {
  const player = state.getPlayer();
  if (!player) {
    return emptyRunStats();
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

  const confessionalCount = (state.confessionalLog || []).filter((e) => e.speakerId === pid).length;
  const allianceCount = player.allianceIds?.length || 0;
  const won = Boolean(state.winner?.isPlayer);
  const wasJuror = Boolean(player.isJuror);
  const reachedFinale = won || (state.inFinale && !player.evicted) || (
    !player.evicted && state.getActiveContestants().length <= 3
  );

  return {
    version: 1,
    endedAt: Date.now(),
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
    finalThreat: Math.round(player.threat),
    finalSocial: player.social,
    finalCompetition: player.competition,
    evictedWeek: player.evictedWeek,
    doubleEvictionEnabled: Boolean(state.doubleEvictionEnabled),
    battleBackEnabled: Boolean(state.battleBackEnabled),
    mvpTwistEnabled: Boolean(state.mvpTwistEnabled)
  };
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
    finalThreat: 0,
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
export function renderRunStatsEndHtml(run, profile, newAchievements = []) {
  const resultLabel = run.won ? 'Victory' : run.wasJuror ? 'Jury exit' : run.evictedWeek ? `Evicted Week ${run.evictedWeek}` : 'Season over';
  let html = '<div class="run-stats-panel">';
  html += '<h3>This season</h3>';
  html += '<ul class="run-stats-list">';
  html += `<li><span class="run-stat-label">Result</span> ${escapeHtml(resultLabel)} · ${escapeHtml(run.castLabel)} · ${escapeHtml(run.difficulty)}</li>`;
  html += `<li><span class="run-stat-label">Weeks</span> ${run.week}</li>`;
  html += `<li><span class="run-stat-label">Nominations</span> ${run.timesNominated} · survived ${run.evictionVotesSurvived} vote${run.evictionVotesSurvived === 1 ? '' : 's'}</li>`;
  html += `<li><span class="run-stat-label">HOH / POV</span> ${run.hohWins} / ${run.vetoWins}</li>`;
  html += `<li><span class="run-stat-label">Deals</span> ${run.promisesKept} kept · ${run.promisesBroken} broken · ${run.promisesOpen} open</li>`;
  html += `<li><span class="run-stat-label">Threat</span> ${run.finalThreat} · DRs ${run.confessionalCount}</li>`;
  html += '</ul>';

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

  const achCount = Object.keys(profile?.achievements || {}).length;
  html += `<h3>Achievements <span class="ach-count">${achCount}/${ACHIEVEMENT_DEFS.length}</span></h3>`;

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

  html += '<details class="achievement-catalog"><summary>All achievements</summary><ul class="achievement-list">';
  for (const def of ACHIEVEMENT_DEFS) {
    const have = profile?.achievements?.[def.id];
    const cls = have ? 'achievement-unlocked' : 'achievement-locked';
    const badge = have ? '★' : '○';
    html += `<li class="achievement-item ${cls}" title="${escapeHtml(def.description)}">
      <span class="ach-badge">${badge}</span>
      <span class="ach-title">${escapeHtml(def.title)}</span>
      <span class="ach-desc">${escapeHtml(def.description)}</span>
    </li>`;
  }
  html += '</ul></details></div>';
  return html;
}

/**
 * @param {object|null} profile
 */
export function formatCareerSetupHint(profile) {
  if (!profile || !profile.gamesPlayed) {
    return 'No career stats yet — finish a season to unlock achievements.';
  }
  const ach = Object.keys(profile.achievements || {}).length;
  return `Career: ${profile.wins} win${profile.wins === 1 ? '' : 's'} · ${profile.gamesPlayed} season${profile.gamesPlayed === 1 ? '' : 's'} · ${ach} achievement${ach === 1 ? '' : 's'}`;
}

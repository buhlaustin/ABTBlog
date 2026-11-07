import { ACHIEVEMENT_DEFS, CAREER_ACHIEVEMENT_DEFS, compileLiveRunStats, getSeasonAchievementProgress } from './runStats.js';
import { StorageManager } from './Storage.js';

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildRunStatsIntelSection(state) {
  let profileSafe = null;
  try {
    profileSafe = StorageManager.loadProfile();
  } catch {
    profileSafe = null;
  }

  if (!profileSafe?.gamesPlayed && !state?.getPlayer?.()) {
    return null;
  }

  const items = [];
  const totalBadges = ACHIEVEMENT_DEFS.length + CAREER_ACHIEVEMENT_DEFS.length;

  if (profileSafe?.gamesPlayed) {
    items.push({
      key: 'career-record',
      name: 'Career',
      detail: `${profileSafe.wins}/${profileSafe.gamesPlayed} wins`
    });
    items.push({
      key: 'career-comps',
      name: 'All-time comps',
      detail: `${profileSafe.totalHohWins || 0} HOH · ${profileSafe.totalVetoWins || 0} POV`
    });
    const ach = Object.keys(profileSafe.achievements || {}).length;
    items.push({
      key: 'career-ach',
      name: 'Achievements',
      detail: `${ach}/${totalBadges} unlocked`
    });
    if (profileSafe.currentWinStreak > 1) {
      items.push({
        key: 'career-streak',
        name: 'Win streak',
        detail: `${profileSafe.currentWinStreak} active`
      });
    }
  }

  const live = state ? compileLiveRunStats(state) : null;
  const player = state?.getPlayer?.();
  if (live && player && !player.evicted) {
    items.push({
      key: 'run-comps',
      name: 'This run — comps',
      detail: `${live.hohWins} HOH · ${live.vetoWins} POV`
    });
    items.push({
      key: 'run-noms',
      name: 'Nominations',
      detail: `${live.timesNominated} · ${live.evictionVotesSurvived} survived`
    });
    items.push({
      key: 'run-threat',
      name: 'Threat',
      detail: `${live.finalThreat} (peak ${live.peakThreat})`
    });
    items.push({
      key: 'run-dr',
      name: 'Confessionals',
      detail: `${live.confessionalCount} DRs`
    });
    if (live.promisesBroken > 0) {
      items.push({
        key: 'run-broken',
        name: 'Broken deals',
        detail: `${live.promisesBroken}`
      });
    }

    const progress = getSeasonAchievementProgress(live, profileSafe).filter((p) => !p.done).slice(0, 3);
    for (const p of progress) {
      items.push({
        key: `ach-prog-${p.id}`,
        name: `→ ${p.title}`,
        detail: p.detail
      });
    }
  }

  if (!items.length) return null;

  return {
    title: 'Career & run',
    tone: 'neutral',
    items
  };
}

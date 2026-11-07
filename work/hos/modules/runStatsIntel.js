import { ACHIEVEMENT_DEFS } from './runStats.js';
import { escapeHtml } from './utils.js';
import { StorageManager } from './Storage.js';

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildRunStatsIntelSection(state) {
  const profile = StorageManager.loadProfile();
  if (!profile?.gamesPlayed && !state) {
    return null;
  }

  const items = [];
  if (profile?.gamesPlayed) {
    items.push({
      key: 'career-record',
      name: 'Career',
      detail: `${profile.wins}/${profile.gamesPlayed} wins`
    });
    items.push({
      key: 'career-comps',
      name: 'All-time comps',
      detail: `${profile.totalHohWins || 0} HOH · ${profile.totalVetoWins || 0} POV`
    });
    const ach = Object.keys(profile.achievements || {}).length;
    items.push({
      key: 'career-ach',
      name: 'Achievements',
      detail: `${ach}/${ACHIEVEMENT_DEFS.length} unlocked`
    });
  }

  const player = state?.getPlayer?.();
  if (player && state.week >= 1) {
    const promisesBroken = (player.promises || []).filter((p) => p.kept === false).length;
    const noms = countPlayerNominations(state, player.id);
    items.push({
      key: 'run-noms',
      name: 'This run — noms',
      detail: `${noms} so far`
    });
    items.push({
      key: 'run-threat',
      name: 'Threat',
      detail: `${Math.round(player.threat)}`
    });
    if (promisesBroken > 0) {
      items.push({
        key: 'run-broken',
        name: 'Broken deals',
        detail: `${promisesBroken} this season`
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

function countPlayerNominations(state, pid) {
  const weeks = new Set();
  for (const e of state.history || []) {
    if (e.type === 'nominations' && (e.nominees || []).includes(pid)) weeks.add(e.week);
  }
  return weeks.size;
}

export function buildProfileAchievementsDrawerHtml(profile) {
  if (!profile?.achievements || !Object.keys(profile.achievements).length) {
    return '';
  }
  const rows = Object.entries(profile.achievements)
    .map(([id, meta]) => {
      const def = ACHIEVEMENT_DEFS.find((d) => d.id === id);
      const title = meta.title || def?.title || id;
      return `<li>${escapeHtml(title)}</li>`;
    })
    .join('');
  return `<ul class="intel-ach-list">${rows}</ul>`;
}

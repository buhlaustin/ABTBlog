import { getContestantAlliances, getAllianceIds } from './allianceUtils.js';
import { escapeHtml } from './utils.js';

const STATUS_SORT = { yours: 0, exposed: 1, hidden: 2, rumour: 3 };

/**
 * Sidebar chips for visible alliance memberships on other guests.
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} player
 * @param {import('./Contestant.js').Contestant} guest
 */
export function getHouseguestAllianceMarks(state, player, guest) {
  if (!state || !player || !guest || guest.isPlayer || guest.evicted) return [];

  const visibleIds = new Set(state.getVisibleAlliances(player.id).map((a) => a.id));
  const guestIds = getAllianceIds(guest).filter((id) => visibleIds.has(id));
  if (!guestIds.length) return [];

  /** @type {{ key: string, label: string, title: string }[]} */
  const marks = [];

  if (guestIds.length >= 2) {
    const names = guestIds
      .map((id) => state.alliances.find((a) => a.id === id)?.name)
      .filter(Boolean);
    marks.push({
      key: 'multi-alliance',
      label: `${guestIds.length} deals`,
      title:
        names.length > 1
          ? `${guest.name} · ${names.join(' + ')}`
          : `${guest.name} is in ${guestIds.length} alliances you can track.`
    });
    return marks;
  }

  const alliance = state.alliances.find((a) => a.id === guestIds[0]);
  const shared = alliance?.members.includes(player.id);
  marks.push({
    key: shared ? 'ally' : 'in-deal',
    label: shared ? 'Ally' : 'In deal',
    title: shared
      ? `Your alliance "${alliance?.name || 'deal'}" with ${guest.name}.`
      : `${guest.name} in "${alliance?.name || 'exposed deal'}" (${alliance?.members.length || 2} members).`
  });

  return marks;
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildAllianceMapOutlook(state) {
  const player = state.getPlayer();
  if (!player || player.evicted) {
    return { visible: false };
  }

  const visible = state.getVisibleAlliances(player.id);
  const hidden = state.alliances.filter(
    (a) => !a.exposed && !a.members.includes(player.id)
  );
  const playerAlliances = getContestantAlliances(state, player.id);

  if (!state.alliances.length) {
    return {
      visible: true,
      summary: 'No alliances have formed yet.',
      rows: [],
      hiddenCount: 0,
      playerAllianceCount: 0,
      overlap: []
    };
  }

  let rows = visible.map((a) => formatAllianceRow(state, a, player.id));

  const shadowRows = hidden.map((a) => ({
    id: a.id,
    name: `Shadow deal (${a.members.length} rumored)`,
    status: 'rumour',
    statusLabel: 'Hidden',
    isYours: false,
    exposed: false,
    members: [],
    memberLabels: 'Unknown members — spy or wait for drama.',
    size: a.members.length
  }));

  rows = [...rows, ...shadowRows].sort((a, b) => {
    const byStatus = STATUS_SORT[a.status] - STATUS_SORT[b.status];
    if (byStatus !== 0) return byStatus;
    return b.size - a.size;
  });

  const overlap = buildMembershipOverlap(state, player);

  const exposedCount = state.alliances.filter((a) => a.exposed).length;
  const coachingTip = buildAllianceCoachingTip(state, player, hidden.length);

  const parts = [];
  if (playerAlliances.length) {
    parts.push(`You’re in ${playerAlliances.length} alliance${playerAlliances.length === 1 ? '' : 's'}`);
  }
  if (hidden.length) {
    parts.push(`${hidden.length} hidden`);
  }
  if (visible.filter((a) => a.exposed && !a.members.includes(player.id)).length) {
    parts.push(`${visible.filter((a) => a.exposed && !a.members.includes(player.id)).length} exposed to you`);
  }

  return {
    visible: true,
    summary: parts.length ? parts.join(' · ') : 'No alliances confirmed yet.',
    rows,
    hiddenCount: hidden.length,
    playerAllianceCount: playerAlliances.length,
    overlap,
    stats: {
      total: state.alliances.length,
      exposed: exposedCount,
      visibleToYou: visible.length,
      hiddenRumours: hidden.length,
      yours: playerAlliances.length
    },
    coachingTip
  };
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} player
 * @param {number} hiddenCount
 */
function buildAllianceCoachingTip(state, player, hiddenCount) {
  if (player.evicted) return '';
  if (hiddenCount > 0) {
    return `${hiddenCount} alliance${hiddenCount === 1 ? '' : 's'} still in the shadows — use Spy or wait for drama to expose them.`;
  }
  const overlap = buildMembershipOverlap(state, player);
  if (overlap.length) {
    return `Watch double dealers (${overlap[0].name} first) — they rarely stay loyal to every deal.`;
  }
  if (getAllianceIds(player).length > 1) {
    return 'You are juggling multiple alliances; expand one deal or expect overlap suspicion.';
  }
  if (state.alliances.length && !getContestantAlliances(state, player.id).length) {
    return 'No deal with your name on it yet — Propose Alliance is a separate move from promises.';
  }
  return '';
}

/**
 * @param {import('./GameState.js').GameState} state
 * @param {{ id: string, name: string, members: string[], exposed: boolean }} alliance
 * @param {string} playerId
 */
function formatAllianceRow(state, alliance, playerId) {
  const isYours = alliance.members.includes(playerId);
  let status = 'hidden';
  let statusLabel = 'Secret';
  if (isYours) {
    status = 'yours';
    statusLabel = 'Yours';
  } else if (alliance.exposed) {
    status = 'exposed';
    statusLabel = 'Exposed';
  }

  const members = alliance.members
    .map((id) => state.getContestant(id))
    .filter((c) => c && !c.evicted)
    .map((c) => ({
      id: c.id,
      name: c.name,
      isPlayer: c.isPlayer,
      you: c.id === playerId
    }));

  const memberLabels = members
    .map((m) => (m.you ? `${m.name} (you)` : m.name))
    .join(', ');

  const leader = alliance.leaderId ? state.getContestant(alliance.leaderId) : null;
  const leaderLabel =
    leader && !leader.evicted
      ? leader.id === playerId
        ? 'Led by you'
        : `Led by ${leader.name}`
      : '';

  return {
    id: alliance.id,
    name: alliance.name,
    status,
    statusLabel,
    isYours,
    exposed: alliance.exposed,
    members,
    memberLabels,
    leaderLabel,
    size: members.length
  };
}

/**
 * Guests in multiple alliances the player can see (or is part of).
 * @param {import('./GameState.js').GameState} state
 * @param {import('./Contestant.js').Contestant} player
 */
function buildMembershipOverlap(state, player) {
  const knownAllianceIds = new Set(
    state.getVisibleAlliances(player.id).map((a) => a.id)
  );

  /** @type {{ name: string, alliances: string[] }[]} */
  const entries = [];

  for (const c of state.getActiveContestants()) {
    if (c.isPlayer) continue;
    const ids = getAllianceIds(c).filter((id) => knownAllianceIds.has(id));
    if (ids.length < 2) continue;
    const names = ids
      .map((id) => state.alliances.find((a) => a.id === id)?.name)
      .filter(Boolean);
    entries.push({ name: c.name, alliances: names });
  }

  return entries.sort((a, b) => b.alliances.length - a.alliances.length).slice(0, 6);
}

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildAllianceIntelSection(state) {
  const outlook = buildAllianceMapOutlook(state);
  if (!outlook.visible) return null;
  if (!outlook.rows.length && !outlook.hiddenCount && !outlook.coachingTip) return null;

  /** @type {{ key: string, name: string, detail: string }[]} */
  const items = [];

  if (outlook.stats) {
    items.push({
      key: 'alliance-stats',
      name: 'House deals',
      detail: `${outlook.stats.total} active · ${outlook.stats.exposed} exposed · you in ${outlook.stats.yours}`
    });
  }

  if (outlook.coachingTip) {
    items.push({
      key: 'alliance-coach',
      name: 'Map read',
      detail: outlook.coachingTip
    });
  }

  for (const row of outlook.rows.slice(0, 8)) {
    const sizeBit = row.status !== 'rumour' ? ` · ${row.size} HG` : '';
    const leaderBit = row.leaderLabel ? ` · ${row.leaderLabel}` : '';
    items.push({
      key: `alliance-${row.id}`,
      name: row.name,
      detail:
        row.status === 'rumour'
          ? row.memberLabels
          : `${row.statusLabel}${sizeBit}${leaderBit} — ${row.memberLabels || '—'}`
    });
  }

  for (const entry of outlook.overlap.slice(0, 4)) {
    items.push({
      key: `alliance-overlap-${entry.name}`,
      name: 'Double dealer',
      detail: `${entry.name} · ${entry.alliances.join(', ')}`
    });
  }

  return {
    id: 'alliance-map',
    title: 'Alliance map',
    tone: outlook.hiddenCount > 0 ? 'warning' : 'neutral',
    items
  };
}

export function renderAllianceMapHtml(outlook) {
  if (!outlook?.visible) {
    return '<p class="no-alliance">No alliance intel yet.</p>';
  }

  let html = `<p class="alliance-map-summary">${escapeHtml(outlook.summary)}</p>`;

  if (outlook.stats?.total) {
    html += '<div class="alliance-map-stats">';
    html +=
      `<span class="alliance-stat-chip">${outlook.stats.total} in house</span>` +
      `<span class="alliance-stat-chip">${outlook.stats.exposed} exposed</span>` +
      `<span class="alliance-stat-chip">${outlook.stats.visibleToYou} on your map</span>`;
    if (outlook.stats.hiddenRumours) {
      html += `<span class="alliance-stat-chip warn">${outlook.stats.hiddenRumours} hidden</span>`;
    }
    html += '</div>';
  }

  if (outlook.coachingTip) {
    html += `<p class="alliance-map-coach">${escapeHtml(outlook.coachingTip)}</p>`;
  }

  html += '<table class="alliance-map-table"><thead><tr>';
  html += '<th>Alliance</th><th>Status</th><th>Size</th><th>Members</th>';
  html += '</tr></thead><tbody>';

  for (const row of outlook.rows) {
    html += `<tr class="alliance-map-row alliance-status-${escapeHtml(row.status)}">`;
    const leader =
      row.leaderLabel && row.status !== 'rumour'
        ? `<span class="alliance-map-leader">${escapeHtml(row.leaderLabel)}</span>`
        : '';
    html += `<td>${escapeHtml(row.name)}${leader}</td>`;
    html += `<td><span class="alliance-status-chip">${escapeHtml(row.statusLabel)}</span></td>`;
    html += `<td class="alliance-map-size">${row.size}</td>`;
    html += `<td>${escapeHtml(row.memberLabels || '—')}</td>`;
    html += '</tr>';
  }
  html += '</tbody></table>';

  if (outlook.overlap.length) {
    html += '<div class="alliance-overlap"><p class="alliance-overlap-title">Double dealers</p><ul>';
    for (const entry of outlook.overlap) {
      html += `<li><strong>${escapeHtml(entry.name)}</strong> — ${escapeHtml(entry.alliances.join(' · '))}</li>`;
    }
    html += '</ul></div>';
  }

  if (outlook.hiddenCount > 0 && outlook.rows.every((r) => r.status !== 'rumour')) {
    html += `<p class="alliance-rumor">${outlook.hiddenCount} other alliance${outlook.hiddenCount === 1 ? '' : 's'} may be active — not confirmed.</p>`;
  }

  return html;
}

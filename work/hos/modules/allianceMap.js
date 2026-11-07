import { getContestantAlliances, getAllianceIds } from './allianceUtils.js';
import { escapeHtml } from './utils.js';

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

  const rows = visible.map((a) => formatAllianceRow(state, a, player.id));

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

  const overlap = buildMembershipOverlap(state, player);

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
    rows: [...rows, ...shadowRows],
    hiddenCount: hidden.length,
    playerAllianceCount: playerAlliances.length,
    overlap
  };
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

  return {
    id: alliance.id,
    name: alliance.name,
    status,
    statusLabel,
    isYours,
    exposed: alliance.exposed,
    members,
    memberLabels,
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
  if (!outlook.visible || !outlook.rows.length) return null;

  const items = outlook.rows.slice(0, 8).map((row) => ({
    key: `alliance-${row.id}`,
    name: row.name,
    detail:
      row.status === 'rumour'
        ? row.memberLabels
        : `${row.statusLabel} · ${row.memberLabels || '—'}`
  }));

  if (outlook.overlap.length) {
    const multi = outlook.overlap[0];
    items.push({
      key: 'alliance-overlap',
      name: 'Double deals',
      detail: `${multi.name} in ${multi.alliances.length} visible alliances`
    });
  }

  return {
    id: 'alliance-map',
    title: 'Alliance map',
    tone: 'neutral',
    items
  };
}

export function renderAllianceMapHtml(outlook) {
  if (!outlook?.visible) {
    return '<p class="no-alliance">No alliance intel yet.</p>';
  }

  let html = `<p class="alliance-map-summary">${escapeHtml(outlook.summary)}</p>`;
  html += '<table class="alliance-map-table"><thead><tr>';
  html += '<th>Alliance</th><th>Status</th><th>Members</th>';
  html += '</tr></thead><tbody>';

  for (const row of outlook.rows) {
    html += `<tr class="alliance-map-row alliance-status-${escapeHtml(row.status)}">`;
    html += `<td>${escapeHtml(row.name)}</td>`;
    html += `<td><span class="alliance-status-chip">${escapeHtml(row.statusLabel)}</span></td>`;
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

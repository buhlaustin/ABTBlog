/** @param {import('./Contestant.js').Contestant | null | undefined} c */
export function getAllianceIds(c) {
  if (!c) return [];
  if (Array.isArray(c.allianceIds) && c.allianceIds.length > 0) return [...c.allianceIds];
  if (c.allianceId) return [c.allianceId];
  return [];
}

/** @param {import('./Contestant.js').Contestant} c @param {string} allianceId */
export function addContestantToAlliance(c, allianceId) {
  const ids = getAllianceIds(c);
  if (!ids.includes(allianceId)) ids.push(allianceId);
  c.allianceIds = ids;
  c.allianceId = ids[0] ?? null;
}

/** @param {import('./Contestant.js').Contestant} c @param {string} [allianceId] */
export function removeContestantFromAlliance(c, allianceId) {
  if (!allianceId) {
    c.allianceIds = [];
    c.allianceId = null;
    return;
  }
  const ids = getAllianceIds(c).filter((id) => id !== allianceId);
  c.allianceIds = ids;
  c.allianceId = ids[0] ?? null;
}

/** @param {import('./Contestant.js').Contestant | null} a @param {import('./Contestant.js').Contestant | null} b */
export function sharesAllianceWith(a, b) {
  if (!a || !b) return false;
  const aIds = new Set(getAllianceIds(a));
  return getAllianceIds(b).some((id) => aIds.has(id));
}

/** @param {import('./GameState.js').GameState} state @param {string} contestantId */
export function getContestantAlliances(state, contestantId) {
  const ids = getAllianceIds(state.getContestant(contestantId));
  return ids.map((id) => state.alliances.find((a) => a.id === id)).filter(Boolean);
}

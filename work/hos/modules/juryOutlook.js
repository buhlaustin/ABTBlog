import { sharesAllianceWith } from './allianceUtils.js';

/** Mirrors finale jury logic: positive = more likely to want the player to win. */
export function scoreJurorLeanTowardPlayer(state, juror, player) {
  if (!juror || !player || juror.id === player.id) return 0;

  let score = juror.getRelationship(player.id);

  const grudge = juror.grudges.find((g) => g.againstId === player.id);
  if (grudge) score -= grudge.intensity / 2;

  const betrayal = juror.betrayals.find((b) => b.byId === player.id);
  if (betrayal) score -= 18;

  if (sharesAllianceWith(juror, player)) score += 22;

  const promiseToJuror = player.promises.find(
    (p) => p.targetId === juror.id && p.kept === true
  );
  if (promiseToJuror) score += 12;

  const brokenToJuror = player.promises.find(
    (p) => p.targetId === juror.id && p.kept === false
  );
  if (brokenToJuror) score -= 22;

  const jurorPromise = juror.promises.find(
    (p) => p.targetId === player.id && p.kept === true
  );
  if (jurorPromise) score += 8;

  if (juror.evictedWeek != null) {
    const nomsThatWeek = state.history.find(
      (h) => h.type === 'nominations' && h.week === juror.evictedWeek
    );
    if (nomsThatWeek?.hoh === player.id) score -= 10;
    if (nomsThatWeek?.nominees?.includes(juror.id) && nomsThatWeek?.hoh === player.id) {
      score -= 5;
    }
  }

  return Math.round(score);
}

export function leanLabel(score) {
  if (score >= 18) return { label: 'Likely for you', tone: 'favor' };
  if (score <= -18) return { label: 'Likely against', tone: 'against' };
  if (score >= 8) return { label: 'Lean for you', tone: 'lean-favor' };
  if (score <= -8) return { label: 'Lean against', tone: 'lean-against' };
  return { label: 'Undecided', tone: 'neutral' };
}

export function buildJuryOutlook(state) {
  const player = state.getPlayer();
  const jurors = state.getJurors().sort((a, b) => (a.evictedWeek ?? 0) - (b.evictedWeek ?? 0));

  const rows = jurors.map((juror) => {
    const score = scoreJurorLeanTowardPlayer(state, juror, player);
    const { label, tone } = leanLabel(score);
    return {
      juror,
      score,
      label,
      tone,
      evictedWeek: juror.evictedWeek
    };
  });

  const counts = { favor: 0, against: 0, neutral: 0 };
  for (const row of rows) {
    if (row.tone === 'favor' || row.tone === 'lean-favor') counts.favor += 1;
    else if (row.tone === 'against' || row.tone === 'lean-against') counts.against += 1;
    else counts.neutral += 1;
  }

  return { rows, counts, total: rows.length };
}

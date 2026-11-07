/**
 * Feed lines when promises / grudges shape votes or player betrayal.
 */

/**
 * @param {import('./Contestant.js').Contestant} player
 * @param {string|null} playerVoteTargetId
 * @param {import('./Contestant.js').Contestant[]} nominees
 * @param {import('./GameState.js').GameState} state
 * @returns {{ results: object[], brokePromise: boolean }}
 */
export function applyPlayerVotePromiseConsequences(player, playerVoteTargetId, nominees, state) {
  const results = [];
  if (!player || !playerVoteTargetId) {
    return { results, brokePromise: false };
  }

  const active = player.promises.filter((p) => p.kept === null);
  let brokePromise = false;

  for (const promise of active) {
    const ally = state.getContestant(promise.targetId);
    if (!ally) continue;

    const allyOnBlock = nominees.some((n) => n.id === ally.id);
    if (playerVoteTargetId === ally.id) {
      player.breakPromise(ally.id);
      ally.addGrudge(player.id, 'broken promise', 22);
      ally.betrayals.push({ byId: player.id, week: state.week });
      brokePromise = true;
      results.push({
        type: 'drama',
        text: `<strong>${ally.name}</strong> will remember you broke your ${promise.type} deal from <strong>Week ${promise.week}</strong> — you voted to evict them.`
      });
      continue;
    }

    if (allyOnBlock && playerVoteTargetId !== ally.id) {
      player.keepPromise(ally.id);
      results.push({
        type: 'success',
        text: `You honored your ${promise.type} promise to <strong>${ally.name}</strong> — you did not vote against them.`
      });
    }
  }

  return { results, brokePromise };
}

/**
 * @param {import('./Contestant.js').Contestant} player
 * @param {{ voter: string, target: string, reason: string }} log
 * @param {import('./Contestant.js').Contestant} voterContestant
 */
export function getVoteConsequenceLine(player, log, voterContestant) {
  if (!player || !voterContestant || log.target !== player.name) return null;

  if (log.reason.includes('broke a promise')) {
    const broken = player.promises.find(
      (p) => p.targetId === voterContestant.id && p.kept === false
    );
    const week = broken?.week ?? stateWeekFallback(voterContestant, player);
    return {
      type: 'warning',
      text: `<strong>${voterContestant.name}</strong> remembers you broke your deal${week ? ` in Week ${week}` : ''}.`
    };
  }

  if (log.reason.includes('grudge')) {
    const grudge = voterContestant.grudges.find((g) => g.againstId === player.id);
    return {
      type: 'warning',
      text: `<strong>${voterContestant.name}</strong>'s grudge (${grudge?.reason || 'bad blood'}) helped send you toward eviction.`
    };
  }

  if (log.reason.includes('promised safety')) {
    return {
      type: 'narrative',
      text: `${voterContestant.name} stayed loyal to a deal — your plea for safety may have worked.`
    };
  }

  return null;
}

function stateWeekFallback(voter, player) {
  const betrayal = voter.betrayals.find((b) => b.byId === player.id);
  return betrayal?.week ?? null;
}

/**
 * When AI nominates player influenced by grudge/promise.
 */
export function getNominationConsequenceLine(hoh, target) {
  if (!target.isPlayer) return null;

  const grudge = hoh.grudges.find((g) => g.againstId === target.id);
  if (grudge && grudge.intensity >= 10) {
    return {
      type: 'warning',
      text: `<strong>${hoh.name}</strong> nominated you with a grudge in play (${grudge.reason || 'personal'}).`
    };
  }

  const broken = target.promises.find((p) => p.targetId === hoh.id && p.kept === false);
  if (broken) {
    return {
      type: 'warning',
      text: `<strong>${hoh.name}</strong> remembers you broke your deal in Week ${broken.week}.`
    };
  }

  const owed = hoh.promises.find((p) => p.targetId === target.id && p.kept === null);
  if (owed) {
    return {
      type: 'narrative',
      text: `${hoh.name} had promised you ${owed.type}, but nominations came first.`
    };
  }

  return null;
}

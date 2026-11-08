const PROMISE_SHORT = { vote: 'Vote deal', safety: 'Safety', loyalty: 'Loyalty' };

/**
 * @param {import('./Contestant.js').Contestant} player
 * @param {import('./Contestant.js').Contestant} guest
 */
export function getHouseguestDealMarks(player, guest) {
  if (!player || !guest || guest.isPlayer) return [];

  const marks = [];

  const yourDeal = player.promises.find((p) => p.targetId === guest.id && p.kept === null);
  if (yourDeal) {
    marks.push({
      key: 'deal-out',
      title: `You owe ${guest.name}: ${PROMISE_SHORT[yourDeal.type] || yourDeal.type} (Week ${yourDeal.week})`,
      label: 'Deal'
    });
  }

  const theirDeal = guest.promises.find((p) => p.targetId === player.id && p.kept === null);
  if (theirDeal) {
    marks.push({
      key: 'deal-in',
      title: `${guest.name} owes you: ${PROMISE_SHORT[theirDeal.type] || theirDeal.type} (Week ${theirDeal.week})`,
      label: 'Owes you'
    });
  }

  const grudgeTheyHold = guest.grudges.find((g) => g.againstId === player.id);
  if (grudgeTheyHold) {
    marks.push({
      key: 'grudge-against',
      title: `${guest.name}'s grudge (${grudgeTheyHold.reason || 'bad blood'}) — ${Math.round(grudgeTheyHold.intensity)}`,
      label: 'Bitter'
    });
  }

  const grudgeYouHold = player.grudges.find((g) => g.againstId === guest.id);
  if (grudgeYouHold) {
    marks.push({
      key: 'grudge-you',
      title: `Your grudge vs ${guest.name} (${Math.round(grudgeYouHold.intensity)})`,
      label: 'Grudge'
    });
  }

  return marks;
}

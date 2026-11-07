import { escapeHtml } from './utils.js';
import { buildFloaterShieldIntelSection } from './floaterShields.js';
import { buildStrategicVerbsIntelSection } from './strategicVerbs.js';
import { buildVetoBlockIntelSection } from './vetoCeremonySummary.js';
import { buildAllianceIntelSection } from './allianceMap.js';
import { buildLayLowIntelSection } from './layLowFeedback.js';
import { buildHostBeatIntelSection } from './hostPhaseBeats.js';
import { buildConfessionalIntelSection } from './confessionals.js';
import { buildWeekRecapIntelSection } from './weekEndRecap.js';
import { buildWeekCalendarIntelSection } from './weekCalendarStrip.js';
import { buildScheduleRepairIntelSection } from './scheduleRepair.js';

const PROMISE_LABELS = {
  vote: 'Vote deal',
  safety: 'Safety',
  loyalty: 'Loyalty'
};

/**
 * @param {import('./GameState.js').GameState} state
 */
export function buildDealIntel(state) {
  const player = state.getPlayer();
  if (!player) {
    return { visible: false, sections: [] };
  }

  const nameFor = (id) => state.getContestant(id)?.name ?? 'Unknown';

  const promisesByYou = {
    active: player.promises
      .filter((p) => p.kept === null)
      .map((p) => ({
        key: `p-active-${p.targetId}-${p.week}`,
        name: nameFor(p.targetId),
        detail: `${PROMISE_LABELS[p.type] || p.type} · since Week ${p.week}`
      })),
    broken: player.promises
      .filter((p) => p.kept === false)
      .map((p) => ({
        key: `p-broken-${p.targetId}-${p.week}`,
        name: nameFor(p.targetId),
        detail: `Broke ${PROMISE_LABELS[p.type] || p.type} from Week ${p.week}`
      })),
    kept: player.promises
      .filter((p) => p.kept === true)
      .slice(-4)
      .map((p) => ({
        key: `p-kept-${p.targetId}-${p.week}`,
        name: nameFor(p.targetId),
        detail: `Honored ${PROMISE_LABELS[p.type] || p.type} (Week ${p.week})`
      }))
  };

  const grudgesYouHold = player.grudges.map((g) => ({
    key: `g-you-${g.againstId}`,
    name: nameFor(g.againstId),
    detail: `${g.reason || 'grudge'} · intensity ${Math.round(g.intensity)}`
  }));

  const grudgesAgainstYou = [];
  const betrayalsAgainstYou = [];
  const promisesToYou = [];

  for (const c of state.contestants) {
    if (c.id === player.id) continue;

    for (const g of c.grudges) {
      if (g.againstId === player.id) {
        grudgesAgainstYou.push({
          key: `g-against-${c.id}`,
          name: c.name,
          detail: `${g.reason || 'grudge'} · ${Math.round(g.intensity)}`
        });
      }
    }

    for (const b of c.betrayals) {
      if (b.byId === player.id) {
        betrayalsAgainstYou.push({
          key: `b-${c.id}-${b.week}`,
          name: c.name,
          detail: `Week ${b.week} betrayal`
        });
      }
    }

    for (const p of c.promises) {
      if (p.targetId === player.id && p.kept === null) {
        promisesToYou.push({
          key: `p-to-you-${c.id}-${p.week}`,
          name: c.name,
          detail: `Owes you ${PROMISE_LABELS[p.type] || p.type} (Week ${p.week})`
        });
      }
    }
  }

  const spyIntel = state.playerIntel
    .slice(-8)
    .reverse()
    .map((row, idx) => ({
      key: `intel-${row.week}-${idx}`,
      week: row.week,
      text: row.text
    }));

  const sections = [];

  const calendarSection = buildWeekCalendarIntelSection(state);
  if (calendarSection) {
    sections.push(calendarSection);
  }

  const scheduleRepairSection = buildScheduleRepairIntelSection(state);
  if (scheduleRepairSection) {
    sections.push(scheduleRepairSection);
  }

  const hostSection = buildHostBeatIntelSection(state);
  if (hostSection) {
    sections.push(hostSection);
  }

  const recapSection = buildWeekRecapIntelSection(state);
  if (recapSection) {
    sections.push(recapSection);
  }

  const confessionalSection = buildConfessionalIntelSection(state);
  if (confessionalSection) {
    sections.push(confessionalSection);
  }

  const pawnSection = buildFloaterShieldIntelSection(state);
  if (pawnSection) {
    sections.push(pawnSection);
  }

  const strategicSection = buildStrategicVerbsIntelSection(state);
  if (strategicSection) {
    sections.push(strategicSection);
  }

  const vetoSection = buildVetoBlockIntelSection(state);
  if (vetoSection) {
    sections.push(vetoSection);
  }

  const allianceSection = buildAllianceIntelSection(state);
  if (allianceSection) {
    sections.push(allianceSection);
  }

  const layLowSection = buildLayLowIntelSection(state);
  if (layLowSection) {
    sections.push(layLowSection);
  }

  if (promisesByYou.active.length) {
    sections.push({ id: 'promises-active', title: 'Your active deals', tone: 'active', items: promisesByYou.active });
  }
  if (promisesToYou.length) {
    sections.push({ id: 'promises-in', title: 'Deals owed to you', tone: 'active', items: promisesToYou });
  }
  if (grudgesAgainstYou.length || betrayalsAgainstYou.length) {
    sections.push({
      id: 'held-against',
      title: 'Held against you',
      tone: 'danger',
      items: [...betrayalsAgainstYou, ...grudgesAgainstYou]
    });
  }
  if (grudgesYouHold.length) {
    sections.push({ id: 'grudges-you', title: 'Your grudges', tone: 'warning', items: grudgesYouHold });
  }
  if (promisesByYou.broken.length) {
    sections.push({ id: 'promises-broken', title: 'Broken deals', tone: 'danger', items: promisesByYou.broken });
  }
  if (promisesByYou.kept.length) {
    sections.push({ id: 'promises-kept', title: 'Honored deals', tone: 'success', items: promisesByYou.kept });
  }
  if (spyIntel.length) {
    sections.push({ id: 'spy-intel', title: 'Gathered intel', tone: 'neutral', items: spyIntel.map((row) => ({
      key: row.key,
      name: `Week ${row.week}`,
      detail: row.text.replace(/<[^>]+>/g, '')
    })) });
  }

  const hasContent = sections.length > 0;
  const visible = hasContent || !player.evicted;

  const pawnOnly = sections.length === 1 && sections[0].id === 'pawn-radar';

  return {
    visible,
    empty: !hasContent,
    sections,
    summary: hasContent
      ? summarize(promisesByYou, grudgesAgainstYou, betrayalsAgainstYou, pawnOnly)
      : pawnSection
        ? 'Pawn radar active — Easy HOHs may shield you with floater pairs.'
        : 'No active deals yet — make promises or spy for leverage.'
  };
}

function summarize(promisesByYou, grudgesAgainstYou, betrayalsAgainstYou, pawnOnly = false) {
  const parts = [];
  if (pawnOnly) {
    parts.push('pawn radar live');
  }
  if (promisesByYou.active.length) {
    parts.push(`${promisesByYou.active.length} active deal${promisesByYou.active.length === 1 ? '' : 's'}`);
  }
  if (grudgesAgainstYou.length + betrayalsAgainstYou.length) {
    const n = grudgesAgainstYou.length + betrayalsAgainstYou.length;
    parts.push(`${n} houseguest${n === 1 ? '' : 's'} bitter at you`);
  }
  return parts.join(' · ');
}

export function renderDealIntelHtml(outlook) {
  if (!outlook?.visible) {
    return { html: '', hidden: true };
  }

  if (outlook.empty) {
    return {
      html: '<p class="intel-empty">Break a deal on purpose, vote against an ally, or get caught spying — it will show up here.</p>',
      hidden: false
    };
  }

  let html = '';
  for (const section of outlook.sections) {
    html += `<div class="intel-section intel-tone-${section.tone}">`;
    html += `<h3 class="intel-section-title">${escapeHtml(section.title)}</h3>`;
    html += '<ul class="intel-list">';
    for (const item of section.items) {
      html += `<li class="intel-item" data-intel-key="${escapeHtml(item.key)}">`;
      html += `<span class="intel-name">${escapeHtml(item.name)}</span>`;
      html += `<span class="intel-detail">${escapeHtml(item.detail)}</span>`;
      html += '</li>';
    }
    html += '</ul></div>';
  }
  return { html, hidden: false };
}

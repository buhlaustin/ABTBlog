import { PHASE_LABELS, PHASES, WEEKDAYS } from './GameState.js';
import { renderDealIntelHtml } from './dealIntel.js';
import { getHouseguestDealMarks } from './houseguestDealMarks.js';
import { getHouseguestFloaterMarks } from './floaterShields.js';
import {
  buildAllianceMapOutlook,
  getHouseguestAllianceMarks,
  renderAllianceMapHtml
} from './allianceMap.js';
import { getHohNomPersonaTooltip } from './hohNomPersonas.js';
import { relationshipClass, formatRelationship, escapeHtml } from './utils.js';
import { renderWeekCalendarHtml } from './weekCalendarStrip.js';
import { getHouseguestCastMarks } from './castPresets.js';

/**
 * DOM rendering and screen management.
 */
export class UIManager {
  constructor() {
    this.elements = {
      setupScreen: document.getElementById('setup-screen'),
      gameScreen: document.getElementById('game-screen'),
      endScreen: document.getElementById('end-screen'),
      playerNameInput: document.getElementById('player-name'),
      difficultySelect: document.getElementById('difficulty'),
      castSelect: document.getElementById('cast-size'),
      castPresetBlurb: document.getElementById('cast-preset-blurb'),
      doubleEvictionToggle: document.getElementById('double-eviction'),
      battleBackToggle: document.getElementById('twist-battle-back'),
      mvpTwistToggle: document.getElementById('twist-mvp'),
      twistBanner: document.getElementById('twist-banner'),
      btnNewGame: document.getElementById('btn-new-game'),
      btnLoadGame: document.getElementById('btn-load-game'),
      btnSave: document.getElementById('btn-save'),
      btnMenu: document.getElementById('btn-menu'),
      btnPlayAgain: document.getElementById('btn-play-again'),
      weekDay: document.getElementById('week-day'),
      weekCalendar: document.getElementById('week-calendar'),
      phaseLabel: document.getElementById('phase-label'),
      storyLog: document.getElementById('story-log'),
      playerNameDisplay: document.getElementById('player-name-display'),
      playerStats: document.getElementById('player-stats'),
      threatBand: document.getElementById('threat-band'),
      vetoBlockPanel: document.getElementById('veto-block-panel'),
      playerStatus: document.getElementById('player-status'),
      guestCount: document.getElementById('guest-count'),
      houseguestList: document.getElementById('houseguest-list'),
      allianceOverview: document.getElementById('alliance-overview'),
      juryPanel: document.getElementById('jury-panel'),
      juryCount: document.getElementById('jury-count'),
      jurySummary: document.getElementById('jury-summary'),
      juryList: document.getElementById('jury-list'),
      intelPanel: document.getElementById('intel-panel'),
      intelSummary: document.getElementById('intel-summary'),
      intelBody: document.getElementById('intel-body'),
      actionPrompt: document.getElementById('action-prompt'),
      actionButtons: document.getElementById('action-buttons'),
      actionDetail: document.getElementById('action-detail'),
      endTitle: document.getElementById('end-title'),
      endSummary: document.getElementById('end-summary')
    };
  }

  showScreen(screen) {
    for (const el of [this.elements.setupScreen, this.elements.gameScreen, this.elements.endScreen]) {
      el.classList.remove('active');
    }
    screen.classList.add('active');
  }

  showSetup() {
    this.showScreen(this.elements.setupScreen);
    this.elements.btnLoadGame.disabled = !StorageManagerRef.hasSave();
  }

  showGame() {
    this.showScreen(this.elements.gameScreen);
  }

  showEnd(won) {
    this.showScreen(this.elements.endScreen);
    this.elements.endTitle.textContent = won ? 'You Won!' : 'Game Over';
  }

  updateWeekDay(week, weekdayIndex, phase, phaseLabel = null) {
    const weekday = WEEKDAYS[weekdayIndex] ?? `Day ${weekdayIndex + 1}`;
    this.elements.weekDay.textContent = `Week ${week} — ${weekday}`;
    const label = phaseLabel ?? PHASE_LABELS[phase] ?? phase;
    this.elements.phaseLabel.textContent = label;
    const deActive = typeof phaseLabel === 'string' && phaseLabel.startsWith('Double Eviction');
    this.elements.phaseLabel.classList.toggle('double-eviction', deActive);
  }

  /**
   * Fri→Thu strip with live vs social markers.
   * @param {import('./GameState.js').GameState} state
   */
  renderWeekCalendar(state) {
    const host = this.elements.weekCalendar;
    if (!host || !state) return;
    host.innerHTML = renderWeekCalendarHtml(state);
    const today = host.querySelector('.cal-today');
    if (today && typeof today.scrollIntoView === 'function') {
      today.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    }
  }

  updateTwistBanner(text) {
    const el = this.elements.twistBanner;
    if (!el) return;
    const trimmed = (text || '').trim();
    if (!trimmed) {
      el.textContent = '';
      el.classList.add('hidden');
      return;
    }
    el.textContent = trimmed;
    el.classList.remove('hidden');
  }

  /** Append entries to story log. */
  addStoryEntries(entries, scroll = true) {
    for (const entry of entries) {
      const div = document.createElement('div');
      const hostTag = entry.hostBeatKind
        ? ` story-entry-host-${entry.hostBeatKind.replace(/_/g, '-')}`
        : '';
      div.className = `story-entry ${entry.type || 'narrative'}${hostTag}`;
      div.innerHTML = entry.text;
      this.elements.storyLog.appendChild(div);
    }
    if (scroll) {
      this.elements.storyLog.scrollTop = this.elements.storyLog.scrollHeight;
    }
  }

  /** Rebuild story log from state. */
  renderStoryLog(storyLog) {
    this.elements.storyLog.innerHTML = '';
    this.addStoryEntries(storyLog, false);
    this.elements.storyLog.scrollTop = this.elements.storyLog.scrollHeight;
  }

  renderPlayer(player) {
    if (!player) return;

    this.elements.playerNameDisplay.textContent = player.name;

    const stats = [
      { label: 'Social', value: player.social, cls: 'social' },
      { label: 'Competition', value: player.competition, cls: 'competition' },
      { label: 'Threat', value: player.threat, cls: 'threat' },
      { label: 'Trust', value: player.trust, cls: 'trust' },
      { label: 'Intelligence', value: player.intelligence },
      { label: 'Aggression', value: player.aggression },
      { label: 'Reputation', value: player.reputation },
      { label: 'Loyalty', value: player.loyalty }
    ];

    this.elements.playerStats.innerHTML = stats.map((s) => {
      if (s.cls) {
        return `<div class="stat-bar-wrap">
          <div class="stat-row"><span class="stat-label">${s.label}</span><span>${s.value}</span></div>
          <div class="stat-bar"><div class="stat-bar-fill ${s.cls}" style="width:${s.value * 10}%"></div></div>
        </div>`;
      }
      return `<div class="stat-row"><span class="stat-label">${s.label}</span><span>${s.value}</span></div>`;
    }).join('');

    const tags = [];
    if (player.isHOH) tags.push('<span class="tag hoh">HOH</span>');
    if (player.isNominated) tags.push('<span class="tag nominated">Nominated</span>');
    if (player.hasVeto) tags.push('<span class="tag veto-holder">Veto</span>');
    const allianceCount = player.allianceIds?.length || (player.allianceId ? 1 : 0);
    if (allianceCount === 1) tags.push('<span class="tag alliance">In Alliance</span>');
    if (allianceCount > 1) tags.push(`<span class="tag alliance">${allianceCount} Alliances</span>`);
    const threatOff = player.threatOffset ?? 0;
    if (threatOff < -2) tags.push('<span class="tag lay-low">Lay low</span>');
    if (threatOff > 2) tags.push('<span class="tag campaign-heat">Campaign heat</span>');
    if (!player.isNominated && !player.isHOH) tags.push('<span class="tag safe">Safe</span>');

    this.elements.playerStatus.innerHTML = tags.join('');
  }

  renderVetoBlockPanel(outlook) {
    const el = this.elements.vetoBlockPanel;
    if (!el) return;
    if (!outlook?.visible) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }
    el.classList.remove('hidden');
    const status = outlook.awaitingReplacement
      ? '<span class="veto-block-flag">Replacement needed</span>'
      : outlook.vetoUsed
        ? '<span class="veto-block-flag">Veto used</span>'
        : '';
    const holder = outlook.vetoHolder
      ? `<span class="veto-block-meta">Veto · ${escapeHtml(outlook.vetoHolder)}</span>`
      : '';
    const noms = outlook.nomineeNames?.length
      ? outlook.nomineeNames.map((n) => escapeHtml(n)).join(' vs ')
      : '—';
    el.innerHTML = `
      <div class="veto-block-head">
        <span class="veto-block-title">Eviction block</span>
        ${status}
      </div>
      <p class="veto-block-names">${noms}</p>
      ${holder}
      <p class="veto-block-banner">${escapeHtml(outlook.banner)}</p>
    `;
  }

  renderThreatBand(outlook) {
    const el = this.elements.threatBand;
    if (!el) return;

    if (!outlook?.visible) {
      el.classList.add('hidden');
      el.innerHTML = '';
      return;
    }

    el.classList.remove('hidden');

    const alert = outlook.nominationAlert
      ? `<p class="threat-band-alert">${escapeHtml(outlook.nominationAlert)}</p>`
      : '';

    const metaParts = [];
    if (outlook.houseTotal > 1) {
      metaParts.push(`#${outlook.houseRank} threat in the house`);
    }
    if (typeof outlook.weekDelta === 'number' && outlook.weekDelta !== 0) {
      const sign = outlook.weekDelta > 0 ? '+' : '−';
      metaParts.push(`${sign}${Math.abs(outlook.weekDelta)} this week`);
    } else if (typeof outlook.weekDelta === 'number') {
      metaParts.push('Flat this week');
    }
    if (outlook.nextBand) {
      metaParts.push(outlook.nextBand);
    }
    const meta = metaParts.length
      ? `<p class="threat-band-meta">${metaParts.map((p) => escapeHtml(p)).join(' · ')}</p>`
      : '';

    const radarPct = outlook.radarAt ?? 32;
    const targetPct = outlook.targetAt ?? 52;
    const ghost =
      typeof outlook.rawThreat === 'number' &&
      outlook.threatOffset < 0 &&
      outlook.rawThreat > outlook.threat
        ? `<div class="threat-band-meter-ghost" style="width:${outlook.rawThreat}%" title="Threat without lay-low cushion"></div>`
        : '';

    const meter = `
      <div class="threat-band-meter" role="img" aria-label="Threat ${outlook.threat} of 100">
        <div class="threat-band-meter-track">
          <span class="threat-band-tick threat-band-tick-radar" style="left:${radarPct}%"></span>
          <span class="threat-band-tick threat-band-tick-target" style="left:${targetPct}%"></span>
          ${ghost}
          <div class="threat-band-meter-fill threat-tone-${outlook.tone}" style="width:${outlook.threat}%"></div>
        </div>
      </div>`;

    const drivers = outlook.drivers?.length
      ? `<ul class="threat-band-drivers">${outlook.drivers.map((d) => {
        const sign = d.pts > 0 ? '+' : '';
        return `<li title="Threat driver">${escapeHtml(d.label)} <span class="threat-driver-pts">${sign}${d.pts}</span></li>`;
      }).join('')}</ul>`
      : '';

    const shield = outlook.shield
      ? `<p class="threat-band-shield">${escapeHtml(outlook.shield)}</p>`
      : '';

    const offsetBlock = outlook.offsetNote
      ? `<p class="threat-band-offset">${escapeHtml(outlook.offsetNote)}</p>`
      : '';

    el.innerHTML = `
      <div class="threat-band-head threat-tone-${outlook.tone}">
        <span class="threat-band-label">${escapeHtml(outlook.label)}</span>
        <span class="threat-band-score">${outlook.threat}</span>
      </div>
      ${alert}
      ${meter}
      ${offsetBlock}
      ${meta}
      <p class="threat-band-advice">${escapeHtml(outlook.advice)}</p>
      ${drivers}
      ${shield}
    `;
  }

  /**
   * Brief highlight when Rest (or similar) changes threat.
   * @param {{ delta: number }} feedback
   */
  pulseThreatFeedback(feedback) {
    const el = this.elements.threatBand;
    if (!el || !feedback) return;
    el.classList.remove('threat-band-pulse');
    void el.offsetWidth;
    el.classList.add('threat-band-pulse');
    if (feedback.bandCrossed) {
      el.classList.add('threat-band-band-cross');
    }
    const score = el.querySelector('.threat-band-score');
    if (score && typeof feedback.delta === 'number' && feedback.delta !== 0) {
      const sign = feedback.delta > 0 ? '+' : '−';
      score.setAttribute('data-delta', `${sign}${Math.abs(feedback.delta)}`);
    }
    window.setTimeout(() => {
      el.classList.remove('threat-band-pulse', 'threat-band-band-cross');
      score?.removeAttribute('data-delta');
    }, 1400);
  }

  renderHouseguests(contestants, player, state = null) {
    const active = contestants.filter((c) => !c.evicted);
    this.elements.guestCount.textContent = active.length;

    this.elements.houseguestList.innerHTML = contestants.map((c) => {
      const rel = player ? player.getRelationship(c.id) : 0;
      const relDisplay = c.isPlayer ? '' : `<span class="rel-score ${relationshipClass(rel)}">${rel > 0 ? '+' : ''}${rel}</span>`;
      const icons = [];
      if (c.isHOH) icons.push('👑');
      if (c.isNominated) icons.push('⚠️');
      if (c.evicted && c.isJuror) icons.push('⚖️');
      else if (c.evicted) icons.push('❌');

      const personaTitle = c.isHOH ? getHohNomPersonaTooltip(c) : '';
      const personaAttrs = personaTitle
        ? ` class="personality hoh-nom-persona" title="${escapeHtml(personaTitle)}"`
        : ' class="personality"';

      const dealMarks = player ? getHouseguestDealMarks(player, c) : [];
      const floaterMarks = state ? getHouseguestFloaterMarks(state, c) : [];
      const allianceMarks = state && player ? getHouseguestAllianceMarks(state, player, c) : [];
      const castMarks = getHouseguestCastMarks(c);
      const allMarks = [...castMarks, ...dealMarks, ...allianceMarks, ...floaterMarks];
      const marksHtml = allMarks.length
        ? `<div class="deal-marks">${allMarks.map((m) =>
          `<span class="deal-mark deal-mark-${escapeHtml(m.key)}" title="${escapeHtml(m.title)}">${escapeHtml(m.label)}</span>`
        ).join('')}</div>`
        : '';

      return `<li class="houseguest-item ${c.isPlayer ? 'is-player' : ''} ${c.evicted ? 'evicted' : ''}">
        <div>
          <span class="name">${icons.join(' ')} ${escapeHtml(c.name)}</span>
          <div${personaAttrs}>${escapeHtml(c.personality.name)}${c.isHOH ? ' · HOH' : ''}</div>
          ${marksHtml}
        </div>
        ${relDisplay}
      </li>`;
    }).join('');
  }

  renderAlliances(alliances, player, state = null) {
    if (state) {
      const outlook = buildAllianceMapOutlook(state);
      this.elements.allianceOverview.innerHTML = renderAllianceMapHtml(outlook);
      return;
    }

    const visible = alliances.filter(
      (a) => a.exposed || (player?.id && a.members.includes(player.id))
    );
    const hiddenCount = alliances.length - visible.length;

    if (visible.length === 0) {
      const hint =
        hiddenCount > 0
          ? `<p class="no-alliance">Alliances are forming in the shadows. Spy or wait for drama to expose them.</p>`
          : `<p class="no-alliance">No known alliances yet.</p>`;
      this.elements.allianceOverview.innerHTML = hint;
      return;
    }

    this.elements.allianceOverview.innerHTML = renderAllianceMapHtml({
      visible: true,
      summary: `${visible.length} known alliance${visible.length === 1 ? '' : 's'}`,
      rows: visible.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.members.includes(player?.id) ? 'yours' : 'exposed',
        statusLabel: a.members.includes(player?.id) ? 'Yours' : 'Exposed',
        memberLabels: a.members
          .map((id) => window.__gameContestants?.get(id)?.name ?? 'Unknown')
          .join(', ')
      })),
      hiddenCount,
      overlap: []
    });
  }

  renderDealIntelPanel(outlook) {
    const panel = this.elements.intelPanel;
    if (!panel) return;

    const rendered = renderDealIntelHtml(outlook);
    if (rendered.hidden) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    if (this.elements.intelSummary) {
      this.elements.intelSummary.textContent = outlook.summary || '';
    }
    if (this.elements.intelBody) {
      this.elements.intelBody.innerHTML = rendered.html;
    }
  }

  renderJuryPanel(outlook, player, twistNote = '') {
    const panel = this.elements.juryPanel;
    if (!panel || !outlook?.total) {
      if (panel) panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    this.elements.juryCount.textContent = String(outlook.total);

    if (player?.evicted && player.isJuror) {
      this.elements.jurySummary.textContent =
        'You are on the jury. Lean scores below show how seated jurors may view each remaining houseguest when the Final 2 is set.';
    } else if (outlook.total > 0) {
      const { favor, against, neutral } = outlook.counts;
      const parts = [];
      if (favor) parts.push(`${favor} leaning your way`);
      if (against) parts.push(`${against} likely bitter`);
      if (neutral) parts.push(`${neutral} undecided`);
      let summary = parts.join(' · ');
      if (twistNote) {
        summary = `${twistNote} ${summary}`;
      }
      this.elements.jurySummary.textContent = summary;
    } else if (twistNote) {
      this.elements.jurySummary.textContent = twistNote;
    }

    this.elements.juryList.innerHTML = outlook.rows
      .map((row) => {
        const week = row.evictedWeek != null ? `Week ${row.evictedWeek}` : '—';
        return `<li class="jury-item ${row.tone}">
          <div class="jury-item-main">
            <span class="jury-name">${escapeHtml(row.juror.name)}</span>
            <span class="jury-lean ${row.tone}">${escapeHtml(row.label)}</span>
          </div>
          <div class="jury-meta">Seated ${week} · score ${row.score > 0 ? '+' : ''}${row.score}</div>
        </li>`;
      })
      .join('');
  }

  renderActions(actions, onAction) {
    this.elements.actionButtons.innerHTML = '';
    for (const action of actions) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-action';
      btn.textContent = action.label;
      btn.title = action.description || '';
      btn.addEventListener('click', () => onAction(action));
      this.elements.actionButtons.appendChild(btn);
    }
  }

  showActionDetail(html, onConfirm = null) {
    this.elements.actionDetail.classList.remove('hidden');
    this.elements.actionDetail.innerHTML = html;

    if (onConfirm) {
      const confirmBtn = this.elements.actionDetail.querySelector('[data-confirm]');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', onConfirm);
      }
    }
  }

  hideActionDetail() {
    this.elements.actionDetail.classList.add('hidden');
    this.elements.actionDetail.innerHTML = '';
  }

  buildTargetPicker(contestants, label, onSelect, excludeIds = []) {
    const targets = contestants.filter((c) => !c.evicted && !c.isPlayer && !excludeIds.includes(c.id));
    let html = `<p>${escapeHtml(label)}</p><div class="target-grid">`;
    for (const t of targets) {
      const rel = formatRelationship(window.__gamePlayer?.getRelationship(t.id) || 0);
      html += `<button class="btn target-btn" data-target="${t.id}">${escapeHtml(t.name)} (${rel})</button>`;
    }
    html += '</div>';
    return { html, targets };
  }

  showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
  }

  setActionPrompt(text) {
    this.elements.actionPrompt.textContent = text;
  }

  renderEndSummary(html) {
    this.elements.endSummary.innerHTML = html;
  }
}

// Avoid circular import — set from game.js
let StorageManagerRef = { hasSave: () => false };
export function setStorageRef(ref) {
  StorageManagerRef = ref;
}

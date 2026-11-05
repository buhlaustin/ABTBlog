import { formatMoney, stageLabel, getMonthlyTaskSlots } from './constants.js';
import { formatStateMonth, formatCalendarStamp, realClockNow, sandboxCalendarYearOptions } from './GameCalendar.js';
import { calendarTurn } from './XC.js';
import { nextRevenueMilestone } from './Progression.js';
import { renderFinancePanel } from './Fundraising.js';
import { renderCompaniesPanel } from './Acquisitions.js';
import { renderPeoplePanel } from './Staff.js';
import { renderCeoPanel } from './Ceo.js';
import { ceoPersonalCashComp } from './CeoEconomics.js';
import { renderSocialPanel, markSocialAsRead, syncSocialTabAlert } from './Social.js';
import { renderNewsPanel, markNewsAsRead, syncNewsTabAlert } from './News.js';
import { renderAdvisorPanel } from './Advisor.js';
import {
  getTaskDef,
  pendingTasks,
  canEndMonth,
  needsTaskLineup,
  selectedOfferCount
} from './Tasks.js';
import { getTaskStage, workspaceLabel, getWorkspaceTier, getArr } from './Workspace.js';
import { renderBoardPanel } from './Board.js';
import { hasActiveCrisis } from './Crisis.js';
import { hasActiveDecision, renderDeskDecisionBlock } from './DecisionEvents.js';
import { activeModifierLabels } from './ScenarioEffects.js';
import { isPublicCompany, founderStakeValue, stockHudChangeLabel } from './IPO.js';
import { stageIconUrl, applyGameBackdrop } from './Assets.js';
import { playUiClick } from './Audio.js';
import { activeTutorialStep, renderTutorialBanner } from './Tutorial.js';
import { getCategoriesSync } from './Categories.js';
import { canPivot } from './Pivot.js';
import { formatHallHighlights } from './HallOfFame.js';
import { setGameFeedback, paintGameFeedback } from './GameFeedback.js';
import { renderProductActionsPanel } from './ProductActions.js';
import { sentimentLabel, marketTrustLabel, hasInstitutionalBoard } from './Sentiment.js';
import { runwayLabel } from './MonthSummary.js';
import { competitorRevenueMult } from './Competitor.js';
import { growthCampaignSlots, growthCampaignsRemaining } from './GrowthBudget.js';
import {
  getTaskRevenueMultiplierPreview,
  getCoreTaskRevenueMult,
  getSandboxTuningMult,
  getRawTaskRevenueMultiplier,
  estimateTaskPayoutBand,
  taskRevenueMultHud
} from './Finance.js';
import { progressionTierLabel } from './ProgressionEconomy.js';
import { renderGrowthCampaignsBlock } from './GrowthCampaigns.js';
import {
  launchLifecycleActive,
  launchPhaseLabel,
  PRE_LAUNCH_BUZZ_REQUIRED,
  PRE_LAUNCH_PRODUCT_REQUIRED,
  canSchedulePublicLaunch,
  renderPreLaunchProgressBlock
} from './LaunchLifecycle.js';

const screens = {
  start: () => document.getElementById('screen-start'),
  setup: () => document.getElementById('screen-setup'),
  game: () => document.getElementById('screen-game'),
  xcInterview: () => document.getElementById('screen-xc-interview'),
  crisis: () => document.getElementById('screen-crisis'),
  gameover: () => document.getElementById('screen-gameover')
};

export function showScreen(name) {
  for (const key of Object.keys(screens)) {
    const el = screens[key]();
    if (el) el.hidden = key !== name;
  }
  if (name === 'gameover') {
    requestAnimationFrame(() => {
      document.getElementById('gameover-title')?.focus();
    });
  }
}

export function populateCategorySelect(selectEl, categories) {
  if (!selectEl) return;
  while (selectEl.options.length > 1) {
    selectEl.remove(1);
  }
  for (const cat of categories) {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.label;
    if (cat.blurb) opt.title = cat.blurb;
    selectEl.appendChild(opt);
  }
  if (categories.length > 0) {
    selectEl.value = categories[0].id;
  }
}

export function bindSandboxCashToggle(form) {
  const wrap = document.getElementById('sandbox-cash-wrap');
  const tuning = document.getElementById('sandbox-tuning-wrap');
  if (!form || !wrap) return;

  const sync = () => {
    const mode = form.querySelector('input[name="mode"]:checked')?.value;
    const sandbox = mode === 'sandbox';
    wrap.hidden = !sandbox;
    if (tuning) tuning.hidden = !sandbox;
  };

  const monthSel = document.getElementById('sandbox-start-month');
  const yearSel = document.getElementById('sandbox-start-year');
  if (yearSel && !yearSel.options.length) {
    for (const yr of sandboxCalendarYearOptions()) {
      const opt = document.createElement('option');
      opt.value = String(yr);
      opt.textContent = String(yr);
      yearSel.appendChild(opt);
    }
  }
  const now = realClockNow();
  if (monthSel) monthSel.value = String(now.monthIndex);
  if (yearSel) yearSel.value = String(now.year);

  form.addEventListener('change', sync);
  sync();
}

export function setLoadButtonEnabled(enabled) {
  const btn = document.getElementById('btn-load');
  if (!btn) return;
  btn.disabled = !enabled;
  btn.title = enabled ? 'Continue your saved company' : 'Start a new game first';
}

/** Emphasize Continue when a local save exists. */
export function syncStartScreen() {
  const loadBtn = document.getElementById('btn-load');
  const newBtn = document.getElementById('btn-new');
  const hint = document.getElementById('start-save-hint');
  const enabled = loadBtn && !loadBtn.disabled;

  if (loadBtn) {
    loadBtn.textContent = enabled ? 'Continue saved game' : 'No saved game yet';
  }
  if (newBtn && loadBtn) {
    if (enabled) {
      loadBtn.classList.add('btn-primary');
      loadBtn.classList.remove('btn-ghost');
      newBtn.classList.remove('btn-primary');
      newBtn.classList.add('btn-ghost');
    } else {
      loadBtn.classList.remove('btn-primary');
      loadBtn.classList.add('btn-ghost');
      newBtn.classList.add('btn-primary');
      newBtn.classList.remove('btn-ghost');
    }
  }
  if (hint) {
    hint.hidden = !enabled;
  }
}

export function renderGameHud(state) {
  const company = document.getElementById('hud-company');
  const stage = document.getElementById('hud-stage');
  const cash = document.getElementById('hud-cash');
  const revenue = document.getElementById('hud-revenue');
  const month = document.getElementById('hud-month');
  const mode = document.getElementById('hud-mode');
  const mrr = document.getElementById('hud-mrr');
  const stock = document.getElementById('hud-stock');

  const stageArt = document.getElementById('hud-stage-art');
  if (stageArt) {
    stageArt.src = stageIconUrl(state.stage);
    stageArt.alt = stageLabel(state.stage);
  }
  applyGameBackdrop(state);
  if (company) company.textContent = state.company.name;
  if (stage) stage.textContent = workspaceLabel(getWorkspaceTier(state));
  if (cash) cash.textContent = formatMoney(state.finance.cash);
  if (revenue) revenue.textContent = formatMoney(getArr(state));
  if (month) {
    month.textContent = formatStateMonth(state, 'hud');
  }
  if (mode) {
    const revHud = taskRevenueMultHud(state);
    const capTag = revHud.label.includes('capped') ? ' (capped)' : '';
    mode.textContent = `${state.mode === 'sandbox' ? 'Sandbox' : 'Career'} · rev×${revHud.effective.toFixed(2)}${capTag}`;
  }
  if (mrr) mrr.textContent = formatMoney(state.finance.mrr ?? 0);
  const boardTab = document.getElementById('tab-board');
  if (boardTab) {
    const showBoard = hasInstitutionalBoard(state);
    boardTab.hidden = !showBoard;
    boardTab.disabled = !showBoard;
    if (!showBoard && getActiveTabId() === 'board') {
      selectTab('desk');
    }
  }
  if (stock) {
    if (isPublicCompany(state)) {
      const pm = state.publicMarket ?? {};
      stock.hidden = false;
      const ch = stockHudChangeLabel(state);
      stock.textContent = ch
        ? `${pm.ticker ?? '—'} ${formatMoney(pm.sharePrice ?? 0)} (${ch})`
        : `${pm.ticker ?? '—'} ${formatMoney(pm.sharePrice ?? 0)}`;
    } else {
      stock.hidden = true;
    }
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function launchTaskTypeTag(def) {
  const types = def.types ?? [];
  const parts = [];
  if (types.includes('product') || (def.product ?? 0) > 0) {
    parts.push(`+${def.product ?? 0} product`);
  }
  if (types.includes('marketing') || (def.buzz ?? 0) > 0) {
    parts.push(`+${def.buzz ?? 0} buzz`);
  }
  if (!parts.length) return '';
  return ` <span class="task-tag">${parts.join(' · ')}</span>`;
}

export function renderDeskPanel(state) {
  const desk = document.getElementById('panel-desk');
  if (!desk) return;

  const taskStage = getTaskStage(state);
  const slotTarget = state.calendar?.monthTaskSlotTarget ?? getMonthlyTaskSlots(taskStage);
  const pending = pendingTasks(state);
  const done = state.calendar.tasksCompleted ?? 0;
  const milestone = nextRevenueMilestone(state);
  const ms = milestone
    ? milestone.amount != null
      ? `${milestone.label} at ${formatMoney(milestone.amount)} ARR`
      : milestone.label
    : 'All major gates cleared';

  const lineupOpen = needsTaskLineup(state);
  const offerCards = lineupOpen
    ? (state.calendar.monthTaskOffers ?? [])
        .map((offer) => {
          const def = getTaskDef(offer.taskId);
          if (!def) return '';
          const sel = offer.selected ? 'task-offer selected' : 'task-offer';
          const sig = def.signature ? ' <span class="task-tag">Signature</span>' : '';
          const launchTag = def.scheduleLaunch
            ? ` <span class="task-tag">${canSchedulePublicLaunch(state) ? 'Launch gate' : `${PRE_LAUNCH_BUZZ_REQUIRED} buzz · ${PRE_LAUNCH_PRODUCT_REQUIRED} prod`}</span>`
            : def.launchPhase === 'pre_launch'
              ? launchTaskTypeTag(def)
              : '';
          return `<article class="${sel}">
            <h3>${escapeHtml(def.title)}${sig}${launchTag}</h3>
            <p>${escapeHtml(def.description)}</p>
            <button type="button" class="btn btn-ghost btn-small" data-toggle-task-offer="${escapeHtml(offer.offerId)}">${offer.selected ? 'Selected' : 'Select'}</button>
          </article>`;
        })
        .join('')
    : '';

  const taskCards = (state.calendar.monthTasks ?? [])
    .map((inst) => {
      const def = getTaskDef(inst.taskId);
      if (!def) return '';
      const doneClass = inst.status === 'done' ? 'task-card done' : 'task-card';
      const btn =
        inst.status === 'pending'
          ? `<button type="button" class="btn btn-primary btn-small" data-complete-task="${escapeHtml(inst.instanceId)}">Complete</button>`
          : '<span class="task-done-label">Done</span>';
      const band = estimateTaskPayoutBand(def, state);
      const sig = def.signature ? ' <span class="task-tag">Signature</span>' : '';
      const rival =
        def.rivalPressure && def.rivalPressure < 0
          ? ` · rival heat ${def.rivalPressure}`
          : '';
      const preHint =
        def.launchPhase === 'pre_launch' ? ` · ${launchTaskTypeTag(def).replace(/<[^>]+>/g, '').trim()}` : '';
      return `<article class="${doneClass}">
        <h3>${escapeHtml(def.title)}${sig}</h3>
        <p>${escapeHtml(def.description)}</p>
        <p class="task-meta">Cost ~${formatMoney(def.cost)} · Typical payout ${formatMoney(band.min)}–${formatMoney(band.max)} at ${getTaskRevenueMultiplierPreview(state).toFixed(2)}×${rival}${preHint}</p>
        ${btn}
      </article>`;
    })
    .join('');

  const catalogError = state.calendar?.taskCatalogError;
  const endDisabled = !canEndMonth(state);
  const monthRev = state.calendar.monthRevenue ?? 0;
  const monthSpend = state.calendar.monthSpend ?? 0;

  const tutorial = renderTutorialBanner(activeTutorialStep(state));
  const launchBanner = launchLifecycleActive(state)
    ? `<p class="fine-print launch-phase-banner"><strong>${escapeHtml(launchPhaseLabel(state) ?? 'Pre-launch')}</strong> — engineering raises product level; marketing raises buzz. Schedule launch at <strong>${PRE_LAUNCH_BUZZ_REQUIRED}+ buzz</strong> and <strong>product ${PRE_LAUNCH_PRODUCT_REQUIRED}+</strong>. Pre-sell revenue is normal desk cash. Graduate after post-launch or leaving the garage.</p>`
    : '';
  const preLaunchProgress = renderPreLaunchProgressBlock(state);

  desk.innerHTML = `
    ${tutorial}
    ${launchBanner}
    ${preLaunchProgress}
    ${
      catalogError
        ? '<p class="desk-feedback error" role="alert">Tasks did not load — reload the page. You cannot close the month until the desk is full.</p>'
        : ''
    }
    ${
      hasActiveCrisis(state)
        ? '<p class="desk-feedback error" role="alert">Crisis on the desk — resolve it before closing the month.</p>'
        : ''
    }
    ${
      hasActiveDecision(state)
        ? '<p class="desk-feedback error" role="alert">Strategic decision pending — pick an option below before closing the month.</p>'
        : ''
    }
    ${renderDeskDecisionBlock(state)}
    <p class="panel-lede">Pick ${slotTarget} tasks from this month’s offers, complete them, then close the month. <span class="fine-print">Shortcuts: 1–9 switch tabs, M close month.</span></p>
    <div class="summary-grid">
      <div><span class="stat-label">Tasks</span><span class="stat-value">${done} / ${slotTarget}</span></div>
      <div><span class="stat-label">This month</span><span class="stat-value">+${formatMoney(monthRev)} / -${formatMoney(monthSpend)}</span></div>
      <div><span class="stat-label">Next gate</span><span class="stat-value">${escapeHtml(ms)}</span></div>
      <div><span class="stat-label">Pending</span><span class="stat-value">${pending.length}</span></div>
      <div><span class="stat-label">Scale era</span><span class="stat-value">${escapeHtml(progressionTierLabel(state))}</span></div>
      ${(() => {
        const revHud = taskRevenueMultHud(state);
        const titleAttr = revHud.title ? ` title="${escapeHtml(revHud.title)}"` : '';
        return `<div><span class="stat-label">${escapeHtml(revHud.label)}</span><span class="stat-value"${titleAttr}>${revHud.effective.toFixed(2)}×</span></div>`;
      })()}
    </div>
    ${
      lineupOpen
        ? `<section class="task-offers"><h3 class="log-head">This month’s offers (${selectedOfferCount(state)} / ${slotTarget} selected)</h3><div class="task-list">${offerCards}</div>
        <button type="button" id="btn-confirm-task-lineup" class="btn btn-primary btn-small" ${selectedOfferCount(state) === slotTarget ? '' : 'disabled'}>Lock desk lineup</button></section>`
        : ''
    }
    <div class="task-list">${taskCards || (lineupOpen ? '<div class="tab-placeholder">Lock your lineup to start working tasks.</div>' : '<div class="tab-placeholder">No tasks dealt.</div>')}</div>
    <div class="desk-actions">
      <button type="button" id="btn-end-month" class="btn btn-primary" ${endDisabled ? 'disabled' : ''} title="${endDisabled ? 'Finish remaining tasks first' : 'Apply overhead and start next month'}">Close month</button>
      <p id="desk-feedback" class="desk-feedback" hidden></p>
    </div>
    <section class="month-log">
      <h3 class="log-head">Recent log</h3>
      <ul>${(state.calendar.log ?? [])
        .slice(0, 6)
        .map(
          (e) =>
            `<li><span class="log-when">${escapeHtml(formatCalendarStamp(e.year, e.month))}</span> ${escapeHtml(e.message)}</li>`
        )
        .join('') || '<li class="muted">No events yet.</li>'}</ul>
    </section>
  `;
}

export function showDeskFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}

export const TAB_ORDER = [
  'desk',
  'product',
  'growth',
  'people',
  'ceo',
  'finance',
  'companies',
  'board',
  'social',
  'news',
  'advisor'
];

export function selectTab(tabId) {
  const nav = document.getElementById('game-tabs');
  if (!nav) return;
  if (!nav.querySelector(`[data-tab="${tabId}"]`)) return;
  activateTab(nav, tabId);
  playUiClick();
}

let panelStateProvider = null;

export function setPanelStateProvider(fn) {
  panelStateProvider = fn;
}

function getActiveTabId() {
  return document.querySelector('#game-tabs [data-tab][aria-selected="true"]')?.dataset?.tab ?? 'desk';
}

function renderPanelForTab(tab, state) {
  switch (tab) {
    case 'desk':
      renderDeskPanel(state);
      break;
    case 'product':
      renderProductPanel(document.getElementById('panel-product'), state);
      break;
    case 'growth':
      renderGrowthPanel(document.getElementById('panel-growth'), state);
      break;
    case 'people':
      renderPeoplePanel(document.getElementById('panel-people'), state);
      break;
    case 'ceo':
      renderCeoPanel(document.getElementById('panel-ceo'), state);
      break;
    case 'finance':
      renderFinancePanel(document.getElementById('panel-finance'), state);
      break;
    case 'companies':
      renderCompaniesPanel(document.getElementById('panel-companies'), state);
      break;
    case 'board':
      renderBoardPanel(document.getElementById('panel-board'), state);
      break;
    case 'social':
      renderSocialPanel(document.getElementById('panel-social'), state);
      break;
    case 'news':
      renderNewsPanel(document.getElementById('panel-news'), state);
      break;
    case 'advisor':
      renderAdvisorPanel(document.getElementById('panel-advisor'), state);
      break;
    default:
      break;
  }
}

export function markAllPanelsStale() {
  /* Panels re-render when their tab is selected; desk + HUD refresh every tick. */
}

function activateTab(nav, tab) {
  let activeBtn = null;
  nav.querySelectorAll('[data-tab]').forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
    b.tabIndex = active ? 0 : -1;
    if (active) activeBtn = b;
  });
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    const active = panel.dataset.panel === tab;
    panel.hidden = !active;
    panel.tabIndex = active ? 0 : -1;
  });
  activeBtn?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  const state = panelStateProvider?.();
  if (state) {
    if (tab === 'news') markNewsAsRead(state);
    if (tab === 'social') markSocialAsRead(state);
    renderPanelForTab(tab, state);
    if (tab === 'news') syncNewsTabAlert(state);
    if (tab === 'social') syncSocialTabAlert(state);
  }
}

export function bindTabNavigation() {
  const nav = document.getElementById('game-tabs');
  if (!nav) return;

  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    activateTab(nav, btn.dataset.tab);
    playUiClick();
  });

  nav.addEventListener('keydown', (e) => {
    const tabs = [...nav.querySelectorAll('[data-tab]')];
    const current = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    if (current < 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      tabs[(current + 1) % tabs.length].click();
      tabs[(current + 1) % tabs.length].focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      tabs[(current - 1 + tabs.length) % tabs.length].click();
      tabs[(current - 1 + tabs.length) % tabs.length].focus();
    }
  });
}

export function bindGameKeyboardShortcuts(getSession, onCloseMonth) {
  document.addEventListener('keydown', (e) => {
    const state = getSession?.();
    const gameScreen = document.getElementById('screen-game');
    if (!state || gameScreen?.hidden) return;

    const tag = e.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable) {
      return;
    }
    if (document.getElementById('month-summary-dialog')?.open) return;

    const num = Number(e.key);
    if (num >= 1 && num <= 9 && !e.altKey && !e.ctrlKey && !e.metaKey) {
      const tab = TAB_ORDER[num - 1];
      if (tab) {
        e.preventDefault();
        selectTab(tab);
      }
      return;
    }
    if (e.key === '0' && !e.altKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      selectTab('advisor');
      return;
    }

    if ((e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (canEndMonth(state)) {
        e.preventDefault();
        onCloseMonth?.();
      }
    }
  });
}

export function syncContinueOnOpenOffer(hasSave) {
  const offer = document.getElementById('start-continue-offer');
  if (!offer) return;
  const dismissed = sessionStorage.getItem('startup_sim_resume_dismissed') === '1';
  offer.hidden = !hasSave || dismissed;
}

export function renderAllPanels(state) {
  const saveHint = document.getElementById('save-status');
  if (saveHint && !saveHint.classList.contains('error')) {
    saveHint.hidden = false;
    if (saveHint.textContent !== 'Saved locally' && saveHint.textContent !== 'Save failed') {
      saveHint.textContent = 'Progress saved';
    }
  }
  renderGameHud(state);
  syncNewsTabAlert(state);
  syncSocialTabAlert(state);
  renderDeskPanel(state);
  const active = getActiveTabId();
  if (active !== 'desk') {
    renderPanelForTab(active, state);
  }
  paintGameFeedback();
}

export function renderGrowthPanel(container, state) {
  if (!container) return;
  const rival = state.world?.competitor;
  const pressure = rival?.pressure ?? 0;
  const revMult = competitorRevenueMult(state);
  const buzz = state.product?.buzz ?? 0;
  const sentiment = state.sentiment?.score ?? 68;
  const lastReason = state.sentiment?.lastReason;
  const pendingDesk = (state.calendar?.monthTasks ?? []).filter((t) => t.status === 'pending').length;

  const coreMult = getCoreTaskRevenueMult(state);
  const tuneMult = getSandboxTuningMult(state);
  const revHud = taskRevenueMultHud(state);
  const totalMult = revHud.effective;
  const rawMult = getRawTaskRevenueMultiplier(state);
  const era = progressionTierLabel(state);
  const growthRuns = (state.growth?.campaignsThisMonth ?? []).length;
  const growthSlots = growthCampaignSlots(state);
  const growthLeft = growthCampaignsRemaining(state);
  const capNote = revHud.label.includes('capped')
    ? ` · uncapped stack ${rawMult.toFixed(1)}× → <strong>${totalMult.toFixed(2)}× cap</strong>`
    : '';
  const modLabels = activeModifierLabels(state);
  const modNote = modLabels.length
    ? `<p class="fine-print"><strong>Active fallout:</strong> ${modLabels.map((l) => escapeHtml(l)).join(' · ')}</p>`
    : '';
  const trustScore = state.sentiment?.score ?? 68;
  const trustNote = hasInstitutionalBoard(state)
    ? ''
    : `<p class="fine-print"><strong>Market trust</strong> ${trustScore} — ${escapeHtml(marketTrustLabel(trustScore))}. Crises and desk decisions move this score; Series A needs at least 32.</p>`;
  const multNote =
    state.mode === 'sandbox' && tuneMult !== 1
      ? `<p class="fine-print"><strong>${escapeHtml(era)}</strong> — desk &amp; Growth: <strong>${coreMult.toFixed(2)}×</strong> progression × <strong>${tuneMult.toFixed(2)}×</strong> sandbox = <strong>${totalMult.toFixed(2)}×</strong>${capNote} · growth slots ${growthLeft}/${growthSlots} left${growthRuns ? ` (${growthRuns} launched)` : ''}.</p>`
      : `<p class="fine-print"><strong>${escapeHtml(era)}</strong> — ${revHud.label.includes('capped') ? 'Rev× (capped)' : 'effective multiplier'} <strong>${totalMult.toFixed(2)}×</strong>${capNote}${growthRuns ? ` · ${growthRuns}/${growthSlots} growth slot(s) used` : ` · ${growthLeft}/${growthSlots} growth slot(s) left`}.</p>`;

  container.innerHTML = `
    <p class="panel-lede">Market position for ${escapeHtml(state.company.categoryLabel)} — desk tasks and paid campaigns below share the same multiplier math.</p>
    ${trustNote}
    ${modNote}
    ${multNote}
    <div class="summary-grid">
      <div><span class="stat-label">Rival</span><span class="stat-value">${escapeHtml(rival?.name ?? '—')}</span></div>
      <div><span class="stat-label">Heat</span><span class="stat-value">${pressure}/5</span></div>
      <div><span class="stat-label">Rev. modifier</span><span class="stat-value">${(revMult * 100).toFixed(0)}%</span></div>
      <div><span class="stat-label">Buzz</span><span class="stat-value">${buzz}</span></div>
      ${
        hasInstitutionalBoard(state)
          ? `<div><span class="stat-label">Board approval</span><span class="stat-value">${sentiment} — ${escapeHtml(sentimentLabel(sentiment))}</span></div>`
          : `<div><span class="stat-label">Runway</span><span class="stat-value">${escapeHtml(runwayLabel(state))}</span></div>`
      }
      <div><span class="stat-label">Desk tasks left</span><span class="stat-value">${pendingDesk}</span></div>
    </div>
    ${
      rival
        ? `<p class="fine-print"><strong>${escapeHtml(rival.name)}</strong> sells ${escapeHtml(rival.product)}. Strong revenue months, marketing desk tasks, and growth campaigns cool heat. Buzz decays each month — keep shipping.</p>`
        : ''
    }
    ${
      hasInstitutionalBoard(state) && lastReason
        ? `<p class="fine-print">Latest board note: ${escapeHtml(lastReason)}</p>`
        : '<p class="fine-print">Desk tasks scale with funding rounds and HQ tier. Paid campaigns below do not use desk slots.</p>'
    }
    ${renderGrowthCampaignsBlock(state)}
  `;
}

export function renderProductPanel(container, state) {
  if (!container) return;
  const pivotAllowed = canPivot(state);
  const categories = getCategoriesSync();
  const options = categories
    .filter((c) => c.id !== state.company.categoryId)
    .map(
      (c) =>
        `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`
    )
    .join('');

  const pivotBlock = pivotAllowed
    ? `<form id="pivot-form" class="setup-form finance-action">
        <p><strong>One-time pivot</strong> — reposition the company (buzz hit${hasInstitutionalBoard(state) ? '; board approval drops if you have a board' : ''}).</p>
        <label for="pivot-category">New industry</label>
        <select id="pivot-category" name="pivotCategory" required>
          <option value="" disabled selected>Choose new positioning…</option>
          ${options}
        </select>
        <button type="submit" class="btn btn-primary btn-small">Pivot company</button>
      </form>
      <p id="pivot-feedback" class="desk-feedback" hidden></p>`
    : state.flags?.pivotUsed
      ? '<p class="fine-print">You already used your one-time pivot this run.</p>'
      : '';

  container.innerHTML = `
    <p class="panel-lede">A stronger product makes desk tasks pay better — level up by shipping product work on the desk.</p>
    <div class="summary-grid">
      <div><span class="stat-label">Product level</span><span class="stat-value">${state.product.level ?? 0}</span></div>
      <div><span class="stat-label">Buzz</span><span class="stat-value">${state.product.buzz ?? 0}</span></div>
      <div><span class="stat-label">Industry</span><span class="stat-value">${escapeHtml(state.company.categoryLabel)}</span></div>
    </div>
    ${pivotBlock}
    <div id="product-actions-mount"></div>
  `;
  renderProductActionsPanel(document.getElementById('product-actions-mount'), state);
}

export function renderGameOver(state) {
  const title = document.getElementById('gameover-title');
  const body = document.getElementById('gameover-body');
  const exportBtn = document.getElementById('btn-export-run');
  const eyebrow = document.querySelector('#screen-gameover .eyebrow');
  const victory = state.ending?.type === 'cash_out';
  if (exportBtn) exportBtn.hidden = false;

  if (eyebrow) eyebrow.textContent = victory ? 'CEO step-down' : 'Run ended';
  if (title) title.textContent = state.company.name;
  if (body) {
    const months = Math.max(0, calendarTurn(state) - 1);
    if (victory) {
      const e = state.ending;
      body.innerHTML = `
        <p>${escapeHtml(state.flags.gameOverReason || '')}</p>
        ${
          e.pressHeadline
            ? `<blockquote class="ipo-press"><strong>${escapeHtml(e.pressHeadline)}</strong><br>${escapeHtml(e.pressDek || '')}</blockquote>`
            : ''
        }
        ${
          state.meta?.hofHighlights?.length
            ? `<p class="hof-highlight">${escapeHtml(formatHallHighlights(state.meta.hofHighlights))}</p>`
            : ''
        }
        <div class="summary-grid gameover-stats">
          <div><span class="stat-label">Stock cash-out</span><span class="stat-value">${formatMoney(e.payout)}</span></div>
          <div><span class="stat-label">CEO salary (career)</span><span class="stat-value">${formatMoney(e.ceoSalaryCareer ?? 0)}</span></div>
          <div><span class="stat-label">Owner draws</span><span class="stat-value">${formatMoney(e.ceoOwnerDraws ?? 0)}</span></div>
          <div><span class="stat-label">Personal bank</span><span class="stat-value">${formatMoney(e.ceoBankBalance ?? 0)}</span></div>
          <div><span class="stat-label">Total personal cash</span><span class="stat-value">${formatMoney(e.totalCareerCashComp ?? e.payout)}</span></div>
          <div><span class="stat-label">Share price</span><span class="stat-value">${formatMoney(e.sharePrice)}</span></div>
          <div><span class="stat-label">Founder stake</span><span class="stat-value">${e.founderPct}%</span></div>
          <div><span class="stat-label">Months public</span><span class="stat-value">${e.monthsPublic}</span></div>
          <div><span class="stat-label">Lifetime revenue</span><span class="stat-value">${formatMoney(e.lifetimeRevenue)}</span></div>
          <div><span class="stat-label">Months played</span><span class="stat-value">${months}</span></div>
        </div>
      `;
    } else {
      body.innerHTML = `
        ${
          state.meta?.hofHighlights?.length
            ? `<p class="hof-highlight">${escapeHtml(formatHallHighlights(state.meta.hofHighlights))}</p>`
            : ''
        }
        <p>${escapeHtml(state.flags.gameOverReason || 'Your run ended.')}</p>
        <p>Lifetime revenue: <strong>${formatMoney(state.finance.lifetimeRevenue)}</strong></p>
        <p>CEO cash comp this run: <strong>${formatMoney(ceoPersonalCashComp(state))}</strong> (salary + owner draws)</p>
        <p>Months played: <strong>${months}</strong></p>
        ${
          isPublicCompany(state)
            ? `<p>Founder stake at exit price: <strong>${formatMoney(founderStakeValue(state))}</strong></p>`
            : ''
        }
      `;
    }
  }
}

export function flashSaveStatus(ok) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = ok ? 'Saved' : 'Save failed';
  el.classList.toggle('error', !ok);
  el.hidden = false;
  if (ok) {
    setTimeout(() => {
      if (el.textContent === 'Saved') {
        el.textContent = 'Progress saved';
      }
    }, 2500);
  }
}

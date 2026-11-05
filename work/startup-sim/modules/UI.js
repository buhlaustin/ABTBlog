import { formatMoney, stageLabel, getMonthlyTaskSlots } from './constants.js';
import {
  formatStateMonth,
  formatCalendarStamp,
  realClockNow,
  sandboxCalendarYearOptions
} from './GameCalendar.js';
import { calendarTurn } from './XC.js';
import { nextRevenueMilestone } from './Progression.js';
import { renderFinancePanel } from './Fundraising.js';
import { renderCompaniesPanel } from './Acquisitions.js';
import { renderPeoplePanel } from './EmployeeBenefits.js';
import { renderCeoPanel } from './Ceo.js';
import { ceoPersonalCashComp } from './CeoEconomics.js';
import { renderNewsPanel, markNewsAsRead, syncNewsTabAlert } from './News.js';
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
import { panelStatCard } from './PanelChrome.js';
import {
  renderProductActionsPanel,
  sideTaskBankSize,
  canBuyAllRemainingSideTasks,
  productActionsRemaining,
  sideTaskPlaysPerMonth
} from './ProductActions.js';
import {
  renderGrowthCampaignsBlock,
  canBuyAllRemainingGrowthCampaigns
} from './GrowthCampaigns.js';

/** Side levers + product levers share one monthly play counter. */
const SIDE_TASK_FOCUS_ALL = ['product', 'growth', 'brand', 'both'];
import { sentimentLabel, marketTrustLabel, hasInstitutionalBoard } from './Sentiment.js';
import { runwayLabel, runwayDetail } from './MonthSummary.js';
import { competitorRevenueMult } from './Competitor.js';
import { growthCampaignSlots, growthCampaignsRemaining } from './GrowthBudget.js';
import { formatMonthlySideTaskLimit } from './SideTaskProgression.js';
import {
  getTaskRevenueMultiplierPreview,
  getCoreTaskRevenueMult,
  getSandboxTuningMult,
  getRawTaskRevenueMultiplier,
  estimateTaskPayoutBand,
  estimateEraRevenuePotential,
  estimateTaskMrrBand,
  taskRevenueMultHud
} from './Finance.js';
import { progressionTierLabel } from './ProgressionEconomy.js';
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
  if (def.crowdfunding) parts.push('crowdfund');
  if (types.includes('product') || (def.product ?? 0) > 0) {
    parts.push(`+${def.product ?? 0} product`);
  }
  if (types.includes('marketing') || (def.buzz ?? 0) > 0) {
    parts.push(`+${def.buzz ?? 0} buzz`);
  }
  const mrrBand = estimateTaskMrrBand(def);
  if (mrrBand) {
    parts.push(`+${formatMoney(mrrBand.min)}–${formatMoney(mrrBand.max)}/mo MRR`);
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
          const whale = def.whale === true
              ? ' <span class="task-tag">Whale</span>'
              : '';
          const launchTag = def.scheduleLaunch
            ? ` <span class="task-tag">${canSchedulePublicLaunch(state) ? 'Launch gate' : `${PRE_LAUNCH_BUZZ_REQUIRED} buzz · ${PRE_LAUNCH_PRODUCT_REQUIRED} prod`}</span>`
            : def.xcDemoDay
              ? ' <span class="task-tag">Demo Day</span>'
              : def.launchPhase === 'pre_launch'
                ? launchTaskTypeTag(def)
                : '';
          return `<article class="${sel}">
            <h3>${escapeHtml(def.title)}${sig}${whale}${launchTag}</h3>
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
      const mrrBand = estimateTaskMrrBand(def);
      const sig = def.signature ? ' <span class="task-tag">Signature</span>' : '';
      const whale = def.whale === true
          ? ' <span class="task-tag">Whale</span>'
          : '';
      const crowd = def.crowdfunding ? ' <span class="task-tag">Crowdfunding</span>' : '';
      const rival =
        def.rivalPressure && def.rivalPressure < 0
          ? ` · rival heat ${def.rivalPressure}`
          : '';
      const preHint =
        def.launchPhase === 'pre_launch' ? ` · ${launchTaskTypeTag(def).replace(/<[^>]+>/g, '').trim()}` : '';
      const mrrHint = mrrBand
        ? ` · MRR +${formatMoney(mrrBand.min)}–${formatMoney(mrrBand.max)}/mo`
        : '';
      return `<article class="${doneClass}">
        <h3>${escapeHtml(def.title)}${sig}${whale}${crowd}</h3>
        <p>${escapeHtml(def.description)}</p>
        <p class="task-meta">Cost ~${formatMoney(def.cost)} · Typical payout ${formatMoney(band.min)}–${formatMoney(band.max)} at ${getTaskRevenueMultiplierPreview(state).toFixed(2)}×${mrrHint}${rival}${preHint}${def.stockPct && isPublicCompany(state) ? ` · stock ${def.stockPct > 0 ? '+' : ''}${Math.round(Number(def.stockPct) * 100)}%` : ''}</p>
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

  const revHud = taskRevenueMultHud(state);
  const era = estimateEraRevenuePotential(state);
  const eraChip = `Desk ${formatMoney(era.desk[0])}–${formatMoney(era.desk[1])} · growth ${formatMoney(era.growth[0])}–${formatMoney(era.growth[1])} at ${era.mult.toFixed(2)}×`;
  const revMultTitle = revHud.title ? ` title="${escapeHtml(revHud.title)}"` : '';

  desk.innerHTML = `
    <div class="desk-panel finance-panel">
      ${tutorial}
      ${launchBanner}
      ${preLaunchProgress}
      ${
        catalogError
          ? '<div class="finance-alert" role="alert">Tasks did not load — reload the page. You cannot close the month until the desk is full.</div>'
          : ''
      }
      ${
        hasActiveCrisis(state)
          ? '<div class="finance-alert" role="alert">Crisis on the desk — resolve it before closing the month.</div>'
          : ''
      }
      ${
        hasActiveDecision(state)
          ? '<div class="finance-alert" role="alert">Strategic decision pending — pick an option below before closing the month.</div>'
          : ''
      }
      ${renderDeskDecisionBlock(state)}
      <div class="finance-hero desk-hero">
        <p class="panel-lede">Pick ${slotTarget} tasks from this month’s offers, complete them, then close the month. <span class="fine-print">Shortcuts: 1–9 switch tabs, M close month.</span></p>
        <p class="finance-mult-chip">${escapeHtml(eraChip)}</p>
      </div>
      <div class="finance-kpi-row desk-kpi-row" aria-label="Desk progress">
        ${panelStatCard('Tasks done', `${done} / ${slotTarget}`, { hero: true })}
        ${panelStatCard('Pending', String(pending.length))}
        ${panelStatCard('Month revenue', `+${formatMoney(monthRev)}`, { tone: 'pos' })}
        ${panelStatCard('Month spend', `−${formatMoney(monthSpend)}`, { tone: monthSpend > 0 ? 'neg' : null })}
        ${panelStatCard(revHud.label, `${revHud.effective.toFixed(2)}×`)}
      </div>
      <details class="finance-details desk-gate-details">
        <summary>Next gate &amp; scale era</summary>
        <p class="fine-print"><strong>Next gate:</strong> ${escapeHtml(ms)} · <strong>Era:</strong> ${escapeHtml(progressionTierLabel(state))}<span class="desk-rev-mult-hint"${revMultTitle}> · ${escapeHtml(revHud.label)} ${revHud.effective.toFixed(2)}×</span></p>
      </details>
      ${
        lineupOpen
          ? `<section class="finance-section desk-offers-section">
          <div class="finance-section-head">
            <h3 class="finance-section-title">This month’s offers</h3>
            <span class="growth-channel-badge growth-channel-badge--inline">${selectedOfferCount(state)} / ${slotTarget} selected</span>
          </div>
          <div class="task-list">${offerCards}</div>
          <button type="button" id="btn-confirm-task-lineup" class="btn btn-primary btn-small" ${selectedOfferCount(state) === slotTarget ? '' : 'disabled'}>Lock desk lineup</button>
        </section>`
          : ''
      }
      <section class="finance-section desk-tasks-section">
        <h3 class="finance-section-title">Active desk</h3>
        <div class="task-list">${taskCards || (lineupOpen ? '<div class="tab-placeholder">Lock your lineup to start working tasks.</div>' : '<div class="tab-placeholder">No tasks dealt.</div>')}</div>
      </section>
      <div class="desk-actions finance-action desk-close-bar">
        <button type="button" id="btn-end-month" class="btn btn-primary" ${endDisabled ? 'disabled' : ''} title="${endDisabled ? 'Finish remaining tasks first' : 'Apply overhead and start next month'}">Close month</button>
        <p id="desk-feedback" class="desk-feedback" hidden></p>
      </div>
      <details class="finance-details desk-log-details">
        <summary>Recent log</summary>
        <ul class="desk-log-list">${(state.calendar.log ?? [])
          .slice(0, 6)
          .map(
            (e) =>
              `<li><span class="log-when">${escapeHtml(formatCalendarStamp(e.year, e.month))}</span> ${escapeHtml(e.message)}</li>`
          )
          .join('') || '<li class="muted">No events yet.</li>'}</ul>
      </details>
    </div>
  `;
}

export function showDeskFeedback(message, isError = false) {
  setGameFeedback(message, isError);
}

export const TAB_ORDER = [
  'desk',
  'growth',
  'people',
  'ceo',
  'finance',
  'companies',
  'board',
  'news'
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
    case 'news':
      renderNewsPanel(document.getElementById('panel-news'), state);
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
    renderPanelForTab(tab, state);
    if (tab === 'news') syncNewsTabAlert(state);
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
  renderDeskPanel(state);
  const active = getActiveTabId();
  if (active !== 'desk') {
    renderPanelForTab(active, state);
  }
  paintGameFeedback();
}

function growthStatCard(label, value, { hero = false, id = null } = {}) {
  const classes = ['finance-stat-card'];
  if (hero) classes.push('finance-stat-card--hero');
  const idAttr = id ? ` id="${escapeHtml(id)}"` : '';
  return `<div class="${classes.join(' ')}"><span class="finance-stat-label">${escapeHtml(label)}</span><span class="finance-stat-value"${idAttr}>${value}</span></div>`;
}

function growthSlotLabel(remaining, limit) {
  if (remaining === Infinity || !Number.isFinite(limit)) return 'Unlimited';
  return `${remaining}/${formatMonthlySideTaskLimit(limit)}`;
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
  const sideSlots = sideTaskPlaysPerMonth(state);
  const sideLeft = productActionsRemaining(state);
  const sideUsed = state.product?.actionsThisMonth ?? 0;
  const sideSlotDisplay = growthSlotLabel(sideLeft, sideSlots);
  const campaignSlotDisplay = growthSlotLabel(growthLeft, growthSlots);
  const multChip =
    state.mode === 'sandbox' && tuneMult !== 1
      ? `${escapeHtml(era)} · desk &amp; growth ${coreMult.toFixed(2)}× × sandbox ${tuneMult.toFixed(2)}× = ${totalMult.toFixed(2)}×`
      : `${escapeHtml(era)} · ${revHud.label.includes('capped') ? 'Rev× capped' : 'Rev×'} ${totalMult.toFixed(2)}×${
          revHud.label.includes('capped') ? ` (stack ${rawMult.toFixed(1)}×)` : ''
        }`;
  const modLabels = activeModifierLabels(state);
  const modNote = modLabels.length
    ? `<div class="finance-alert"><strong>Active fallout:</strong> ${modLabels.map((l) => escapeHtml(l)).join(' · ')}</div>`
    : '';
  const trustScore = state.sentiment?.score ?? 68;
  const trustNote = hasInstitutionalBoard(state)
    ? ''
    : `<p class="fine-print"><strong>Market trust</strong> ${trustScore} — ${escapeHtml(marketTrustLabel(trustScore))}. Crises and desk decisions move this score; Series A needs at least 32.</p>`;

  const pivotAllowed = canPivot(state);
  const categories = getCategoriesSync();
  const pivotOptions = categories
    .filter((c) => c.id !== state.company.categoryId)
    .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
    .join('');
  const pivotBlock = pivotAllowed
    ? `<form id="pivot-form" class="setup-form finance-action">
        <p><strong>One-time pivot</strong> — reposition the company (buzz hit${hasInstitutionalBoard(state) ? '; board approval drops if you have a board' : ''}).</p>
        <label for="pivot-category">New industry</label>
        <select id="pivot-category" name="pivotCategory" required>
          <option value="" disabled selected>Choose new positioning…</option>
          ${pivotOptions}
        </select>
        <button type="submit" class="btn btn-primary btn-small">Pivot company</button>
      </form>
      <p id="pivot-feedback" class="desk-feedback" hidden></p>`
    : state.flags?.pivotUsed
      ? '<p class="fine-print">You already used your one-time pivot this run.</p>'
      : '';

  const sideBuyAllDisabled = canBuyAllRemainingSideTasks(state, SIDE_TASK_FOCUS_ALL) ? '' : ' disabled';
  const paidBuyAllDisabled = canBuyAllRemainingGrowthCampaigns(state) ? '' : ' disabled';
  const sideBank = sideTaskBankSize(SIDE_TASK_FOCUS_ALL);
  const productLevel = state.product?.level ?? 0;

  const contextDetails = `<details class="finance-details growth-context-details">
    <summary>Market context &amp; desk</summary>
    <div class="summary-grid growth-context-grid">
      <div><span class="stat-label">Rival</span><span class="stat-value">${escapeHtml(rival?.name ?? '—')}</span></div>
      <div><span class="stat-label">Heat</span><span class="stat-value">${pressure}/5</span></div>
      <div><span class="stat-label">Rev. modifier</span><span class="stat-value">${(revMult * 100).toFixed(0)}%</span></div>
      ${
        hasInstitutionalBoard(state)
          ? `<div><span class="stat-label">Board approval</span><span class="stat-value">${sentiment} — ${escapeHtml(sentimentLabel(sentiment))}</span></div>`
          : `<div><span class="stat-label">Runway</span><span class="stat-value">${escapeHtml(runwayLabel(state))}</span></div>`
      }
      <div><span class="stat-label">Desk tasks left</span><span class="stat-value">${pendingDesk}</span></div>
      <div><span class="stat-label">Industry</span><span class="stat-value">${escapeHtml(state.company.categoryLabel)}</span></div>
    </div>
    ${
      !hasInstitutionalBoard(state)
        ? `<p class="fine-print">${escapeHtml(runwayDetail(state))}</p>`
        : ''
    }
    ${
      rival
        ? `<p class="fine-print"><strong>${escapeHtml(rival.name)}</strong> sells ${escapeHtml(rival.product)}. Marketing desk tasks and growth campaigns cool rival heat. Buzz decays each month.</p>`
        : ''
    }
    ${
      hasInstitutionalBoard(state) && lastReason
        ? `<p class="fine-print">Latest board note: ${escapeHtml(lastReason)}</p>`
        : '<p class="fine-print">Desk tasks use monthly desk slots. Side plays and paid campaigns below do not.</p>'
    }
  </details>`;

  container.innerHTML = `
    <div class="growth-panel finance-panel">
      <div class="finance-hero">
        <p class="panel-lede">Growth for ${escapeHtml(state.company.categoryLabel)} — two cash channels outside desk tasks, both scaled by the same Rev× multiplier.</p>
        <p class="finance-mult-chip">${multChip}</p>
      </div>
      <div class="finance-kpi-row growth-kpi-row" aria-label="Traction and monthly limits">
        ${growthStatCard('Product level', String(productLevel), { hero: true, id: 'growth-stat-product-level' })}
        ${growthStatCard('Buzz', String(buzz), { id: 'growth-stat-buzz' })}
        ${growthStatCard('Side plays left', sideSlotDisplay, { id: 'growth-stat-side-slots' })}
        ${growthStatCard('Campaigns left', campaignSlotDisplay)}
        ${growthStatCard('Rev× on payouts', `${totalMult.toFixed(2)}×`)}
      </div>
      <p class="fine-print growth-context-visible">
        <strong>Rival</strong> ${escapeHtml(rival?.name ?? '—')} · heat ${pressure}/5 ·
        ${
          hasInstitutionalBoard(state)
            ? `<strong>Board</strong> ${sentiment} — ${escapeHtml(sentimentLabel(sentiment))}`
            : `<strong>Runway</strong> ${escapeHtml(runwayLabel(state))}`
        }
      </p>
      <div class="growth-channel-compare" role="note">
        <div class="growth-channel-card growth-channel-card--side">
          <p class="growth-channel-title"><span class="growth-channel-badge">Side plays</span></p>
          <p class="fine-print">Cheaper levers for <strong>buzz</strong> and <strong>product</strong>. Pick any unlocked play from the bank (${sideBank} in roster). Uses the side-play meter — capped at the same monthly ceiling as campaigns.</p>
          <button type="button" class="btn btn-primary btn-small" data-buy-all-side${sideBuyAllDisabled}>Buy all side plays</button>
        </div>
        <div class="growth-channel-card growth-channel-card--paid">
          <p class="growth-channel-title"><span class="growth-channel-badge">Paid campaigns</span></p>
          <p class="fine-print">Larger spends for <strong>revenue book</strong> (and buzz). Rotating monthly roster with a 12-month cooldown. Uses the campaign meter${growthRuns ? ` — ${growthRuns} launched this month` : ''}.</p>
          <button type="button" class="btn btn-primary btn-small" data-buy-all-growth${paidBuyAllDisabled}>Buy all paid campaigns</button>
        </div>
      </div>
      ${trustNote}
      ${modNote}
      ${contextDetails}
      ${pivotBlock}
      <div id="growth-levers-mount"></div>
      <div id="growth-campaigns-mount"></div>
    </div>
  `;
  renderProductActionsPanel(document.getElementById('growth-levers-mount'), state, {
    heading: 'Side plays',
    focusFilter: SIDE_TASK_FOCUS_ALL,
    showLimitHint: true,
    variant: 'growth-side',
    slotLabel: sideSlotDisplay,
    usedThisMonth: sideUsed
  });
  const campaignsMount = document.getElementById('growth-campaigns-mount');
  if (campaignsMount) {
    campaignsMount.innerHTML = renderGrowthCampaignsBlock(state, {
      slotLabel: campaignSlotDisplay,
      launchedThisMonth: growthRuns
    });
  }
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

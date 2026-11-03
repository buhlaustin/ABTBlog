import { loadCategories } from './modules/Categories.js';
import { createInitialState, normalizeSave } from './modules/GameState.js';
import { StorageManager } from './modules/Storage.js';
import { loadTaskCatalog, getTaskDef } from './modules/Tasks.js';
import { initNarrativeApiUrl, isNarrativeApiEnabled } from './modules/NarrativeApi.js';
import { applyTaskOutcome, rollTaskOutcome } from './modules/Finance.js';
import { completeTaskInstance, endMonth, appendLog } from './modules/Calendar.js';
import { formatMoney } from './modules/GameState.js';
import { syncStageFromProgress, onStageChange } from './modules/Progression.js';
import {
  adjustDraftHeadcount,
  setDraftHeadcount,
  finalizeStaffing,
  showPeopleFeedback
} from './modules/Staff.js';
import { closeSeedRound, showFinanceFeedback } from './modules/Fundraising.js';
import { recordLayoffEvent } from './modules/News.js';
import {
  renderInterviewForm,
  scoreInterview,
  completeXcAcceptance
} from './modules/XC.js';
import { loadHubData, selectHub, addSatellite, removeSatellite, showOfficesFeedback } from './modules/Offices.js';
import {
  bindSandboxCashToggle,
  bindTabNavigation,
  flashSaveStatus,
  populateCategorySelect,
  renderAllPanels,
  renderGameOver,
  setLoadButtonEnabled,
  showDeskFeedback,
  showScreen
} from './modules/UI.js';

let sessionState = null;

function refresh() {
  if (!sessionState) return;
  renderAllPanels(sessionState);
  if (sessionState.flags?.gameOver) {
    renderGameOver(sessionState);
    showScreen('gameover');
  }
}

function enterGame(state) {
  sessionState = state;
  refresh();
  if (!sessionState.flags?.gameOver) {
    showScreen('game');
  }
}

async function openXcInterview() {
  if (!sessionState) return;
  const mount = document.getElementById('xc-interview-mount');
  await renderInterviewForm(mount);
  showScreen('xcInterview');
}

async function submitXcInterview(e) {
  e.preventDefault();
  if (!sessionState) return;
  const form = e.target;
  const fd = new FormData(form);
  const answers = {};
  for (const [key, val] of fd.entries()) {
    answers[key] = val;
  }

  const feedback = document.getElementById('xc-interview-feedback');
  if (feedback) {
    feedback.textContent = 'Scoring application…';
    feedback.hidden = false;
  }

  const score = await scoreInterview(sessionState, answers);
  if (!score.accepted) {
    if (feedback) {
      feedback.textContent = score.feedback;
      feedback.classList.add('error');
    }
    return;
  }

  const result = completeXcAcceptance(sessionState);
  if (!result.ok) {
    if (feedback) {
      feedback.textContent = result.reason || 'Could not accept.';
      feedback.classList.add('error');
    }
    return;
  }

  appendLog(sessionState, `XC accepted (score ${score.score}) — $500k SAFE, 3-month SF batch starts.`);
  syncStageFromProgress(sessionState);
  showScreen('game');
  showFinanceFeedback(score.feedback);
  refresh();
}

function handleCompleteTask(instanceId) {
  if (!sessionState || sessionState.flags?.gameOver) return;
  const inst = sessionState.calendar.monthTasks?.find((t) => t.instanceId === instanceId);
  if (!inst || inst.status !== 'pending') return;

  const def = getTaskDef(inst.taskId);
  if (!def) return;

  const rolled = rollTaskOutcome(def, sessionState);
  const { cost, revenue } = applyTaskOutcome(sessionState, def, rolled);
  const result = completeTaskInstance(sessionState, instanceId, def, rolled);
  if (!result.ok) return;

  appendLog(
    sessionState,
    `“${def.title}” — +${formatMoney(revenue)} revenue, -${formatMoney(cost)} spend.`
  );

  const priorStage = sessionState.stage;
  syncStageFromProgress(sessionState);
  if (sessionState.stage !== priorStage) {
    for (const line of onStageChange(sessionState, priorStage, sessionState.stage)) {
      appendLog(sessionState, line);
    }
  }

  showDeskFeedback(`Task complete: +${formatMoney(revenue)} revenue`);
  refresh();
}

function handleEndMonth() {
  if (!sessionState || sessionState.flags?.gameOver) return;
  const result = endMonth(sessionState);
  if (!result.ok) {
    showDeskFeedback(result.reason || 'Cannot close month yet.', true);
    return;
  }
  if (result.gameOver) {
    showDeskFeedback('Out of cash.');
  } else {
    showDeskFeedback('Month closed. New tasks dealt.');
  }
  refresh();
}

function handleFinalizeStaff() {
  if (!sessionState) return;
  const result = finalizeStaffing(sessionState);
  if (!result.ok) {
    showPeopleFeedback(result.reason || 'Could not finalize.', true);
    refresh();
    return;
  }
  if (result.significantLayoff) {
    recordLayoffEvent(sessionState, result.layoffPct);
    appendLog(
      sessionState,
      `Layoffs (${Math.round(result.layoffPct * 100)}% of headcount) — press will notice in Phase 4.`
    );
  }
  appendLog(sessionState, 'Staffing plan finalized for payroll.');
  showPeopleFeedback('Staffing finalized — month-end payroll uses these counts.');
  refresh();
}

function handleCloseSeed() {
  if (!sessionState) return;
  const result = closeSeedRound(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close seed.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Closed seed round — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post-money.`
  );
  showFinanceFeedback('Seed round closed.');
  refresh();
}

function handleSelectHub() {
  if (!sessionState) return;
  const select = document.getElementById('hub-select');
  const hubId = select?.value;
  if (!hubId) {
    showOfficesFeedback('Pick a hub city.', true);
    return;
  }
  const result = selectHub(sessionState, hubId);
  if (!result.ok) {
    showOfficesFeedback(result.reason, true);
    refresh();
    return;
  }
  appendLog(sessionState, `HQ set in ${result.hub.label} — seed fundraising unlocked.`);
  syncStageFromProgress(sessionState);
  showOfficesFeedback(`Hub: ${result.hub.label}`);
  refresh();
}

function handleAddSatellite() {
  if (!sessionState) return;
  const select = document.getElementById('satellite-template');
  const result = addSatellite(sessionState, select?.value);
  if (!result.ok) {
    showOfficesFeedback(result.reason, true);
    refresh();
    return;
  }
  appendLog(sessionState, `Opened ${result.entry.label} (+${result.entry.seats} seats).`);
  showOfficesFeedback('Satellite added.');
  refresh();
}

function bindGameInteractions() {
  const app = document.getElementById('app');
  app?.addEventListener('click', (e) => {
    const completeBtn = e.target.closest('[data-complete-task]');
    if (completeBtn) {
      handleCompleteTask(completeBtn.getAttribute('data-complete-task'));
      return;
    }

    const staffDelta = e.target.closest('[data-staff-delta]');
    if (staffDelta) {
      if (!sessionState) return;
      const dept = staffDelta.getAttribute('data-staff-delta');
      const delta = Number(staffDelta.getAttribute('data-delta'));
      const result = adjustDraftHeadcount(sessionState, dept, delta);
      if (!result.ok) showPeopleFeedback(result.reason, true);
      else showPeopleFeedback('');
      refresh();
      return;
    }

    const removeSat = e.target.closest('[data-remove-satellite]');
    if (removeSat) {
      if (!sessionState) return;
      const id = removeSat.getAttribute('data-remove-satellite');
      const result = removeSatellite(sessionState, id);
      if (!result.ok) showOfficesFeedback(result.reason, true);
      else showOfficesFeedback('Satellite removed.');
      refresh();
      return;
    }

    if (e.target.id === 'btn-finalize-staff') {
      handleFinalizeStaff();
      return;
    }
    if (e.target.id === 'btn-xc-apply') {
      openXcInterview();
      return;
    }
    if (e.target.id === 'btn-xc-interview-cancel') {
      showScreen('game');
      return;
    }
    if (e.target.id === 'btn-close-seed') {
      handleCloseSeed();
      return;
    }
    if (e.target.id === 'btn-select-hub') {
      handleSelectHub();
      return;
    }
    if (e.target.id === 'btn-add-satellite') {
      handleAddSatellite();
      return;
    }
    if (e.target.id === 'btn-end-month') {
      handleEndMonth();
    }
  });

  app?.addEventListener('change', (e) => {
    const input = e.target.closest('[data-staff-input]');
    if (!input || !sessionState) return;
    const dept = input.getAttribute('data-staff-input');
    const result = setDraftHeadcount(sessionState, dept, input.value);
    if (!result.ok) showPeopleFeedback(result.reason, true);
    refresh();
  });

  app?.addEventListener('submit', (e) => {
    if (e.target.id === 'xc-interview-form') {
      submitXcInterview(e);
    }
  });

  document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
    sessionState = null;
    setLoadButtonEnabled(StorageManager.hasSave());
    showScreen('start');
  });
}

async function init() {
  await Promise.all([
    loadCategories(),
    loadTaskCatalog(),
    loadHubData(),
    initNarrativeApiUrl()
  ]);

  const categories = await loadCategories();
  const categorySelect = document.getElementById('startup-category');
  populateCategorySelect(categorySelect, categories);

  const setupForm = document.getElementById('setup-form');
  bindSandboxCashToggle(setupForm);
  bindTabNavigation();
  bindGameInteractions();

  setLoadButtonEnabled(StorageManager.hasSave());

  const apiStatus = document.getElementById('start-api-status');
  if (apiStatus) {
    apiStatus.hidden = false;
    apiStatus.textContent = isNarrativeApiEnabled()
      ? 'AI narrative endpoint ready (XC interview + Phase 4).'
      : 'AI offline — XC uses lenient local scoring.';
  }

  document.getElementById('btn-new')?.addEventListener('click', () => {
    showScreen('setup');
  });

  document.getElementById('btn-load')?.addEventListener('click', () => {
    const raw = StorageManager.load();
    const state = normalizeSave(raw);
    if (state) enterGame(state);
  });

  document.getElementById('btn-setup-back')?.addEventListener('click', () => {
    showScreen('start');
  });

  document.getElementById('btn-back-start')?.addEventListener('click', () => {
    if (sessionState && !sessionState.flags?.gameOver) {
      StorageManager.save(sessionState);
      setLoadButtonEnabled(true);
    }
    sessionState = null;
    setLoadButtonEnabled(StorageManager.hasSave());
    showScreen('start');
  });

  document.getElementById('btn-save')?.addEventListener('click', () => {
    if (!sessionState) return;
    const ok = StorageManager.save(sessionState);
    flashSaveStatus(ok);
    setLoadButtonEnabled(StorageManager.hasSave());
  });

  setupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(setupForm);
    const companyName = String(fd.get('companyName') || '').trim();
    const categoryId = String(fd.get('category') || '');
    const mode = String(fd.get('mode') || 'career');
    const sandboxCash = fd.get('sandboxCash');

    if (!companyName || !categoryId) return;

    enterGame(
      createInitialState({
        companyName,
        categoryId,
        mode,
        sandboxCash
      })
    );
  });

  showScreen('start');
}

init();

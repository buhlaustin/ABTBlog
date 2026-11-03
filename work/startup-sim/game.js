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
import { acceptXC, closeSeedRound, showFinanceFeedback } from './modules/Fundraising.js';
import { recordLayoffEvent } from './modules/News.js';
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

function handleAcceptXC() {
  if (!sessionState) return;
  const result = acceptXC(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'XC not available.', true);
    refresh();
    return;
  }
  appendLog(sessionState, 'Accepted X Combinator — $500k SAFE, ~6% on conversion.');
  showFinanceFeedback('XC accepted — cash updated, cap table diluted.');
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

    if (e.target.id === 'btn-finalize-staff') {
      handleFinalizeStaff();
      return;
    }
    if (e.target.id === 'btn-accept-xc') {
      handleAcceptXC();
      return;
    }
    if (e.target.id === 'btn-close-seed') {
      handleCloseSeed();
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

  document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
    sessionState = null;
    setLoadButtonEnabled(StorageManager.hasSave());
    showScreen('start');
  });
}

async function init() {
  await Promise.all([loadCategories(), loadTaskCatalog(), initNarrativeApiUrl()]);

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
      ? 'AI narrative endpoint ready (Phase 4).'
      : 'AI narrative offline — core sim works without it.';
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

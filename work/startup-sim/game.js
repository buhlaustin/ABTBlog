import { loadCategories } from './modules/Categories.js';
import { createInitialState, normalizeSave } from './modules/GameState.js';
import { StorageManager } from './modules/Storage.js';
import { loadTaskCatalog, getTaskDef, getTaskDefinitions, dealMonthlyTasks } from './modules/Tasks.js';
import {
  initNarrativeApiUrl,
  isNarrativeApiEnabled,
  isNarrativeApiLive,
  probeNarrativeApi
} from './modules/NarrativeApi.js';
import { applyTaskOutcome, rollTaskOutcome } from './modules/Finance.js';
import { completeTaskInstance, endMonth, appendLog } from './modules/Calendar.js';
import { formatMoney } from './modules/GameState.js';
import { syncStageFromProgress, onStageChange, onIpoUnlocked } from './modules/Progression.js';
import { fileIpo, fetchIpoPress, cashOut } from './modules/IPO.js';
import {
  adjustDraftHeadcount,
  setDraftHeadcount,
  finalizeStaffing,
  showPeopleFeedback
} from './modules/Staff.js';
import {
  closeSeedRound,
  closeSeriesA,
  closeSeriesB,
  showFinanceFeedback
} from './modules/Fundraising.js';
import { onLayoffSentiment } from './modules/Sentiment.js';
import {
  rollMonthStartCrisis,
  hasActiveCrisis,
  applyCrisisChoice,
  renderCrisisPanel
} from './modules/Crisis.js';
import { recordLayoffEvent, generateMonthlyNews, toggleNewsArchive } from './modules/News.js';
import { publishPlayerPost, setSocialNetwork, showSocialFeedback } from './modules/Social.js';
import { sendAdvisorMessage } from './modules/Advisor.js';
import {
  renderInterviewForm,
  scoreInterview,
  completeXcAcceptance
} from './modules/XC.js';
import { loadHubData, selectHub, addSatellite, removeSatellite, showOfficesFeedback } from './modules/Offices.js';
import { loadAssetManifest } from './modules/Assets.js';
import { dismissTutorialStep } from './modules/Tutorial.js';
import { recordRunInHallOfFame, renderHallOfFameBlock } from './modules/HallOfFame.js';
import { parseSandboxTuning } from './modules/SandboxTuning.js';
import { applyPivot } from './modules/Pivot.js';
import { openMonthSummaryDialog } from './modules/MonthSummary.js';
import { copyRunExportToClipboard } from './modules/RunExport.js';
import {
  setAudioEnabled,
  syncAudioToggleCheckbox,
  playMonthCloseChime,
  playUiClick
} from './modules/Audio.js';
import { updateChirpCharCount } from './modules/Social.js';
import {
  bindSandboxCashToggle,
  bindTabNavigation,
  bindGameKeyboardShortcuts,
  syncContinueOnOpenOffer,
  flashSaveStatus,
  populateCategorySelect,
  renderAllPanels,
  renderGameOver,
  setLoadButtonEnabled,
  syncStartScreen,
  showDeskFeedback,
  showScreen
} from './modules/UI.js';

let sessionState = null;

/** Persist run to localStorage so Continue works after refresh or leaving the page. */
function persistProgress(silent = true) {
  if (!sessionState) return false;
  const ok = StorageManager.save(sessionState);
  if (ok) {
    setLoadButtonEnabled(true);
    syncStartScreen();
    if (!silent) flashSaveStatus(true);
  }
  return ok;
}

function refresh() {
  if (!sessionState) return;
  if (hasActiveCrisis(sessionState) && !sessionState.flags?.gameOver) {
    renderCrisisPanel(document.getElementById('crisis-mount'), sessionState);
    showScreen('crisis');
    persistProgress(true);
    return;
  }
  if (sessionState.flags?.gameOver && !sessionState.meta?.hofRecorded) {
    const { highlights } = recordRunInHallOfFame(sessionState);
    sessionState.meta = sessionState.meta ?? {};
    sessionState.meta.hofRecorded = true;
    sessionState.meta.hofHighlights = highlights;
    renderHallOfFameBlock(document.getElementById('hall-of-fame'));
  }

  renderAllPanels(sessionState);
  persistProgress(true);
  if (sessionState.flags?.gameOver) {
    renderGameOver(sessionState);
    showScreen('gameover');
  }
}

function enterGame(state) {
  sessionState = state;
  refresh();
  if (sessionState.flags?.gameOver) return;
  if (!hasActiveCrisis(sessionState)) {
    showScreen('game');
  }
}

async function openXcInterview() {
  if (!sessionState) return;
  const mount = document.getElementById('xc-interview-mount');
  await renderInterviewForm(mount, sessionState);
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
  if (score.waitlisted) {
    sessionState.xc = sessionState.xc ?? {};
    sessionState.xc.retryAvailableTurn =
      (sessionState.calendar.year - 1) * 12 + sessionState.calendar.monthIndex + 1;
    sessionState.xc.needsFollowUpQuestion = true;
    appendLog(sessionState, `XC waitlist (score ${score.score}) — reapply next month.`);
    showFinanceFeedback(score.feedback);
    showScreen('game');
    refresh();
    return;
  }
  if (!score.accepted) {
    if (feedback) {
      feedback.textContent = score.feedback;
      feedback.classList.add('error');
    }
    return;
  }

  sessionState.xc = sessionState.xc ?? {};
  sessionState.xc.retryAvailableTurn = null;
  sessionState.xc.needsFollowUpQuestion = false;

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
  for (const line of onIpoUnlocked(sessionState)) {
    appendLog(sessionState, line);
  }

  showDeskFeedback(`Task complete: +${formatMoney(revenue)} revenue`);
  playUiClick();
  refresh();
}

async function handleEndMonth() {
  if (!sessionState || sessionState.flags?.gameOver) return;
  const result = endMonth(sessionState);
  if (!result.ok) {
    showDeskFeedback(result.reason || 'Cannot close month yet.', true);
    return;
  }
  if (result.gameOver) {
    showDeskFeedback('Out of cash.');
    refresh();
    if (result.monthSummary) {
      const headline = sessionState.news?.currentMonthArticles?.[0]?.headline ?? null;
      await openMonthSummaryDialog(sessionState, result.monthSummary, headline);
    }
    return;
  }

  await rollMonthStartCrisis(sessionState);
  if (hasActiveCrisis(sessionState)) {
    appendLog(sessionState, `Crisis: ${sessionState.crisis.active.title}`);
  }

  showDeskFeedback('Generating headlines…');
  const news = await generateMonthlyNews(sessionState);
  if (hasActiveCrisis(sessionState)) {
    showDeskFeedback('Crisis hit — resolve it before your next month close.');
    refresh();
    return;
  }
  appendLog(
    sessionState,
    news.source === 'ai' ? 'Fresh headlines landed (AI).' : 'Headlines updated (offline).'
  );
  const headline = sessionState.news?.currentMonthArticles?.[0]?.headline ?? null;
  if (result.monthSummary) {
    await openMonthSummaryDialog(sessionState, result.monthSummary, headline);
    playMonthCloseChime();
  }
  showDeskFeedback('Month closed. New tasks dealt.');
  refresh();
}

function loadSavedGame() {
  const raw = StorageManager.load();
  if (!raw) return { ok: false, reason: 'No save found or save could not be read.' };
  const state = normalizeSave(raw);
  if (!state) return { ok: false, reason: 'Save file is invalid or from an unsupported version.' };
  enterGame(state);
  return { ok: true };
}

function handleFinalizeStaff() {
  if (!sessionState) return;
  const result = finalizeStaffing(sessionState);
  if (!result.ok) {
    showPeopleFeedback(result.reason || 'Could not finalize.', true);
    refresh();
    return;
  }
  if (result.layoffPct > 0) {
    onLayoffSentiment(sessionState, result.layoffPct);
  }
  if (result.significantLayoff) {
    recordLayoffEvent(sessionState, result.layoffPct);
    appendLog(
      sessionState,
      `Layoffs (${Math.round(result.layoffPct * 100)}% of headcount) — watch the News tab next month close.`
    );
  }
  appendLog(sessionState, 'Staffing plan finalized for payroll.');
  showPeopleFeedback('Staffing finalized — month-end payroll uses these counts.');
  refresh();
}

async function handleFileIpo() {
  if (!sessionState) return;
  showFinanceFeedback('Filing S-1 (fictionally)…');
  const result = fileIpo(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot file IPO.', true);
    refresh();
    return;
  }
  await fetchIpoPress(sessionState);
  dealMonthlyTasks(sessionState);
  appendLog(
    sessionState,
    `${result.ticker} listed at ${formatMoney(result.openPrice)}/share — welcome to the public markets.`
  );
  showFinanceFeedback(`${result.ticker} is live.`);
  refresh();
}

function handleCashOut() {
  if (!sessionState) return;
  if (!window.confirm('Step down as CEO and cash out your founder stake at the current share price?')) {
    return;
  }
  const result = cashOut(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot cash out.', true);
    refresh();
    return;
  }
  appendLog(sessionState, `Cashed out founder stake for ${formatMoney(result.payout)}.`);
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

function handleCloseSeriesA() {
  if (!sessionState) return;
  const result = closeSeriesA(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close Series A.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Series A — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post${result.downRound ? ' (down round)' : ''}.`
  );
  showFinanceFeedback(result.downRound ? 'Series A closed on down-round terms.' : 'Series A closed.');
  refresh();
}

function handleCloseSeriesB() {
  if (!sessionState) return;
  const result = closeSeriesB(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close Series B.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Series B — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post${result.downRound ? ' (down round)' : ''}.`
  );
  showFinanceFeedback(result.downRound ? 'Series B closed on down-round terms.' : 'Series B closed.');
  refresh();
}

function handleCrisisChoice(index) {
  if (!sessionState) return;
  const result = applyCrisisChoice(sessionState, index);
  if (!result.ok) {
    showDeskFeedback(result.reason || 'Could not resolve crisis.', true);
    refresh();
    return;
  }
  appendLog(sessionState, `Crisis resolved: ${result.summary}`);
  showDeskFeedback('Crisis handled — back to the desk.');
  showScreen('game');
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
    if (e.target.id === 'btn-close-series-a') {
      handleCloseSeriesA();
      return;
    }
    if (e.target.id === 'btn-close-series-b') {
      handleCloseSeriesB();
      return;
    }
    const crisisBtn = e.target.closest('[data-crisis-choice]');
    if (crisisBtn) {
      handleCrisisChoice(Number(crisisBtn.getAttribute('data-crisis-choice')));
      return;
    }
    if (e.target.id === 'btn-file-ipo') {
      handleFileIpo();
      return;
    }
    if (e.target.id === 'btn-cash-out') {
      handleCashOut();
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
      return;
    }
    if (e.target.id === 'btn-toggle-news-archive') {
      toggleNewsArchive(sessionState);
      refresh();
      return;
    }
    if (e.target.id === 'btn-dismiss-tutorial') {
      const stepId = e.target.getAttribute('data-tutorial-id');
      if (stepId) dismissTutorialStep(stepId);
      refresh();
      return;
    }
    const socialTab = e.target.closest('[data-social-tab]');
    if (socialTab && sessionState) {
      setSocialNetwork(sessionState, socialTab.getAttribute('data-social-tab'));
      refresh();
    }
  });

  app?.addEventListener('input', (e) => {
    if (e.target.id === 'social-post-text') {
      updateChirpCharCount(e.target.value);
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

  app?.addEventListener('submit', async (e) => {
    if (e.target.id === 'xc-interview-form') {
      submitXcInterview(e);
      return;
    }
    if (e.target.id === 'social-post-form') {
      e.preventDefault();
      if (!sessionState) return;
      const text = document.getElementById('social-post-text')?.value;
      const network = sessionState.social?.activeNetwork ?? 'pronet';
      showSocialFeedback('Posting…');
      const result = await publishPlayerPost(sessionState, network, text);
      if (!result.ok) showSocialFeedback(result.reason, true);
      else showSocialFeedback('Posted.');
      refresh();
      return;
    }
    if (e.target.id === 'advisor-form') {
      e.preventDefault();
      if (!sessionState) return;
      const input = document.getElementById('advisor-input');
      const text = input?.value;
      const result = await sendAdvisorMessage(sessionState, text);
      if (input) input.value = '';
      if (!result.ok) {
        refresh();
        return;
      }
      refresh();
      return;
    }
    if (e.target.id === 'pivot-form') {
      e.preventDefault();
      if (!sessionState) return;
      const cat = document.getElementById('pivot-category')?.value;
      const result = applyPivot(sessionState, cat);
      const fb = document.getElementById('pivot-feedback');
      if (fb) {
        fb.hidden = false;
        fb.textContent = result.ok
          ? `Pivoted to ${result.newLabel}. Desk tasks refreshed; check News.`
          : result.reason || 'Could not pivot.';
        fb.classList.toggle('error', !result.ok);
      }
      if (result.ok) {
        appendLog(sessionState, `Pivoted from ${result.oldLabel} to ${result.newLabel}.`);
      }
      refresh();
    }
  });

  document.getElementById('btn-gameover-menu')?.addEventListener('click', () => {
    sessionState = null;
    syncStartScreen();
    syncContinueOnOpenOffer(StorageManager.hasSave());
    renderHallOfFameBlock(document.getElementById('hall-of-fame'));
    showScreen('start');
  });

  document.getElementById('btn-export-run')?.addEventListener('click', async () => {
    if (!sessionState) return;
    const fb = document.getElementById('export-run-feedback');
    const result = await copyRunExportToClipboard(sessionState);
    if (fb) {
      fb.hidden = false;
      fb.textContent = result.ok ? 'Run summary copied to clipboard.' : result.reason ?? 'Copy failed.';
    }
  });
}

async function init() {
  await Promise.all([
    loadCategories(),
    loadTaskCatalog(),
    loadHubData(),
    loadAssetManifest(),
    initNarrativeApiUrl()
  ]);
  await probeNarrativeApi();

  const categories = await loadCategories();
  const categorySelect = document.getElementById('startup-category');
  populateCategorySelect(categorySelect, categories);

  const setupForm = document.getElementById('setup-form');
  bindSandboxCashToggle(setupForm);
  bindTabNavigation();
  bindGameKeyboardShortcuts(() => sessionState, () => handleEndMonth());
  bindGameInteractions();

  const hasSave = StorageManager.hasSave();
  setLoadButtonEnabled(hasSave);
  syncStartScreen();
  syncContinueOnOpenOffer(hasSave);
  renderHallOfFameBlock(document.getElementById('hall-of-fame'));
  syncAudioToggleCheckbox();
  document.getElementById('toggle-audio')?.addEventListener('change', (e) => {
    setAudioEnabled(e.target.checked);
  });

  function flashLoadError(message) {
    const el = document.getElementById('start-api-status');
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.classList.add('error');
  }

  const apiStatus = document.getElementById('start-api-status');
  if (apiStatus) {
    apiStatus.hidden = false;
    apiStatus.classList.remove('error');
    if (isNarrativeApiLive()) {
      apiStatus.textContent =
        'AI narrative connected — XC scoring, news, social, advisor, and IPO press use live generation.';
    } else if (isNarrativeApiEnabled()) {
      apiStatus.textContent =
        'Narrative API unreachable — deploy hos-narrative with Startup kinds (see docs). Using offline fallbacks until then.';
      apiStatus.classList.add('error');
    } else {
      apiStatus.textContent = 'No narrative URL configured — offline fallbacks only.';
      apiStatus.classList.add('error');
    }
  }

  document.getElementById('btn-new')?.addEventListener('click', () => {
    if (StorageManager.hasSave()) {
      const ok = window.confirm(
        'Start a new company? Your current saved run will be replaced when you enter the garage.'
      );
      if (!ok) return;
    }
    showScreen('setup');
  });

  document.getElementById('btn-load')?.addEventListener('click', () => {
    const result = loadSavedGame();
    if (!result.ok) flashLoadError(result.reason);
  });

  document.getElementById('btn-continue-open')?.addEventListener('click', () => {
    const result = loadSavedGame();
    if (!result.ok) flashLoadError(result.reason);
  });

  document.getElementById('btn-dismiss-continue-offer')?.addEventListener('click', () => {
    sessionStorage.setItem('startup_sim_resume_dismissed', '1');
    syncContinueOnOpenOffer(StorageManager.hasSave());
  });

  document.getElementById('btn-setup-back')?.addEventListener('click', () => {
    showScreen('start');
  });

  document.getElementById('btn-back-start')?.addEventListener('click', () => {
    persistProgress(true);
    sessionState = null;
    syncStartScreen();
    syncContinueOnOpenOffer(StorageManager.hasSave());
    showScreen('start');
  });

  document.getElementById('btn-save')?.addEventListener('click', () => {
    if (!sessionState) return;
    persistProgress(false);
  });

  setupForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(setupForm);
    const companyName = String(fd.get('companyName') || '').trim();
    const categoryId = String(fd.get('category') || '');
    const mode = String(fd.get('mode') || 'career');
    const sandboxCash = fd.get('sandboxCash');

    if (!companyName || !categoryId) return;

    if (!getTaskDefinitions().length) {
      const el = document.getElementById('setup-form');
      let err = document.getElementById('setup-task-error');
      if (!err && el) {
        err = document.createElement('p');
        err.id = 'setup-task-error';
        err.className = 'desk-feedback error';
        err.setAttribute('role', 'alert');
        el.appendChild(err);
      }
      if (err) {
        err.textContent =
          'Could not load task data. Check your connection and refresh, then try again.';
      }
      return;
    }

    enterGame(
      createInitialState({
        companyName,
        categoryId,
        mode,
        sandboxCash,
        sandboxTuning: parseSandboxTuning(new FormData(setupForm), mode)
      })
    );
  });

  showScreen('start');
}

init();

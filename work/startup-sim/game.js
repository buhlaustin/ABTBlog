import { loadCategories, getCategoriesSync } from './modules/Categories.js';
import { createInitialState, normalizeSave } from './modules/GameState.js';
import { StorageManager } from './modules/Storage.js';
import {
  loadTaskCatalog,
  getTaskDef,
  getTaskDefinitions,
  isTaskCatalogReady,
  toggleTaskOffer,
  confirmTaskLineup
} from './modules/Tasks.js';
import { completeBoardTask } from './modules/Board.js';
import { openBoardTaskOutcomeDialog } from './modules/BoardOutcome.js';
import { purchaseWorkspaceTier } from './modules/Workspace.js';
import { runGrowthCampaign, loadGrowthCampaigns } from './modules/GrowthCampaigns.js';
import { openGrowthCampaignOutcomeDialog } from './modules/GrowthOutcome.js';
import {
  getCoreTaskRevenueMult,
  getSandboxTuningMult,
  getTaskRevenueMultiplierPreview
} from './modules/Finance.js';
import { runProductAction, showProductActionFeedback } from './modules/ProductActions.js';
import {
  initNarrativeApiUrl,
  isNarrativeApiEnabled,
  isNarrativeApiLive,
  probeNarrativeApi,
  shouldUseNarrativeAi
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
  closeSeriesC,
  closeSeriesD,
  closeSeriesE,
  closeSeriesF,
  joinAccelerator,
  showFinanceFeedback
} from './modules/Fundraising.js';
import { loadAccelerators } from './modules/Accelerators.js';
import { onLayoffSentiment } from './modules/Sentiment.js';
import {
  rollMonthStartCrisis,
  hasActiveCrisis,
  applyCrisisChoice,
  renderCrisisPanel,
  preloadCrisisCatalog
} from './modules/Crisis.js';
import {
  recordLayoffEvent,
  applyOfflineMonthlyNews,
  enrichMonthlyNewsWithAi,
  renderNewsPanel,
  toggleNewsArchive,
  preloadNewsTimeline
} from './modules/News.js';
import {
  publishPlayerPost,
  setSocialNetwork,
  showSocialFeedback,
  applyOfflineMonthlySocial,
  enrichMonthlySocialWithAi,
  renderSocialPanel,
  preloadSocialPersonas,
  updateChirpCharCount
} from './modules/Social.js';
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
import { openMonthSummaryDialog, updateMonthSummaryHeadline } from './modules/MonthSummary.js';
import { copyRunExportToClipboard } from './modules/RunExport.js';
import {
  setAudioEnabled,
  syncAudioToggleCheckbox,
  playMonthCloseChime,
  playUiClick
} from './modules/Audio.js';
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
  setPanelStateProvider,
  syncStartScreen,
  showDeskFeedback,
  showScreen
} from './modules/UI.js';
import { setGameFeedback } from './modules/GameFeedback.js';

let sessionState = null;
let monthCloseInFlight = false;

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
      feedback.textContent = result.reason || 'Not accepted yet — try again next month.';
      feedback.classList.add('error');
    }
    return;
  }

  const start = result.batchStarts;
  appendLog(
    sessionState,
    `XC accepted (score ${score.score}) — $500k SAFE. Batch starts Month ${start?.monthIndex ?? '?'}, Year ${start?.year ?? '?'} (3 months).`
  );
  syncStageFromProgress(sessionState);
  showScreen('game');
  showFinanceFeedback(
    `${score.feedback} You join the batch next month — expect a revenue and buzz step-change once SF starts.`
  );
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
  if (!sessionState || sessionState.flags?.gameOver || monthCloseInFlight) return;

  const endBtn = document.getElementById('btn-end-month');
  monthCloseInFlight = true;
  endBtn?.setAttribute('disabled', 'disabled');
  endBtn?.setAttribute('aria-busy', 'true');

  try {
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

    applyOfflineMonthlyNews(sessionState);
    applyOfflineMonthlySocial(sessionState);
    refresh();

    const headlineNow = sessionState.news?.currentMonthArticles?.[0]?.headline ?? null;
    if (result.monthSummary) {
      await openMonthSummaryDialog(sessionState, result.monthSummary, headlineNow);
      playMonthCloseChime();
    }

    if (shouldUseNarrativeAi()) {
      void Promise.all([
        enrichMonthlyNewsWithAi(sessionState),
        enrichMonthlySocialWithAi(sessionState)
      ]).then(([newsAi, socialAi]) => {
        if (newsAi) {
          appendLog(sessionState, 'Fresh headlines hit the wire.');
          updateMonthSummaryHeadline(sessionState.news?.currentMonthArticles?.[0]?.headline ?? null);
        }
        if (socialAi) {
          appendLog(sessionState, 'ProNet and Chirp are buzzing.');
        }
        if (newsAi || socialAi) {
          renderNewsPanel(document.getElementById('panel-news'), sessionState);
          renderSocialPanel(document.getElementById('panel-social'), sessionState);
          persistProgress(true);
        }
      });
    } else {
      appendLog(sessionState, 'Headlines updated.');
      appendLog(sessionState, 'Social feeds updated.');
    }

    if (hasActiveCrisis(sessionState)) {
      appendLog(sessionState, `Crisis: ${sessionState.crisis.active.title}`);
      showDeskFeedback('Month closed — resolve the crisis before you close again.');
      refresh();
      return;
    }
    showDeskFeedback('Month closed. New tasks dealt.');
    refresh();
  } finally {
    monthCloseInFlight = false;
    endBtn?.removeAttribute('disabled');
    endBtn?.removeAttribute('aria-busy');
  }
}

function loadSavedGame() {
  const raw = StorageManager.load();
  if (!raw) return { ok: false, reason: 'No saved company found.' };
  const state = normalizeSave(raw);
  if (!state) return { ok: false, reason: 'That save could not be opened — try starting a new company.' };
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
    recordLayoffEvent(sessionState, {
      layoffPct: result.layoffPct,
      priorTotal: result.priorTotal,
      newTotal: result.newTotal
    });
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

function handleCloseSeriesC() {
  if (!sessionState) return;
  const result = closeSeriesC(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close Series C.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Series C — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post${result.downRound ? ' (down round)' : ''}.`
  );
  showFinanceFeedback(result.downRound ? 'Series C closed on down-round terms.' : 'Series C closed.');
  refresh();
}

function handleCloseSeriesD() {
  if (!sessionState) return;
  const result = closeSeriesD(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close Series D.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Series D — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post${result.downRound ? ' (down round)' : ''}.`
  );
  showFinanceFeedback(result.downRound ? 'Series D closed on down-round terms.' : 'Series D closed.');
  refresh();
}

function handleCloseSeriesE() {
  if (!sessionState) return;
  const result = closeSeriesE(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close Series E.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Series E — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post${result.downRound ? ' (down round)' : ''}.`
  );
  showFinanceFeedback(result.downRound ? 'Series E closed on down-round terms.' : 'Series E closed.');
  refresh();
}

function handleCloseSeriesF() {
  if (!sessionState) return;
  const result = closeSeriesF(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close Series F.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Series F — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post${result.downRound ? ' (down round)' : ''}.`
  );
  showFinanceFeedback(result.downRound ? 'Series F closed on down-round terms.' : 'Series F closed.');
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
  appendLog(sessionState, `HQ set in ${result.hub.label} — hub modifiers active.`);
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
    const boardBtn = e.target.closest('[data-complete-board-task]');
    if (boardBtn && sessionState) {
      void (async () => {
        const result = completeBoardTask(sessionState, boardBtn.getAttribute('data-complete-board-task'));
        if (!result.ok) {
          setGameFeedback(result.reason || 'Could not complete board task.', true);
          refresh();
          return;
        }
        appendLog(sessionState, `Board: “${result.def.title}”.`);
        refresh();
        await openBoardTaskOutcomeDialog({
          title: result.def.title,
          sentimentDelta: result.sentimentDelta ?? 0,
          sentimentAfter: result.sentimentAfter ?? 0,
          buzzDelta: result.buzzDelta ?? 0
        });
        setGameFeedback('Board task done.');
        refresh();
      })();
      return;
    }

    const offerBtn = e.target.closest('[data-toggle-task-offer]');
    if (offerBtn && sessionState) {
      const result = toggleTaskOffer(sessionState, offerBtn.getAttribute('data-toggle-task-offer'));
      if (!result.ok) showDeskFeedback(result.reason, true);
      refresh();
      return;
    }

    if (e.target.id === 'btn-confirm-task-lineup' && sessionState) {
      const result = confirmTaskLineup(sessionState);
      if (!result.ok) showDeskFeedback(result.reason, true);
      else {
        showDeskFeedback('Desk lineup locked — get to work.');
        appendLog(sessionState, 'Monthly desk lineup locked.');
      }
      refresh();
      return;
    }

    const purchaseBtn = e.target.closest('[data-purchase-workspace]');
    if (purchaseBtn && sessionState) {
      const tier = purchaseBtn.getAttribute('data-purchase-workspace');
      const result = purchaseWorkspaceTier(sessionState, tier);
      if (!result.ok) showOfficesFeedback(result.reason, true);
      else {
        appendLog(sessionState, `Leased ${tier} office — rent added to monthly burn.`);
        showOfficesFeedback('Office leased.');
        syncStageFromProgress(sessionState);
      }
      refresh();
      return;
    }

    const growthBtn = e.target.closest('[data-run-growth]');
    if (growthBtn && sessionState) {
      void (async () => {
        const id = growthBtn.getAttribute('data-run-growth');
        const result = runGrowthCampaign(sessionState, id);
        if (!result.ok) {
          setGameFeedback(result.reason || 'Could not launch campaign.', true);
          refresh();
          return;
        }
        appendLog(
          sessionState,
          `Growth: ${result.def.title} — spent ${formatMoney(result.cost)}, booked ${formatMoney(result.revenue)}.`
        );
        refresh();
        const core = getCoreTaskRevenueMult(sessionState);
        const tune = getSandboxTuningMult(sessionState);
        const total = getTaskRevenueMultiplierPreview(sessionState);
        const multLine =
          sessionState.mode === 'sandbox' && tune !== 1
            ? `${core.toFixed(2)}× progression × ${tune.toFixed(2)}× sandbox = ${total.toFixed(2)}× on this payout.`
            : `${total.toFixed(2)}× effective multiplier on this payout.`;
        await openGrowthCampaignOutcomeDialog({
          title: result.def.title,
          cost: result.cost,
          revenue: result.revenue,
          buzzDelta: result.def.buzz ?? 0,
          multLine
        });
        setGameFeedback(`${result.def.title} launched.`);
        refresh();
      })();
      return;
    }

    const productActionBtn = e.target.closest('[data-product-action]');
    if (productActionBtn && sessionState) {
      const actionId = productActionBtn.getAttribute('data-product-action');
      const result = runProductAction(sessionState, actionId);
      if (!result.ok) showProductActionFeedback(result.reason, true);
      else {
        appendLog(sessionState, `Product spend: ${result.action.label}.`);
        showProductActionFeedback(`${result.action.label} — buzz +${result.action.buzz}.`);
      }
      refresh();
      return;
    }

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
    if (e.target.id === 'btn-close-series-c') {
      handleCloseSeriesC();
      return;
    }
    if (e.target.id === 'btn-close-series-d') {
      handleCloseSeriesD();
      return;
    }
    if (e.target.id === 'btn-close-series-e') {
      handleCloseSeriesE();
      return;
    }
    if (e.target.id === 'btn-close-series-f') {
      handleCloseSeriesF();
      return;
    }
    const accelBtn = e.target.closest('[data-join-accelerator]');
    if (accelBtn && sessionState) {
      const id = accelBtn.getAttribute('data-join-accelerator');
      const result = joinAccelerator(sessionState, id);
      if (!result.ok) showFinanceFeedback(result.reason, true);
      else {
        appendLog(sessionState, `Joined ${result.program.name} — ${formatMoney(result.program.safeAmount)} SAFE.`);
        showFinanceFeedback(`${result.program.name} SAFE closed. Revenue boost active.`);
      }
      refresh();
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
        setGameFeedback(result.reason || 'Could not send that message.', true);
        refresh();
        return;
      }
      setGameFeedback('Chief of staff replied.');
      refresh();
      return;
    }
    if (e.target.id === 'pivot-form') {
      e.preventDefault();
      if (!sessionState) return;
      const cat = document.getElementById('pivot-category')?.value;
      const result = applyPivot(sessionState, cat);
      if (result.ok) {
        appendLog(sessionState, `Pivoted from ${result.oldLabel} to ${result.newLabel}.`);
        setGameFeedback(`Pivoted to ${result.newLabel}. Fresh desk lineup — check News.`);
      } else {
        setGameFeedback(result.reason || 'Could not pivot.', true);
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
  function showBootstrapError(message) {
    const el = document.getElementById('start-boot-status');
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.classList.add('error');
    document.getElementById('btn-new')?.setAttribute('disabled', 'disabled');
    document.getElementById('btn-load')?.setAttribute('disabled', 'disabled');
    document.body.dataset.startupSimReady = 'error';
  }

  function flashLoadError(message) {
    const el = document.getElementById('start-boot-status');
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.classList.add('error');
  }

  if (!isTaskCatalogReady()) {
    showBootstrapError('Task list missing — reload the page.');
    return;
  }

  const categories = getCategoriesSync();
  const categorySelect = document.getElementById('startup-category');
  populateCategorySelect(categorySelect, categories);

  const setupForm = document.getElementById('setup-form');
  bindSandboxCashToggle(setupForm);
  bindTabNavigation();
  setPanelStateProvider(() => sessionState);
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

  function syncNarrativeStatus() {
    const apiStatus = document.getElementById('start-api-status');
    if (!apiStatus) return;
    apiStatus.hidden = false;
    apiStatus.classList.remove('error');
    if (isNarrativeApiLive()) {
      apiStatus.textContent =
        'The wire is live — batch interviews, headlines, social chatter, advisor notes, and IPO press are freshly written.';
    } else if (isNarrativeApiEnabled()) {
      apiStatus.textContent =
        'Live story server is quiet — headlines and social still update each month. Reload if interviews stay stuck.';
      apiStatus.classList.remove('error');
    } else {
      apiStatus.hidden = true;
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
    const ceoFirstName = String(fd.get('ceoFirstName') || '').trim();
    const ceoLastName = String(fd.get('ceoLastName') || '').trim();
    const categoryId = String(fd.get('category') || '');
    const mode = String(fd.get('mode') || 'career');
    const sandboxCash = fd.get('sandboxCash');

    if (!companyName || !ceoFirstName || !ceoLastName || !categoryId) return;

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
          'The task list did not load. Check your connection, reload the page, and try again.';
      }
      return;
    }

    enterGame(
      createInitialState({
        companyName,
        ceoFirstName,
        ceoLastName,
        categoryId,
        mode,
        sandboxCash,
        sandboxTuning: parseSandboxTuning(new FormData(setupForm), mode)
      })
    );
  });

  showScreen('start');
  document.body.dataset.startupSimReady = 'true';

  void (async () => {
    try {
      await Promise.all([
        loadCategories(),
        loadTaskCatalog(),
        loadHubData(),
        loadAccelerators(),
        loadGrowthCampaigns(),
        loadAssetManifest(),
        initNarrativeApiUrl(),
        preloadCrisisCatalog(),
        preloadNewsTimeline(),
        preloadSocialPersonas()
      ]);
      populateCategorySelect(categorySelect, getCategoriesSync());
    } catch {
      /* bundled data already playable */
    }
    await probeNarrativeApi({ retries: 2 });
    syncNarrativeStatus();
  })();
}

init();

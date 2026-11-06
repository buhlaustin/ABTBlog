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
import { autoSelectRecommendedLineup } from './modules/Desk.js';
import {
  addBoardSeat,
  completeBoardTask,
  completeBoardMeetingTask,
  ensureBoardRoster,
  dealBoardTasks,
  getBoardSeatCandidates,
  boardSeatSearchFee,
  setBoardSection
} from './modules/Board.js';
import { openBoardTaskOutcomeDialog } from './modules/BoardOutcome.js';
import { purchaseWorkspaceTier } from './modules/Workspace.js';
import {
  runGrowthCampaign,
  runAllRemainingGrowthCampaigns,
  loadGrowthCampaigns
} from './modules/GrowthCampaigns.js';
import {
  openGrowthCampaignOutcomeDialog,
  openGrowthCampaignBulkOutcomeDialog,
  openSidePlayBulkOutcomeDialog
} from './modules/GrowthOutcome.js';
import {
  getCoreTaskRevenueMult,
  getSandboxTuningMult,
  getTaskRevenueMultiplierPreview
} from './modules/Finance.js';
import {
  loadGrowthLevers,
  runProductAction,
  runAllRemainingSideTasks,
  showProductActionFeedback
} from './modules/ProductActions.js';
import {
  initNarrativeApiUrl,
  isNarrativeApiEnabled,
  isNarrativeApiLive,
  probeNarrativeApi,
  shouldUseNarrativeAi
} from './modules/NarrativeApi.js';
import { applyTaskOutcome, rollTaskOutcome } from './modules/Finance.js';
import { completeTaxFilingTask, donateToCharity } from './modules/CorporateTax.js';
import { completeCeoPersonalTaxFilingTask } from './modules/CeoPersonalTax.js';
import { completeTaskInstance, endMonth, appendLog } from './modules/Calendar.js';
import {
  onScheduleLaunchTaskCompleted,
  canSchedulePublicLaunch,
  PRE_LAUNCH_BUZZ_REQUIRED,
  PRE_LAUNCH_PRODUCT_REQUIRED,
  recordPreLaunchTaskOutcome,
  usesChatXgptLaunchPlaybook,
  CHATXGPT_PRODUCT_NAME
} from './modules/LaunchLifecycle.js';
import { formatMoney } from './modules/GameState.js';
import { syncStageFromProgress, onStageChange, onIpoUnlocked } from './modules/Progression.js';
import {
  fileIpo,
  fetchIpoPress,
  cashOut,
  sellFounderSharesPartial,
  applyStockPctMove,
  setPublicGuidanceTone,
  executeStockBuyback,
  fileFollowOnOffering,
  executeStockSplit,
  declareStockDividend
} from './modules/IPO.js';
import {
  adjustDraftHeadcount,
  setDraftHeadcount,
  finalizeStaffing,
  showPeopleFeedback
} from './modules/Staff.js';
import { autoAdjustStaffingHeadcount } from './modules/StaffingPlanner.js';
import {
  payCompanyWideBonus,
  setCompanyBonusAnnualMode,
  conductEmployeeOffsite,
  runExtraEmployeePerk,
  issueFurtherOptionPool,
  setPeopleSection
} from './modules/EmployeeBenefits.js';
import {
  closeSeedRound,
  closeSeriesA,
  closeSeriesB,
  closeSeriesC,
  closeSeriesD,
  closeSeriesE,
  closeSeriesF,
  joinAccelerator,
  closeAngelSafe,
  requestLoanDraw,
  prepayLoan,
  refinanceLoanAfterSeed,
  drawRevenueAdvance,
  showFinanceFeedback,
  setFinanceSection
} from './modules/Fundraising.js';
import {
  preloadTreasurySponsorshipDeals,
  signTreasurySponsorship,
  renewTreasurySponsorship,
  terminateTreasurySponsorship
} from './modules/TreasurySponsorships.js';
import { runPublicMarketEvent, runPreIpoIrPrep, setPublicSection } from './modules/PublicMarkets.js';
import { saveStartupConferenceConfig } from './modules/StartupConference.js';
import { acquireFinanceProperty, preloadFinancePropertyPrograms } from './modules/FinanceProperty.js';
import { setCeoSalaryAnnual, takeOwnerDraw, showCeoFeedback, setCeoSection } from './modules/Ceo.js';
import {
  purchaseCeoHomeCash,
  purchaseCeoHomeMortgage,
  purchaseCeoLifestyle,
  sellCeoLifestyle,
  sellCeoHome,
  prepayCeoMortgage,
  payOffCeoMortgage,
  getCeoHomeTier,
  getCeoLifestylePurchase,
  preloadCeoLifestyleCatalog
} from './modules/CeoLifestyle.js';
import {
  preloadCeoAlmaMaterCatalog,
  populateAlmaMaterSelect,
  donateToAlmaMater,
  donateToAlmaMaterAthletics
} from './modules/CeoAlumniGiving.js';
import { preloadCeoWlbCatalog, completeCeoWlbTask } from './modules/CeoHappiness.js';
import {
  preparePersonalExpensesForMonth,
  takeOwnerDrawFraction,
  donateFromPersonalBank,
  assertCeoNetWorthGate,
  depositPersonalInvestment,
  withdrawPersonalInvestment,
  personalInvestmentBalance,
  payCeoPersonalTaxFromBank,
  payCeoArrBonus
} from './modules/CeoEconomics.js';
import {
  hireCoo,
  releaseCoo,
  syncCooSalaryToWorkspace,
  previewCooSalaryMonthly
} from './modules/Coo.js';
import { loadAccelerators } from './modules/Accelerators.js';
import { onLayoffSentiment, seatInstitutionalBoard } from './modules/Sentiment.js';
import {
  rollMonthStartCrisis,
  hasActiveCrisis,
  applyCrisisChoice,
  renderCrisisPanel,
  preloadCrisisCatalog
} from './modules/Crisis.js';
import {
  rollDeskDecision,
  hasActiveDecision,
  applyDecisionChoice,
  preloadDecisionEvents
} from './modules/DecisionEvents.js';
import {
  recordLayoffEvent,
  applyOfflineMonthlyNews,
  enrichMonthlyNewsWithAi,
  renderNewsPanel,
  toggleNewsArchive,
  preloadNewsTimeline,
  syncNewsTabAlert,
  unreadNewsCount
} from './modules/News.js';
import {
  renderInterviewForm,
  scoreInterview,
  completeXcAcceptance,
  xcBatchStartLabelText,
  calendarTurn,
  XC_DEMO_DAY_TASK_ID,
  XC_DEMO_DAY_DECISION_ID,
  AI_POST_BATCH_API_RELEASE_TASK_ID,
  onPostBatchApiReleaseTaskCompleted,
  onDemoDayTaskCompleted,
  applyDemoDayPitchChoice
} from './modules/XC.js';
import {
  loadHubData,
  selectHub,
  addSatellite,
  removeSatellite,
  showOfficesFeedback,
  previewSatelliteOpen
} from './modules/Offices.js';
import { loadAssetManifest } from './modules/Assets.js';
import { dismissTutorialStep } from './modules/Tutorial.js';
import { recordRunInHallOfFame, renderHallOfFameBlock } from './modules/HallOfFame.js';
import { parseSandboxTuning } from './modules/SandboxTuning.js';
import { applyPivot } from './modules/Pivot.js';
import {
  purchaseTarget,
  sellSubsidiary,
  reinvestInSubsidiary,
  computeReinvestQuote,
  REINVEST_PROGRAMS,
  preloadAcquisitionCatalog,
  showCompaniesFeedback,
  setCompaniesMarketFilter,
  setCompaniesMarketPage,
  setCompaniesMarketSort,
  setCompaniesMarketSearch,
  runDueDiligence
} from './modules/Acquisitions.js';
import { setCompaniesSection } from './modules/Companies.js';
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
      calendarTurn(sessionState);
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

  appendLog(
    sessionState,
    `XC accepted (score ${score.score}) — $500k SAFE. ${xcBatchStartLabelText(sessionState) ?? 'Next seasonal batch'} (3 months).`
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

  if (def.scheduleLaunch && !canSchedulePublicLaunch(sessionState)) {
    showDeskFeedback(
      `Need ${PRE_LAUNCH_BUZZ_REQUIRED}+ buzz (now ${sessionState.product?.buzz ?? 0}) and product ${PRE_LAUNCH_PRODUCT_REQUIRED}+ (now ${sessionState.product?.level ?? 0}) before scheduling.`,
      true
    );
    return;
  }

  if (def.taxFiling) {
    const tax = completeTaxFilingTask(sessionState);
    if (!tax.ok) {
      showDeskFeedback(tax.reason || 'Cannot file taxes.', true);
      return;
    }
    const rolled = rollTaskOutcome(def, sessionState);
    applyTaskOutcome(sessionState, def, rolled);
    const result = completeTaskInstance(sessionState, instanceId, def, rolled);
    if (!result.ok) return;
    appendLog(sessionState, tax.summary);
    showDeskFeedback(tax.summary);
    playUiClick();
    refresh();
    return;
  }

  if (def.ceoPersonalTaxFiling) {
    const tax = completeCeoPersonalTaxFilingTask(sessionState, payCeoPersonalTaxFromBank);
    if (!tax.ok) {
      showDeskFeedback(tax.reason || 'Cannot file personal taxes.', true);
      return;
    }
    const rolled = rollTaskOutcome(def, sessionState);
    applyTaskOutcome(sessionState, def, rolled);
    const result = completeTaskInstance(sessionState, instanceId, def, rolled);
    if (!result.ok) return;
    appendLog(sessionState, tax.summary);
    showDeskFeedback(tax.summary);
    playUiClick();
    refresh();
    return;
  }

  const rolled = rollTaskOutcome(def, sessionState);
  const { cost, revenue, mrrGain } = applyTaskOutcome(sessionState, def, rolled);
  const result = completeTaskInstance(sessionState, instanceId, def, rolled);
  if (!result.ok) return;

  if (def.stockPct) {
    applyStockPctMove(sessionState, def.stockPct);
    appendLog(
      sessionState,
      `Street reaction: stock ${def.stockPct > 0 ? '+' : ''}${Math.round(Number(def.stockPct) * 100)}%.`
    );
  }

  const mrrLine = mrrGain > 0 ? `, +${formatMoney(mrrGain)}/mo MRR` : '';
  appendLog(
    sessionState,
    `“${def.title}” — +${formatMoney(revenue)} revenue, -${formatMoney(cost)} spend${mrrLine}.`
  );
  if (inst.taskId === XC_DEMO_DAY_TASK_ID) {
    onDemoDayTaskCompleted(sessionState);
    appendLog(sessionState, 'Demo Day stage time — pick your pitch on the desk before closing the month.');
    showDeskFeedback('Demo Day complete — choose focused vs. risk-taking pitch below.');
    refresh();
    return;
  }
  if (inst.taskId === AI_POST_BATCH_API_RELEASE_TASK_ID) {
    const apiRelease = onPostBatchApiReleaseTaskCompleted(sessionState);
    appendLog(sessionState, apiRelease.summary);
    showDeskFeedback(apiRelease.summary);
    refresh();
    return;
  }
  for (const line of recordPreLaunchTaskOutcome(sessionState, def, revenue, rolled)) {
    appendLog(sessionState, line);
  }
  if (def.scheduleLaunch) {
    const sched = onScheduleLaunchTaskCompleted(sessionState);
    if (!sched.ok) {
      showDeskFeedback(sched.reason || 'Could not schedule launch.', true);
    } else {
      for (const line of sched.lines ?? []) {
        appendLog(sessionState, line);
      }
      showDeskFeedback(
        usesChatXgptLaunchPlaybook(sessionState)
          ? `${CHATXGPT_PRODUCT_NAME} ships next month.`
          : 'Public launch scheduled for next month.'
      );
    }
  }

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
    if (!hasActiveCrisis(sessionState)) {
      await rollDeskDecision(sessionState);
    }

    applyOfflineMonthlyNews(sessionState, result.monthSummary);
    const newArticles = unreadNewsCount(sessionState);
    if (newArticles > 0) {
      appendLog(
        sessionState,
        `Press: ${newArticles} new headline${newArticles === 1 ? '' : 's'} on the News tab.`
      );
      setGameFeedback(
        `${newArticles} new article${newArticles === 1 ? '' : 's'} posted — open News to read.`
      );
    }
    syncNewsTabAlert(sessionState);
    refresh();

    const headlineNow = sessionState.news?.currentMonthArticles?.[0]?.headline ?? null;
    if (result.monthSummary) {
      await openMonthSummaryDialog(sessionState, result.monthSummary, headlineNow);
      playMonthCloseChime();
    }

    if (shouldUseNarrativeAi()) {
      void enrichMonthlyNewsWithAi(sessionState).then((newsAi) => {
        if (newsAi) {
          appendLog(sessionState, 'Fresh AI headlines hit the wire.');
          updateMonthSummaryHeadline(sessionState.news?.currentMonthArticles?.[0]?.headline ?? null);
          const n = unreadNewsCount(sessionState);
          if (n > 0) {
            setGameFeedback(`${n} updated article${n === 1 ? '' : 's'} on the News tab.`);
          }
          syncNewsTabAlert(sessionState);
          renderNewsPanel(document.getElementById('panel-news'), sessionState);
          persistProgress(true);
        }
      });
    } else {
      appendLog(sessionState, 'Headlines updated.');
    }

    if (hasActiveCrisis(sessionState)) {
      appendLog(sessionState, `Crisis: ${sessionState.crisis.active.title}`);
      showDeskFeedback('Month closed — resolve the crisis before you close again.');
      refresh();
      return;
    }
    if (hasActiveDecision(sessionState)) {
      appendLog(sessionState, `Decision: ${sessionState.decision.active.title}`);
      showDeskFeedback('Strategic decision on the desk — pick an option before closing again.');
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

async function handleAutoStaffing(direction) {
  if (!sessionState || sessionState.flags?.gameOver) return;
  showPeopleFeedback(
    shouldUseNarrativeAi() ? 'Planning headcount with AI…' : 'Calculating headcount from runway and cap…'
  );
  const result = await autoAdjustStaffingHeadcount(sessionState, direction);
  if (!result.ok) {
    showPeopleFeedback(result.reason || 'Could not adjust staffing.', true);
    refresh();
    return;
  }
  appendLog(sessionState, result.summary);
  showPeopleFeedback(`${result.summary} Review draft counts, then finalize.`);
  playUiClick();
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
  if (!sessionState.flags?.seriesAClosed) {
    seatInstitutionalBoard(
      sessionState,
      'Public listing seated an independent board and approval tracking.'
    );
  }
  ensureBoardRoster(sessionState);
  dealBoardTasks(sessionState);
  dealMonthlyTasks(sessionState);
  appendLog(
    sessionState,
    `${result.ticker} listed at ${formatMoney(result.openPrice)}/share — welcome to the public markets.`
  );
  if (result.primaryProceeds > 0) {
    appendLog(
      sessionState,
      `IPO primary raised ${formatMoney(result.primaryProceeds)} — cash now on the balance sheet.`
    );
  }
  setFinanceSection(sessionState, 'public');
  showFinanceFeedback(
    result.primaryProceeds > 0
      ? `${result.ticker} is live — ${formatMoney(result.primaryProceeds)} primary added to company cash. Open the Public sub-tab for IR events.`
      : `${result.ticker} is live. Open the Public sub-tab for IR events.`
  );
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

function handleSellFounderStock(pctRaw) {
  if (!sessionState) return;
  const pct = Number(pctRaw);
  if (!window.confirm(`Sell ${pct}% of your founder shares at the current market price? You stay CEO.`)) {
    return;
  }
  const result = sellFounderSharesPartial(sessionState, pct);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Stock sale failed.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Sold ${result.sharesSold.toLocaleString('en-US')} founder shares (${result.pctOfFounder}%) for ${formatMoney(result.proceeds)} — ownership now ${result.founderPctAfter}%.`
  );
  showFinanceFeedback(
    `Sold ${result.pctOfFounder}% of your block for ${formatMoney(result.proceeds)} (deposited to personal bank).`
  );
  refresh();
}

function handleCloseAngelSafe() {
  if (!sessionState) return;
  const result = closeAngelSafe(sessionState);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close angel SAFE.', true);
    refresh();
    return;
  }
  appendLog(sessionState, result.summary);
  showFinanceFeedback(result.summary);
  refresh();
}

function handleCloseSeed(structure = 'standard') {
  if (!sessionState) return;
  const result = closeSeedRound(sessionState, structure);
  if (!result.ok) {
    showFinanceFeedback(result.reason || 'Cannot close seed.', true);
    refresh();
    return;
  }
  const label = structure === 'lean' ? 'Lean seed' : 'Seed round';
  appendLog(
    sessionState,
    `Closed ${label} — ${formatMoney(result.raised)} at ${formatMoney(result.postMoney)} post-money.`
  );
  for (const line of result.safeLines ?? []) {
    appendLog(sessionState, line);
  }
  showFinanceFeedback(`${label} closed.`);
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
  if (result.boardSeated) {
    appendLog(sessionState, 'Lead investor seated — board approval tracking and Board tab unlocked.');
  }
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

function formatScenarioOutcomes(result) {
  const lines = result.outcomeLines ?? [];
  if (!lines.length) return result.summary ?? '';
  return `${result.summary} — ${lines.join(' ')}`;
}

function handleCrisisChoice(index) {
  if (!sessionState) return;
  const result = applyCrisisChoice(sessionState, index);
  if (!result.ok) {
    showDeskFeedback(result.reason || 'Could not resolve crisis.', true);
    refresh();
    return;
  }
  appendLog(sessionState, `Crisis resolved: ${formatScenarioOutcomes(result)}`);
  showDeskFeedback(formatScenarioOutcomes(result) || 'Crisis handled — back to the desk.');
  showScreen('game');
  refresh();
}

function handleDecisionChoice(index) {
  if (!sessionState) return;
  const demoPitch =
    sessionState.decision?.active?.id === XC_DEMO_DAY_DECISION_ID;
  const result = demoPitch
    ? applyDemoDayPitchChoice(sessionState, index)
    : applyDecisionChoice(sessionState, index);
  if (!result.ok) {
    showDeskFeedback(result.reason || 'Could not apply decision.', true);
    refresh();
    return;
  }
  appendLog(sessionState, `Decision: ${formatScenarioOutcomes(result)}`);
  showDeskFeedback(formatScenarioOutcomes(result) || 'Decision locked in.');
  refresh();
}

function handleAcquisitionBuy(id) {
  if (!sessionState) return;
  const result = purchaseTarget(sessionState, id);
  if (!result.ok) {
    showCompaniesFeedback(result.reason || 'Could not acquire.', true);
    refresh();
    return;
  }
  const name = result.company?.isRival
    ? sessionState.world?.competitor?.name ?? result.company.name
    : result.company?.name;
  appendLog(
    sessionState,
    `Acquired ${name} for ${formatMoney(result.price)} (+${formatMoney(result.mrr)}/mo portfolio MRR).`
  );
  showCompaniesFeedback(`Acquired ${name} — portfolio MRR +${formatMoney(result.mrr)}/mo.`);
  refresh();
}

function handleAcquisitionSell(id) {
  if (!sessionState) return;
  const result = sellSubsidiary(sessionState, id);
  if (!result.ok) {
    showCompaniesFeedback(result.reason || 'Could not sell.', true);
    refresh();
    return;
  }
  const name = result.company?.isRival
    ? sessionState.world?.competitor?.name ?? result.company.name
    : result.company?.name;
  appendLog(sessionState, `Sold ${name} for ${formatMoney(result.proceeds)}.`);
  showCompaniesFeedback(`Sold ${name} for ${formatMoney(result.proceeds)}.`);
  refresh();
}

function reinvestProgramIdForSubsidiary(id) {
  const select = document.querySelector(`[data-reinvest-program-for="${CSS.escape(id)}"]`);
  return select?.value ?? 'product';
}

function reinvestPctForSubsidiary(id) {
  const input = document.querySelector(`[data-reinvest-pct-input="${CSS.escape(id)}"]`);
  const raw = input?.value;
  const pct = Number(raw);
  return Number.isFinite(pct) ? pct : 3;
}

function handleAcquisitionReinvestSubmit(id) {
  if (!sessionState) return;
  const programId = reinvestProgramIdForSubsidiary(id);
  const pct = reinvestPctForSubsidiary(id);
  const quote = computeReinvestQuote(sessionState, id, pct, programId);
  if (!quote.ok) {
    showCompaniesFeedback(quote.reason || 'Could not quote deployment.', true);
    refresh();
    return;
  }
  const { company, program, amount, impliedValue, projectedHealth } = quote;
  const name = company.isRival
    ? sessionState.world?.competitor?.name ?? company.name
    : company.name;
  const ok = window.confirm(
    `Deploy ${formatMoney(amount)} (${pct}% of ~${formatMoney(impliedValue)} value) into ${name}?\n\n` +
      `Program: ${program.label}\n` +
      `${program.blurb}\n\n` +
      `Projected health: ~${projectedHealth.toFixed(2)}×`
  );
  if (!ok) return;

  const result = reinvestInSubsidiary(sessionState, id, { pctOfValue: pct, program: programId });
  if (!result.ok) {
    showCompaniesFeedback(result.reason || 'Reinvestment failed.', true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Allocated ${formatMoney(result.amount)} (${result.pctOfValue}% of value) to ${name} — ${result.program.label}; health ${result.health.toFixed(2)}×, MRR ${formatMoney(result.mrr)}/mo.`
  );
  showCompaniesFeedback(
    `Deployed ${formatMoney(result.amount)} via ${result.program.label} — MRR now ${formatMoney(result.mrr)}/mo.`
  );
  refresh();
}

function handleReinvestProgramChange(selectEl) {
  const id = selectEl.getAttribute('data-reinvest-program-for');
  const program = REINVEST_PROGRAMS.find((p) => p.id === selectEl.value);
  const blurb = document.querySelector(`[data-reinvest-blurb-for="${CSS.escape(id)}"]`);
  if (blurb && program) blurb.textContent = program.blurb;
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

function paintSatelliteOpenPreview() {
  const preview = document.getElementById('satellite-open-preview');
  if (!preview) return;
  const cityId = document.getElementById('satellite-template')?.value;
  const sizeId = document.getElementById('satellite-size')?.value ?? 'medium';
  if (!cityId) {
    preview.textContent = '';
    return;
  }
  const line = previewSatelliteOpen(cityId, sizeId);
  preview.textContent = line ? `Preview: ${line}` : '';
}

function handleAddSatellite() {
  if (!sessionState) return;
  const select = document.getElementById('satellite-template');
  const sizeSelect = document.getElementById('satellite-size');
  const result = addSatellite(sessionState, select?.value, sizeSelect?.value ?? 'medium');
  if (!result.ok) {
    showOfficesFeedback(result.reason, true);
    refresh();
    return;
  }
  appendLog(
    sessionState,
    `Opened ${result.entry.sizeLabel ?? 'Medium'} ${result.entry.label} satellite (+${result.entry.seats} seats, ${formatMoney(result.entry.rentMonthly)}/mo).`
  );
  showOfficesFeedback(
    `Opened ${result.entry.sizeLabel} ${result.entry.label} (+${result.entry.seats} seats, ${formatMoney(result.entry.rentMonthly)}/mo).`
  );
  refresh();
}

function bindGameInteractions() {
  const app = document.getElementById('app');
  app?.addEventListener('click', (e) => {
    if (e.target.id === 'btn-add-board-seat' && sessionState) {
      const select = document.getElementById('board-seat-candidate');
      const result = addBoardSeat(sessionState, select?.value);
      if (!result.ok) {
        setGameFeedback(result.reason || 'Could not add board seat.', true);
      } else {
        appendLog(sessionState, `Board: ${result.summary}`);
        setGameFeedback(result.summary, false);
      }
      refresh();
      return;
    }

    const boardSubtab = e.target.closest('[data-board-subtab]');
    if (boardSubtab && sessionState) {
      setBoardSection(sessionState, boardSubtab.getAttribute('data-board-subtab'));
      refresh();
      return;
    }

    const boardMeetBtn = e.target.closest('[data-complete-board-meeting]');
    if (boardMeetBtn && sessionState) {
      void (async () => {
        const result = completeBoardMeetingTask(
          sessionState,
          boardMeetBtn.getAttribute('data-complete-board-meeting')
        );
        if (!result.ok) {
          setGameFeedback(result.reason || 'Could not hold board meeting.', true);
          refresh();
          return;
        }
        appendLog(sessionState, `Board meeting: “${result.def.title}”.`);
        if (result.stockPct) {
          appendLog(
            sessionState,
            `Board read-through: stock ${result.stockPct > 0 ? '+' : ''}${Math.round(Number(result.stockPct) * 100)}%.`
          );
        }
        refresh();
        await openBoardTaskOutcomeDialog({
          title: result.def.title,
          sentimentDelta: result.sentimentDelta ?? 0,
          sentimentAfter: result.sentimentAfter ?? 0,
          buzzDelta: result.buzzDelta ?? 0,
          mandateBonus: 0,
          stockPct: result.stockPct,
          happinessDelta: result.happinessDelta ?? 0,
          isMeeting: true
        });
      })();
      return;
    }

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
        if (result.mandateBonus > 0) {
          appendLog(sessionState, `Lead director ask fulfilled (+${result.mandateBonus} approval).`);
        }
        if (result.stockPct) {
          appendLog(
            sessionState,
            `Board read-through: stock ${result.stockPct > 0 ? '+' : ''}${Math.round(Number(result.stockPct) * 100)}%.`
          );
        }
        refresh();
        await openBoardTaskOutcomeDialog({
          title: result.def.title,
          sentimentDelta: result.sentimentDelta ?? 0,
          sentimentAfter: result.sentimentAfter ?? 0,
          buzzDelta: result.buzzDelta ?? 0,
          mandateBonus: result.mandateBonus ?? 0,
          stockPct: result.stockPct
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

    if (e.target.id === 'btn-desk-auto-lineup' && sessionState) {
      const result = autoSelectRecommendedLineup(sessionState);
      if (!result.ok) showDeskFeedback(result.reason || 'Could not auto-pick.', true);
      else {
        appendLog(sessionState, result.summary);
        showDeskFeedback(result.summary);
      }
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
        syncCooSalaryToWorkspace(sessionState);
        appendLog(sessionState, `Leased ${tier} office — rent added to monthly burn.`);
        showOfficesFeedback('Office leased.');
        syncStageFromProgress(sessionState);
      }
      refresh();
      return;
    }

    const buyAllSideBtn = e.target.closest('[data-buy-all-side]');
    if (buyAllSideBtn && sessionState) {
      void (async () => {
        const result = runAllRemainingSideTasks(sessionState, ['product', 'growth', 'brand', 'both']);
        if (!result.ok) {
          setGameFeedback(result.reason || 'Could not buy side plays.', true);
          refresh();
          return;
        }
        appendLog(
          sessionState,
          `Growth: ran ${result.count} side play${result.count === 1 ? '' : 's'} — spent ${formatMoney(result.totalCost)}, buzz +${result.totalBuzz}${result.totalProduct ? `, product +${result.totalProduct}` : ''}.`
        );
        refresh();
        await openSidePlayBulkOutcomeDialog({
          count: result.count,
          totalCost: result.totalCost,
          totalBuzz: result.totalBuzz,
          totalProduct: result.totalProduct,
          titles: (result.launched ?? []).map((r) => r.action?.label).filter(Boolean)
        });
        setGameFeedback(
          `Ran ${result.count} side play${result.count === 1 ? '' : 's'} (buzz +${result.totalBuzz}${result.totalProduct ? `, product +${result.totalProduct}` : ''}).`
        );
        refresh();
      })();
      return;
    }

    const buyAllGrowthBtn = e.target.closest('[data-buy-all-growth]');
    if (buyAllGrowthBtn && sessionState) {
      void (async () => {
        const result = runAllRemainingGrowthCampaigns(sessionState);
        if (!result.ok) {
          setGameFeedback(result.reason || 'Could not buy growth plays.', true);
          refresh();
          return;
        }
        appendLog(
          sessionState,
          `Growth: bought ${result.count} paid play${result.count === 1 ? '' : 's'} — spent ${formatMoney(result.totalCost)}, booked ${formatMoney(result.totalRevenue)}.`
        );
        refresh();
        const core = getCoreTaskRevenueMult(sessionState);
        const tune = getSandboxTuningMult(sessionState);
        const total = getTaskRevenueMultiplierPreview(sessionState);
        const multLine =
          sessionState.mode === 'sandbox' && tune !== 1
            ? `${core.toFixed(2)}× progression × ${tune.toFixed(2)}× sandbox = ${total.toFixed(2)}× on these payouts.`
            : `${total.toFixed(2)}× effective multiplier on these payouts.`;
        await openGrowthCampaignBulkOutcomeDialog({
          count: result.count,
          totalCost: result.totalCost,
          totalRevenue: result.totalRevenue,
          totalBuzz: result.totalBuzz,
          titles: (result.launched ?? []).map((r) => r.def?.title).filter(Boolean),
          multLine
        });
        setGameFeedback(
          `Launched ${result.count} growth campaign${result.count === 1 ? '' : 's'} (${formatMoney(result.totalRevenue)} booked).`
        );
        refresh();
      })();
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

    const peopleTab = e.target.closest('[data-people-tab]');
    if (peopleTab && sessionState) {
      setPeopleSection(sessionState, peopleTab.getAttribute('data-people-tab'));
      refresh();
      return;
    }
    const companiesTab = e.target.closest('[data-companies-tab]');
    if (companiesTab && sessionState) {
      setCompaniesSection(sessionState, companiesTab.getAttribute('data-companies-tab'));
      refresh();
      return;
    }
    const ceoTab = e.target.closest('[data-ceo-tab]');
    if (ceoTab && sessionState) {
      setCeoSection(sessionState, ceoTab.getAttribute('data-ceo-tab'));
      refresh();
      return;
    }
    const financeTab = e.target.closest('[data-finance-tab]');
    if (financeTab && sessionState) {
      setFinanceSection(sessionState, financeTab.getAttribute('data-finance-tab'));
      refresh();
      return;
    }
    const confBudgetPreset = e.target.closest('[data-conference-budget-preset]');
    if (confBudgetPreset && sessionState) {
      const input = document.getElementById('conference-budget-input');
      if (input) input.value = confBudgetPreset.getAttribute('data-conference-budget-preset');
      return;
    }
    if (e.target.id === 'btn-save-conference-config' && sessionState) {
      const result = saveStartupConferenceConfig(sessionState, {
        name: document.getElementById('conference-name-input')?.value,
        budgetRaw: document.getElementById('conference-budget-input')?.value,
        monthIndexRaw: document.getElementById('conference-month-select')?.value,
        sponsorTier: document.getElementById('conference-sponsor-select')?.value,
        ticketTier: document.getElementById('conference-ticket-select')?.value
      });
      if (!result.ok) showFinanceFeedback(result.reason || 'Could not save conference.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-acquire-property' && sessionState) {
      const result = acquireFinanceProperty(sessionState, {
        tierId: document.getElementById('property-tier-select')?.value,
        quantityRaw: document.getElementById('property-qty-input')?.value
      });
      if (!result.ok) showFinanceFeedback(result.reason || 'Could not acquire property.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const publicEventBtn = e.target.closest('[data-public-event]');
    if (publicEventBtn && sessionState) {
      const result = runPublicMarketEvent(sessionState, publicEventBtn.getAttribute('data-public-event'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Event blocked.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const publicSubtab = e.target.closest('[data-public-subtab]');
    if (publicSubtab && sessionState) {
      setPublicSection(sessionState, publicSubtab.getAttribute('data-public-subtab'));
      refresh();
      return;
    }
    const preIpoIrBtn = e.target.closest('[data-pre-ipo-ir]');
    if (preIpoIrBtn && sessionState) {
      const result = runPreIpoIrPrep(sessionState, preIpoIrBtn.getAttribute('data-pre-ipo-ir'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Prep blocked.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const bonusBtn = e.target.closest('[data-company-bonus]');
    if (bonusBtn && sessionState) {
      const result = payCompanyWideBonus(sessionState, bonusBtn.getAttribute('data-company-bonus'));
      if (!result.ok) showPeopleFeedback(result.reason, true);
      else {
        const annualTag = result.annualMode ? ' annual' : '';
        appendLog(
          sessionState,
          `People: ${result.pct}%${annualTag} company bonus — ${formatMoney(result.pool)} (${formatMoney(result.ceoShare)} to CEO bank).`
        );
        showPeopleFeedback(
          `${result.pct}%${annualTag} bonus paid (${formatMoney(result.pool)}). CEO received ${formatMoney(result.ceoShare)} in personal bank.`
        );
      }
      refresh();
      return;
    }
    const offsiteBtn = e.target.closest('[data-employee-offsite]');
    if (offsiteBtn && sessionState) {
      const result = conductEmployeeOffsite(sessionState, offsiteBtn.getAttribute('data-employee-offsite'));
      if (!result.ok) showPeopleFeedback(result.reason, true);
      else {
        appendLog(sessionState, `People: ${result.program.label} — spent ${formatMoney(result.cost)}.`);
        showPeopleFeedback(`${result.program.label} booked.`);
      }
      refresh();
      return;
    }
    const perkBtn = e.target.closest('[data-employee-perk]');
    if (perkBtn && sessionState) {
      const result = runExtraEmployeePerk(sessionState, perkBtn.getAttribute('data-employee-perk'));
      if (!result.ok) showPeopleFeedback(result.reason, true);
      else {
        appendLog(sessionState, `People: ${result.perk.label} — ${formatMoney(result.cost)}.`);
        showPeopleFeedback(`${result.perk.label} done.`);
      }
      refresh();
      return;
    }
    const poolBtn = e.target.closest('[data-expand-option-pool]');
    if (poolBtn && sessionState) {
      const result = issueFurtherOptionPool(sessionState, poolBtn.getAttribute('data-expand-option-pool'));
      if (!result.ok) showPeopleFeedback(result.reason, true);
      else {
        appendLog(
          sessionState,
          `Cap table: option pool +${result.pctPoints}% (${(result.sharesAdded ?? 0).toLocaleString()} shares, now ${result.poolPct}% FD).`
        );
        showPeopleFeedback(`Option pool expanded +${result.pctPoints}% (now ${result.poolPct}%).`);
      }
      refresh();
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
    if (e.target.id === 'btn-staff-auto-increase') {
      void handleAutoStaffing('increase');
      return;
    }
    if (e.target.id === 'btn-staff-auto-decrease') {
      void handleAutoStaffing('decrease');
      return;
    }
    if (e.target.id === 'btn-hire-coo' && sessionState) {
      const first = document.getElementById('coo-first-name')?.value;
      const last = document.getElementById('coo-last-name')?.value;
      const equity = document.getElementById('coo-equity-pct')?.value;
      const result = hireCoo(sessionState, {
        firstName: first,
        lastName: last,
        equityPct: equity
      });
      if (!result.ok) showPeopleFeedback(result.reason || 'Could not hire COO.', true);
      else {
        appendLog(sessionState, result.summary);
        showPeopleFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-release-coo' && sessionState) {
      const result = releaseCoo(sessionState);
      if (!result.ok) showPeopleFeedback(result.reason || 'Could not release COO.', true);
      else {
        appendLog(sessionState, result.summary);
        showPeopleFeedback(result.summary);
      }
      refresh();
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
    if (e.target.id === 'btn-save-ceo-salary' && sessionState) {
      const input = document.getElementById('ceo-salary-input');
      const result = setCeoSalaryAnnual(sessionState, input?.value);
      if (!result.ok) showFinanceFeedback(result.reason || 'Invalid salary.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const salPreset = e.target.closest('[data-ceo-salary-preset]');
    if (salPreset && sessionState) {
      const result = setCeoSalaryAnnual(sessionState, salPreset.getAttribute('data-ceo-salary-preset'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Invalid salary.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-ceo-draw-custom' && sessionState) {
      const input = document.getElementById('ceo-draw-input');
      const result = takeOwnerDraw(sessionState, input?.value);
      if (!result.ok) showFinanceFeedback(result.reason || 'Draw failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const homeCashBtn = e.target.closest('[data-ceo-home-cash]');
    if (homeCashBtn && sessionState) {
      const tierId = homeCashBtn.getAttribute('data-ceo-home-cash');
      const tier = getCeoHomeTier(tierId);
      const gate = assertCeoNetWorthGate(sessionState, tier?.minNetWorth);
      const result = purchaseCeoHomeCash(sessionState, tierId, gate);
      if (!result.ok) showCeoFeedback(result.reason || 'Purchase failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    const homeMortgageBtn = e.target.closest('[data-ceo-home-mortgage]');
    if (homeMortgageBtn && sessionState) {
      const tierId = homeMortgageBtn.getAttribute('data-ceo-home-mortgage');
      const tier = getCeoHomeTier(tierId);
      const gate = assertCeoNetWorthGate(sessionState, tier?.minNetWorth);
      const result = purchaseCeoHomeMortgage(sessionState, tierId, gate);
      if (!result.ok) showCeoFeedback(result.reason || 'Mortgage declined.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    const lifestyleBtn = e.target.closest('[data-ceo-lifestyle]');
    if (lifestyleBtn && sessionState) {
      const purchaseId = lifestyleBtn.getAttribute('data-ceo-lifestyle');
      const def = getCeoLifestylePurchase(purchaseId);
      const gate = assertCeoNetWorthGate(sessionState, def?.minNetWorth);
      const result = purchaseCeoLifestyle(sessionState, purchaseId, gate);
      if (!result.ok) showCeoFeedback(result.reason || 'Purchase failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    const lifestyleSellBtn = e.target.closest('[data-ceo-lifestyle-sell]');
    if (lifestyleSellBtn && sessionState) {
      const purchaseId = lifestyleSellBtn.getAttribute('data-ceo-lifestyle-sell');
      const result = sellCeoLifestyle(sessionState, purchaseId);
      if (!result.ok) showCeoFeedback(result.reason || 'Sale failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    const arrBonusBtn = e.target.closest('[data-ceo-arr-bonus]');
    if (arrBonusBtn && sessionState) {
      const result = payCeoArrBonus(sessionState, arrBonusBtn.getAttribute('data-ceo-arr-bonus'));
      if (!result.ok) showCeoFeedback(result.reason, true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    const drawBtn = e.target.closest('[data-owner-draw]');
    if (drawBtn && sessionState) {
      const result = takeOwnerDraw(sessionState, drawBtn.getAttribute('data-owner-draw'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Draw failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const drawPctBtn = e.target.closest('[data-owner-draw-pct]');
    if (drawPctBtn && sessionState) {
      const result = takeOwnerDrawFraction(sessionState, drawPctBtn.getAttribute('data-owner-draw-pct'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Draw failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-sell-ceo-home' && sessionState) {
      const result = sellCeoHome(sessionState);
      if (!result.ok) showCeoFeedback(result.reason || 'Sale failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    const personalGiveBtn = e.target.closest('[data-ceo-personal-give]');
    if (personalGiveBtn && sessionState) {
      const result = donateFromPersonalBank(
        sessionState,
        personalGiveBtn.getAttribute('data-ceo-personal-give')
      );
      if (!result.ok) showCeoFeedback(result.reason || 'Gift failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-ceo-personal-give-custom' && sessionState) {
      const input = document.getElementById('ceo-personal-give-input');
      const result = donateFromPersonalBank(sessionState, input?.value);
      if (!result.ok) showCeoFeedback(result.reason || 'Gift failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    const wlbBtn = e.target.closest('[data-ceo-wlb-complete]');
    if (wlbBtn && sessionState) {
      const result = completeCeoWlbTask(sessionState, wlbBtn.getAttribute('data-ceo-wlb-complete'));
      if (!result.ok) showCeoFeedback(result.reason || 'Balance task failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    const alumniAthleticsBtn = e.target.closest('[data-ceo-alumni-athletics-give]');
    if (alumniAthleticsBtn && sessionState) {
      const result = donateToAlmaMaterAthletics(
        sessionState,
        alumniAthleticsBtn.getAttribute('data-ceo-alumni-athletics-give'),
        alumniAthleticsBtn.getAttribute('data-ceo-alumni-athletics-program') || 'boosters'
      );
      if (!result.ok) showCeoFeedback(result.reason || 'Athletics gift failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    const alumniGiveBtn = e.target.closest('[data-ceo-alumni-give]');
    if (alumniGiveBtn && sessionState) {
      const result = donateToAlmaMater(
        sessionState,
        alumniGiveBtn.getAttribute('data-ceo-alumni-give'),
        alumniGiveBtn.getAttribute('data-ceo-alumni-fund') || 'annual-fund'
      );
      if (!result.ok) showCeoFeedback(result.reason || 'Alumni gift failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-ceo-alumni-give-custom' && sessionState) {
      const input = document.getElementById('ceo-alumni-give-input');
      const fund = document.getElementById('ceo-alumni-fund-select')?.value || 'annual-fund';
      let result;
      if (fund.startsWith('athletics:')) {
        result = donateToAlmaMaterAthletics(sessionState, input?.value, fund.slice('athletics:'.length));
      } else {
        result = donateToAlmaMater(sessionState, input?.value, fund);
      }
      if (!result.ok) showCeoFeedback(result.reason || 'Alumni gift failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    const investDepositBtn = e.target.closest('[data-ceo-invest-deposit]');
    if (investDepositBtn && sessionState) {
      const result = depositPersonalInvestment(
        sessionState,
        investDepositBtn.getAttribute('data-ceo-invest-deposit')
      );
      if (!result.ok) showCeoFeedback(result.reason || 'Deposit failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-ceo-invest-deposit' && sessionState) {
      const input = document.getElementById('ceo-invest-deposit-input');
      const result = depositPersonalInvestment(sessionState, input?.value);
      if (!result.ok) showCeoFeedback(result.reason || 'Deposit failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    const investWithdrawBtn = e.target.closest('[data-ceo-invest-withdraw]');
    if (investWithdrawBtn && sessionState) {
      let amount = investWithdrawBtn.getAttribute('data-ceo-invest-withdraw');
      if (amount === 'max') amount = personalInvestmentBalance(sessionState);
      const result = withdrawPersonalInvestment(sessionState, amount);
      if (!result.ok) showCeoFeedback(result.reason || 'Withdrawal failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
      }
      refresh();
      return;
    }
    const mortgagePrepayBtn = e.target.closest('[data-ceo-mortgage-prepay]');
    if (mortgagePrepayBtn && sessionState) {
      const result = prepayCeoMortgage(
        sessionState,
        mortgagePrepayBtn.getAttribute('data-ceo-mortgage-prepay')
      );
      if (!result.ok) showCeoFeedback(result.reason || 'Prepay failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-payoff-ceo-mortgage' && sessionState) {
      const result = payOffCeoMortgage(sessionState);
      if (!result.ok) showCeoFeedback(result.reason || 'Payoff failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-ceo-mortgage-prepay-custom' && sessionState) {
      const input = document.getElementById('ceo-mortgage-prepay-input');
      const result = prepayCeoMortgage(sessionState, input?.value);
      if (!result.ok) showCeoFeedback(result.reason || 'Prepay failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showCeoFeedback(result.summary);
        preparePersonalExpensesForMonth(sessionState);
      }
      refresh();
      return;
    }
    const sponsorBtn = e.target.closest('[data-sign-sponsorship]');
    if (sponsorBtn && sessionState) {
      const result = signTreasurySponsorship(
        sessionState,
        sponsorBtn.getAttribute('data-sign-sponsorship')
      );
      if (!result.ok) showFinanceFeedback(result.reason || 'Could not sign.', true);
      else {
        appendLog(sessionState, result.summary);
        for (const line of result.brandLines ?? []) appendLog(sessionState, line);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const renewSponsorBtn = e.target.closest('[data-renew-sponsorship]');
    if (renewSponsorBtn && sessionState) {
      const result = renewTreasurySponsorship(
        sessionState,
        renewSponsorBtn.getAttribute('data-renew-sponsorship')
      );
      if (!result.ok) showFinanceFeedback(result.reason || 'Renewal blocked.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const termSponsorBtn = e.target.closest('[data-terminate-sponsorship]');
    if (termSponsorBtn && sessionState) {
      const result = terminateTreasurySponsorship(
        sessionState,
        termSponsorBtn.getAttribute('data-terminate-sponsorship')
      );
      if (!result.ok) showFinanceFeedback(result.reason || 'Could not exit.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const charityBtn = e.target.closest('[data-charity-donate]');
    if (charityBtn && sessionState) {
      const result = donateToCharity(sessionState, charityBtn.getAttribute('data-charity-donate'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Donation failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-charity-donate-custom' && sessionState) {
      const input = document.getElementById('charity-donate-input');
      const result = donateToCharity(sessionState, input?.value);
      if (!result.ok) showFinanceFeedback(result.reason || 'Donation failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-close-angel-safe') {
      handleCloseAngelSafe();
      return;
    }
    if (e.target.id === 'btn-close-seed') {
      handleCloseSeed('standard');
      return;
    }
    const seedStructBtn = e.target.closest('[data-seed-structure]');
    if (seedStructBtn && sessionState) {
      handleCloseSeed(seedStructBtn.getAttribute('data-seed-structure'));
      return;
    }
    const loanBtn = e.target.closest('[data-loan-draw]');
    if (loanBtn && sessionState) {
      const result = requestLoanDraw(sessionState, loanBtn.getAttribute('data-loan-draw'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Loan declined.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const prepayBtn = e.target.closest('[data-loan-prepay]');
    if (prepayBtn && sessionState) {
      const result = prepayLoan(sessionState, prepayBtn.getAttribute('data-loan-prepay'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Prepay failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-loan-refinance' && sessionState) {
      const result = refinanceLoanAfterSeed(sessionState);
      if (!result.ok) showFinanceFeedback(result.reason || 'Cannot refinance.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.id === 'btn-revenue-advance' && sessionState) {
      const result = drawRevenueAdvance(sessionState);
      if (!result.ok) showFinanceFeedback(result.reason || 'Revenue advance unavailable.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
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
    const decisionBtn = e.target.closest('[data-decision-choice]');
    if (decisionBtn) {
      handleDecisionChoice(Number(decisionBtn.getAttribute('data-decision-choice')));
      return;
    }
    const acqBuy = e.target.closest('[data-acquisition-buy]');
    if (acqBuy) {
      handleAcquisitionBuy(acqBuy.getAttribute('data-acquisition-buy'));
      return;
    }
    const acqSell = e.target.closest('[data-acquisition-sell]');
    if (acqSell) {
      handleAcquisitionSell(acqSell.getAttribute('data-acquisition-sell'));
      return;
    }
    const acqReinvestPick = e.target.closest('[data-acquisition-reinvest-pick]');
    if (acqReinvestPick) {
      const id = acqReinvestPick.getAttribute('data-acquisition-reinvest-pick');
      const pct = acqReinvestPick.getAttribute('data-reinvest-pct');
      const input = document.querySelector(`[data-reinvest-pct-input="${CSS.escape(id)}"]`);
      if (input && pct != null) input.value = pct;
      return;
    }
    const acqReinvestSubmit = e.target.closest('[data-acquisition-reinvest-submit]');
    if (acqReinvestSubmit) {
      handleAcquisitionReinvestSubmit(acqReinvestSubmit.getAttribute('data-acquisition-reinvest-submit'));
      return;
    }
    const filterBtn = e.target.closest('[data-companies-filter]');
    if (filterBtn && sessionState) {
      setCompaniesMarketFilter(sessionState, filterBtn.getAttribute('data-companies-filter'));
      refresh();
      return;
    }
    const pageBtn = e.target.closest('[data-companies-page]');
    if (pageBtn && sessionState) {
      const dir = pageBtn.getAttribute('data-companies-page');
      setCompaniesMarketPage(sessionState, dir === 'next' ? 1 : -1);
      refresh();
      return;
    }
    const sortBtn = e.target.closest('[data-companies-sort]');
    if (sortBtn && sessionState) {
      setCompaniesMarketSort(sessionState, sortBtn.getAttribute('data-companies-sort'));
      refresh();
      return;
    }
    const ddBtn = e.target.closest('[data-acquisition-diligence]');
    if (ddBtn && sessionState) {
      const result = runDueDiligence(sessionState, ddBtn.getAttribute('data-acquisition-diligence'));
      if (!result.ok) showCompaniesFeedback(result.reason || 'Due diligence failed.', true);
      else {
        appendLog(sessionState, `Due diligence: ${result.summary}`);
        showCompaniesFeedback(result.summary);
      }
      refresh();
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
    const sellPctBtn = e.target.closest('[data-sell-founder-pct]');
    if (sellPctBtn && sessionState) {
      handleSellFounderStock(sellPctBtn.getAttribute('data-sell-founder-pct'));
      return;
    }
    if (e.target.id === 'btn-sell-founder-custom' && sessionState) {
      const input = document.getElementById('ceo-sell-pct-input');
      handleSellFounderStock(input?.value);
      return;
    }
    const guidanceBtn = e.target.closest('[data-stock-guidance]');
    if (guidanceBtn && sessionState) {
      const result = setPublicGuidanceTone(sessionState, guidanceBtn.getAttribute('data-stock-guidance'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Could not set guidance.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    const buybackBtn = e.target.closest('[data-stock-buyback]');
    if (buybackBtn && sessionState) {
      const result = executeStockBuyback(sessionState, buybackBtn.getAttribute('data-stock-buyback'));
      if (!result.ok) showFinanceFeedback(result.reason || 'Buyback failed.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.closest('[data-stock-follow-on]') && sessionState) {
      const result = fileFollowOnOffering(sessionState);
      if (!result.ok) showFinanceFeedback(result.reason || 'Follow-on blocked.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.closest('[data-stock-split]') && sessionState) {
      const result = executeStockSplit(sessionState);
      if (!result.ok) showFinanceFeedback(result.reason || 'Split blocked.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
      return;
    }
    if (e.target.closest('[data-stock-dividend]') && sessionState) {
      const result = declareStockDividend(sessionState);
      if (!result.ok) showFinanceFeedback(result.reason || 'Dividend blocked.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
      }
      refresh();
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
  });

  app?.addEventListener('change', (e) => {
    if (e.target.id === 'satellite-template' || e.target.id === 'satellite-size') {
      paintSatelliteOpenPreview();
    }
    if (e.target.id === 'board-seat-candidate') {
      const candidate = getBoardSeatCandidates().find((c) => c.id === e.target.value);
      const blurb = document.getElementById('board-seat-candidate-blurb');
      if (blurb && candidate?.blurb) blurb.textContent = candidate.blurb;
    }
  });

  app?.addEventListener('change', (e) => {
    if (e.target.matches('[data-company-bonus-annual]') && sessionState) {
      setCompanyBonusAnnualMode(sessionState, e.target.checked);
      refresh();
      return;
    }
    if (e.target.matches('[data-reinvest-program-for]')) {
      handleReinvestProgramChange(e.target);
      return;
    }
    if (e.target.id === 'coo-equity-pct' && sessionState) {
      const tier = e.target.getAttribute('data-workspace-tier') ?? sessionState.workspace?.tier ?? 'garage';
      const equity = Number(e.target.value);
      const sal = previewCooSalaryMonthly(sessionState, equity);
      const preview = document.getElementById('coo-salary-preview');
      if (preview) {
        preview.textContent =
          tier === 'garage'
            ? `≈ ${formatMoney(sal)}/mo at this equity grant`
            : `≈ ${formatMoney(sal)}/mo at ${tier} workspace`;
      }
      return;
    }
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
      return;
    }
    if (e.target.id === 'loan-draw-form') {
      e.preventDefault();
      if (!sessionState) return;
      const raw = e.target.elements?.amount?.value ?? document.getElementById('loan-draw-custom')?.value;
      const result = requestLoanDraw(sessionState, raw);
      if (!result.ok) showFinanceFeedback(result.reason || 'Loan declined.', true);
      else {
        appendLog(sessionState, result.summary);
        showFinanceFeedback(result.summary);
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

  app?.addEventListener('input', (e) => {
    if (e.target.id !== 'companies-market-search' || !sessionState) return;
    setCompaniesMarketSearch(sessionState, e.target.value);
    refresh();
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
  populateAlmaMaterSelect(document.getElementById('ceo-alma-mater'));

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
        'The wire is live — batch interviews, headlines, and IPO press are freshly written.';
    } else if (isNarrativeApiEnabled()) {
      apiStatus.textContent =
        'Live story server is quiet — headlines still update each month. Reload if interviews stay stuck.';
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
    const ceoBirthMonth = fd.get('ceoBirthMonth');
    const ceoBirthYear = fd.get('ceoBirthYear');
    const almaMaterId = String(fd.get('almaMaterId') || '').trim();
    const categoryId = String(fd.get('category') || '');
    const mode = String(fd.get('mode') || 'career');
    const sandboxCash = fd.get('sandboxCash');

    if (!companyName || !ceoFirstName || !ceoLastName || !categoryId || !almaMaterId) return;

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
        ceoBirthMonth,
        ceoBirthYear,
        almaMaterId,
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
        loadGrowthLevers(),
        loadAssetManifest(),
        initNarrativeApiUrl(),
        preloadCrisisCatalog(),
        preloadDecisionEvents(),
        preloadAcquisitionCatalog(),
        preloadTreasurySponsorshipDeals(),
        preloadCeoAlmaMaterCatalog(),
        preloadCeoLifestyleCatalog(),
        preloadCeoWlbCatalog(),
        preloadFinancePropertyPrograms(),
        preloadNewsTimeline()
      ]);
      populateCategorySelect(categorySelect, getCategoriesSync());
      populateAlmaMaterSelect(document.getElementById('ceo-alma-mater'));
    } catch {
      /* bundled data already playable */
    }
    await probeNarrativeApi({ retries: 2 });
    syncNarrativeStatus();
  })();
}

init();

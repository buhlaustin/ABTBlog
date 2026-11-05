/**
 * Headless smoke checks for Startup Simulator (no browser).
 * Run: node scripts/startup-sim-smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sim = join(root, 'work', 'startup-sim');

const tasksJson = JSON.parse(readFileSync(join(sim, 'data/tasks.json'), 'utf8'));
const { STAGES, getMonthlyTaskSlots, getMonthlyTaskOfferCount } = await import(
  `file://${join(sim, 'modules/constants.js')}`
);
const { createInitialState, normalizeSave, formatMoney } = await import(
  `file://${join(sim, 'modules/GameState.js')}`
);
const {
  hydrateTaskCatalog,
  dealMonthlyTasks,
  pickMonthlyTaskDefs,
  monthDealHasDuplicateTaskIds,
  confirmTaskLineup,
  getTaskPoolSize
} = await import(`file://${join(sim, 'modules/Tasks.js')}`);
hydrateTaskCatalog(tasksJson);

function categoryAllowed(task, categoryId) {
  const cats = task.categories;
  if (!cats?.length) return true;
  return cats.includes(categoryId);
}

function stageAllowed(task, stage) {
  const stages = task.stages ?? ['garage'];
  if (stage === STAGES.GARAGE || stage === STAGES.OFFICE) return stages.includes(stage);
  if (stage === STAGES.XC) return stages.includes('xc') || stages.includes('office');
  if (stage === STAGES.POST_XC) return stages.includes('post_xc') || stages.includes('xc');
  if (stage === STAGES.PUBLIC) return stages.includes('public') || stages.includes('post_xc');
  return stages.includes(stage);
}

let failed = false;
const smokeCategory = 'b2b-saas';
for (const stage of Object.values(STAGES)) {
  const pool = tasksJson.tasks.filter(
    (t) => stageAllowed(t, stage) && categoryAllowed(t, smokeCategory)
  );
  const slots = getMonthlyTaskSlots(stage);
  if (pool.length === 0) {
    console.error(`FAIL: no tasks for stage ${stage}`);
    failed = true;
    continue;
  }
  if (pool.length < slots) {
    console.error(`FAIL: stage ${stage} category ${smokeCategory} pool ${pool.length} < slots ${slots}`);
    failed = true;
  }
  console.log(`OK: stage ${stage} pool ${pool.length}, slots ${slots}`);
}

const allCategories = JSON.parse(readFileSync(join(sim, 'data/categories.json'), 'utf8')).map(
  (c) => c.id
);
for (const stage of [STAGES.POST_XC, STAGES.PUBLIC]) {
  const slots = getMonthlyTaskSlots(stage);
  for (const categoryId of allCategories) {
    const pool = tasksJson.tasks.filter(
      (t) => stageAllowed(t, stage) && categoryAllowed(t, categoryId)
    );
    if (pool.length < slots) {
      console.error(
        `FAIL: ${stage} / ${categoryId} pool ${pool.length} < ${slots} monthly slots`
      );
      failed = true;
      continue;
    }
    let recent = [];
    let dupMonth = false;
    for (let i = 0; i < 40; i += 1) {
      const picked = pickMonthlyTaskDefs(pool, slots, recent);
      if (monthDealHasDuplicateTaskIds(picked)) {
        dupMonth = true;
        break;
      }
      recent = [...recent, ...picked.map((d) => d.id)];
    }
    if (dupMonth) {
      console.error(`FAIL: duplicate task ids in one month for ${stage} / ${categoryId}`);
      failed = true;
    } else {
      console.log(`OK: ${stage} / ${categoryId} unique monthly deals (${pool.length} tasks)`);
    }
  }
}

const state = createInitialState({
  companyName: 'SmokeTest',
  categoryId: 'b2b-saas',
  mode: 'career'
});

if (!state.calendar.monthTaskOffers?.length) {
  dealMonthlyTasks(state);
}
if (state.calendar.monthTaskOffers?.length && !state.calendar.taskLineupConfirmed) {
  const slots = state.calendar.monthTaskSlotTarget ?? 4;
  let picked = 0;
  for (const offer of state.calendar.monthTaskOffers) {
    if (picked >= slots) break;
    offer.selected = true;
    picked += 1;
  }
  confirmTaskLineup(state);
}
if (!state.calendar.monthTasks?.length) {
  console.error('FAIL: could not deal tasks after hydrating catalog');
  failed = true;
} else {
  console.log(`OK: initial deal ${state.calendar.monthTasks.length} tasks`);
}

const { getTaskDef } = await import(`file://${join(sim, 'modules/Tasks.js')}`);
const garageOffers = state.calendar.monthTaskOffers?.length
  ? state.calendar.monthTaskOffers
  : state.calendar.monthTasks;
const preLaunchOnly = (garageOffers ?? []).every((o) => {
  const def = getTaskDef(o.taskId);
  return def?.launchPhase === 'pre_launch';
});
if (!preLaunchOnly || !(garageOffers?.length >= 4)) {
  console.error('FAIL: garage should deal pre-launch playbook tasks only');
  failed = true;
} else {
  console.log('OK: garage pre-launch task pool');
}

const {
  canSchedulePublicLaunch,
  PRE_LAUNCH_BUZZ_REQUIRED,
  PRE_LAUNCH_PRODUCT_REQUIRED,
  onScheduleLaunchTaskCompleted,
  recordPreLaunchTaskOutcome
} = await import(`file://${join(sim, 'modules/LaunchLifecycle.js')}`);
const garagePool = getTaskPoolSize(state);
const offerNeed = getMonthlyTaskOfferCount(STAGES.GARAGE);
if (garagePool < offerNeed) {
  console.error(`FAIL: garage pre-launch pool ${garagePool} < offers ${offerNeed}`);
  failed = true;
}
state.product.buzz = PRE_LAUNCH_BUZZ_REQUIRED - 1;
if (canSchedulePublicLaunch(state)) {
  console.error('FAIL: schedule launch should require 10 buzz');
  failed = true;
}
const blocked = onScheduleLaunchTaskCompleted(state);
if (blocked.ok) {
  console.error('FAIL: schedule with low buzz should fail');
  failed = true;
}
state.product.buzz = PRE_LAUNCH_BUZZ_REQUIRED;
state.product.level = PRE_LAUNCH_PRODUCT_REQUIRED - 1;
if (canSchedulePublicLaunch(state)) {
  console.error('FAIL: schedule should require product level');
  failed = true;
}
state.product.level = PRE_LAUNCH_PRODUCT_REQUIRED;
if (!canSchedulePublicLaunch(state)) {
  console.error('FAIL: schedule should unlock at buzz + product gates');
  failed = true;
}
const wl = recordPreLaunchTaskOutcome(state, { launchPhase: 'pre_launch', types: ['marketing'], buzz: 2 }, 500);
if (!state.launch.waitlistSignups || !wl.length) {
  console.error('FAIL: pre-launch waitlist tracking');
  failed = true;
} else if (!failed) {
  console.log(`OK: pre-launch gates (${PRE_LAUNCH_BUZZ_REQUIRED} buzz, ${PRE_LAUNCH_PRODUCT_REQUIRED} product)`);
}

const { totalHeadcountCap } = await import(`file://${join(sim, 'modules/Offices.js')}`);
if (totalHeadcountCap(state) !== 0) {
  console.error('FAIL: garage headcount cap expected 0 got', totalHeadcountCap(state));
  failed = true;
} else {
  console.log('OK: Offices STAGES import / headcount cap');
}

if (normalizeSave(null) !== null) failed = true;
if (normalizeSave({ company: {}, finance: {} }) !== null) failed = true;

const {
  getTaskRevenueMultiplierPreview,
  getCoreTaskRevenueMult,
  getRawTaskRevenueMultiplier,
  REV_MULT_CAP_CAREER,
  REV_MULT_CAP_SANDBOX
} = await import(`file://${join(sim, 'modules/Finance.js')}`);
const careerMult = getTaskRevenueMultiplierPreview(state);
if (careerMult < 0.9 || careerMult > 2.5) {
  console.error(`FAIL: career HUD revenue mult out of range: ${careerMult}`);
  failed = true;
} else {
  console.log(`OK: career effective revenue mult ${careerMult}`);
}

const lowCashSandbox = createInitialState({
  companyName: 'SandboxScrappy',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 25_000,
  sandboxTuning: { revenueMult: 2, startingStage: 'garage', ipoGateArr: 50_000_000 }
});
if (lowCashSandbox.finance.cash !== 25_000) {
  console.error(`FAIL: sandbox low cash expected 25000 got ${lowCashSandbox.finance.cash}`);
  failed = true;
} else {
  console.log('OK: sandbox can start at $25k with tuning');
}

const sandboxState = createInitialState({
  companyName: 'SandboxMult',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: { revenueMult: 2, costMult: 1, ipoGateArr: 1_000_000_000 }
});
const sandboxMult = getTaskRevenueMultiplierPreview(sandboxState);
const sandboxCore = getCoreTaskRevenueMult(sandboxState);
if (sandboxMult < 1.5) {
  console.error(`FAIL: sandbox 2x tuning should raise effective mult, got ${sandboxMult}`);
  failed = true;
} else {
  console.log(`OK: sandbox tuned revenue mult ${sandboxMult}`);
}
const overlayState = createInitialState({
  companyName: 'Overlay',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: { revenueMult: 2, startingStage: 'garage', ipoGateArr: 1_000_000_000 }
});
overlayState.flags.seedRoundClosed = true;
overlayState.flags.seriesAClosed = true;
const coreCareer = getCoreTaskRevenueMult({
  ...overlayState,
  mode: 'career',
  sandboxTuning: null
});
const coreSand = getCoreTaskRevenueMult(overlayState);
const totalSand = getTaskRevenueMultiplierPreview(overlayState);
const expectedUncapped = Math.round(coreSand * 2 * 100) / 100;
const expected = Math.min(expectedUncapped, REV_MULT_CAP_SANDBOX);
if (Math.abs(totalSand - expected) > 0.05) {
  console.error(
    `FAIL: sandbox overlay expected ~${expected} (core ${coreSand} × 2 capped), got ${totalSand}`
  );
  failed = true;
} else {
  console.log(`OK: sandbox overlay stacks (${coreSand} × 2 = ${totalSand})`);
}
if (Math.abs(coreSand - coreCareer) > 0.05) {
  console.error(`FAIL: core mult should match career vs sandbox core ${coreSand} vs ${coreCareer}`);
  failed = true;
}

const { completeXcAcceptance, isInResidency, nextXcBatchStart } = await import(
  `file://${join(sim, 'modules/XC.js')}`
);
const { startMonth } = await import(`file://${join(sim, 'modules/Calendar.js')}`);
const xcState = createInitialState({
  companyName: 'XCSchedule',
  categoryId: 'b2b-saas',
  mode: 'career'
});
xcState.calendar = { year: 2026, monthIndex: 4 };
xcState.meta.calendarStartYear = 2026;
xcState.meta.calendarStartMonth = 4;
xcState.flags.xcUnlocked = true;
const accept = completeXcAcceptance(xcState);
const expectedStart = nextXcBatchStart(2026, 4);
if (!accept.ok || !xcState.xc?.batchStartsTurn) {
  console.error('FAIL: XC acceptance should schedule batch start turn');
  failed = true;
} else if (xcState.xc.scheduledBatchCode !== 'XC S26') {
  console.error(
    `FAIL: April acceptance should schedule XC S26, got ${xcState.xc.scheduledBatchCode}`
  );
  failed = true;
} else if (isInResidency(xcState)) {
  console.error('FAIL: XC batch should not start same month as acceptance');
  failed = true;
} else {
  const { advanceCalendarMonth } = await import(`file://${join(sim, 'modules/Calendar.js')}`);
  while (
    xcState.calendar.year < expectedStart.year ||
    (xcState.calendar.year === expectedStart.year &&
      xcState.calendar.monthIndex < expectedStart.monthIndex)
  ) {
    advanceCalendarMonth(xcState);
    startMonth(xcState);
  }
  if (!isInResidency(xcState) || xcState.xc?.residencyMonthsRemaining !== 3) {
    console.error('FAIL: XC batch should begin at seasonal start with 3 months remaining');
    failed = true;
  } else if (xcState.xc.batchLabel !== 'XC S26') {
    console.error(`FAIL: residency batch label should be XC S26, got ${xcState.xc.batchLabel}`);
    failed = true;
  } else {
    console.log('OK: XC seasonal batch (April accept → Summer S26 in July)');
  }
}

const fallState = createInitialState({
  companyName: 'XCFall',
  categoryId: 'b2b-saas',
  mode: 'career'
});
fallState.calendar = { year: 2026, monthIndex: 9 };
fallState.meta.calendarStartYear = 2026;
fallState.meta.calendarStartMonth = 9;
fallState.flags.xcUnlocked = true;
completeXcAcceptance(fallState);
if (fallState.xc.scheduledBatchCode !== 'XC F26') {
  console.error(`FAIL: September acceptance should schedule XC F26, got ${fallState.xc.scheduledBatchCode}`);
  failed = true;
} else {
  console.log('OK: XC seasonal batch (September accept → Fall F26 in October)');
}

const { progressionRevenueMult } = await import(
  `file://${join(sim, 'modules/ProgressionEconomy.js')}`
);
const scaled = createInitialState({
  companyName: 'Scaled',
  categoryId: 'b2b-saas',
  mode: 'career'
});
scaled.flags.seedRoundClosed = true;
scaled.flags.seriesAClosed = true;
scaled.flags.seriesBClosed = true;
scaled.finance.mrr = 2_000_000;
scaled.finance.arr = 24_000_000;
const progMult = progressionRevenueMult(scaled);
if (progMult < 8 || progMult > 120) {
  console.error(`FAIL: post-Series-B progression mult out of range: ${progMult}`);
  failed = true;
} else {
  console.log(`OK: progression revenue mult after A/B ${progMult}`);
}

const { WORKSPACE_TIER } = await import(`file://${join(sim, 'modules/Workspace.js')}`);
const maxed = createInitialState({
  companyName: 'CapTest',
  categoryId: 'b2b-saas',
  mode: 'career'
});
maxed.flags.xcResidencyComplete = true;
maxed.flags.seedRoundClosed = true;
maxed.flags.seriesAClosed = true;
maxed.flags.seriesBClosed = true;
maxed.flags.seriesCClosed = true;
maxed.flags.seriesDClosed = true;
maxed.flags.seriesEClosed = true;
maxed.flags.seriesFClosed = true;
maxed.flags.ipoFiled = true;
maxed.workspace.tier = WORKSPACE_TIER.HUB;
maxed.offices.hubId = 'bay';
maxed.offices.modifiers = { revenueMult: 1.12, costMult: 1.15, salaryMult: 1.12 };
maxed.finance.arr = 500_000_000;
maxed.product.level = 40;
maxed.product.buzz = 40;
maxed.staff.headcountByDept = { engineering: 50, sales: 50, marketing: 50, product: 50 };
const rawCareer = getRawTaskRevenueMultiplier(maxed);
const cappedCareer = getTaskRevenueMultiplierPreview(maxed);
if (cappedCareer > REV_MULT_CAP_CAREER + 0.01) {
  console.error(`FAIL: career cap exceeded: ${cappedCareer}`);
  failed = true;
} else if (rawCareer <= REV_MULT_CAP_CAREER) {
  console.log(`OK: career cap not triggered (raw ${rawCareer.toFixed(2)}×)`);
} else {
  console.log(`OK: career rev mult capped ${rawCareer.toFixed(1)}× → ${cappedCareer}×`);
}

const maxedSand = createInitialState({
  companyName: 'CapTestSand',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: { revenueMult: 20, ipoGateArr: 1_000_000_000, costMult: 1, startingStage: 'garage' }
});
maxedSand.flags = { ...maxed.flags };
maxedSand.workspace = { ...maxed.workspace };
maxedSand.offices = JSON.parse(JSON.stringify(maxed.offices));
maxedSand.finance = { ...maxed.finance };
maxedSand.product = { ...maxed.product };
maxedSand.staff = JSON.parse(JSON.stringify(maxed.staff));
const cappedSand = getTaskRevenueMultiplierPreview(maxedSand);
if (cappedSand > REV_MULT_CAP_SANDBOX + 0.01) {
  console.error(`FAIL: sandbox cap exceeded: ${cappedSand}`);
  failed = true;
} else {
  console.log(`OK: sandbox rev mult cap ${cappedSand}×`);
}

const { completeBoardTask, dealBoardTasks } = await import(
  `file://${join(sim, 'modules/Board.js')}`
);
const boardState = createInitialState({
  companyName: 'BoardSmoke',
  categoryId: 'b2b-saas',
  mode: 'career'
});
boardState.flags.seriesAClosed = true;
dealBoardTasks(boardState);
const inst = boardState.board?.monthTasks?.[0];
if (!inst) {
  console.error('FAIL: board tasks not dealt');
  failed = true;
} else {
  const boardResult = completeBoardTask(boardState, inst.instanceId);
  if (
    !boardResult.ok ||
    boardResult.sentimentAfter == null ||
    boardResult.sentimentDelta == null
  ) {
    console.error('FAIL: board task should return approval delta and new score');
    failed = true;
  } else {
    console.log('OK: board task outcome fields');
  }
}

const { applyOfflineMonthlyNews, archiveCurrentNews } = await import(
  `file://${join(sim, 'modules/News.js')}`
);
const newsA = createInitialState({
  companyName: 'NewsCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
newsA.meta.runSeed = 4242;
applyOfflineMonthlyNews(newsA);
const headA = newsA.news.currentMonthArticles?.[0]?.headline ?? '';
archiveCurrentNews(newsA);
const { advanceCalendarMonth: advanceNewsMonth } = await import(
  `file://${join(sim, 'modules/Calendar.js')}`
);
advanceNewsMonth(newsA);
applyOfflineMonthlyNews(newsA);
const headB = newsA.news.currentMonthArticles?.[0]?.headline ?? '';
if (!headA || headA === headB) {
  console.error(`FAIL: monthly news should rotate (${headA} vs ${headB})`);
  failed = true;
} else if ((newsA.news.unreadCount ?? 0) < 1) {
  console.error('FAIL: new month news should mark unread');
  failed = true;
} else {
  console.log('OK: monthly news rotates and marks unread');
}

const { applyScenarioEffects, scenarioRevenueMult, isFundraisingBlockedByScenario } =
  await import(`file://${join(sim, 'modules/ScenarioEffects.js')}`);
const { applyDecisionChoice, hasActiveDecision, createInitialDecisionState } = await import(
  `file://${join(sim, 'modules/DecisionEvents.js')}`
);
const { canEndMonth } = await import(`file://${join(sim, 'modules/Tasks.js')}`);

const scenarioState = createInitialState({
  companyName: 'ScenarioCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
scenarioState.decision = createInitialDecisionState();
scenarioState.decision.active = {
  id: 'test',
  title: 'Test fork',
  choices: [
    {
      label: 'Take premium path',
      effects: {
        cash: -1000,
        sentiment: 3,
        modifier: { id: 'smoke-premium', label: 'Premium path', revenueMult: 1.1, months: 2 }
      }
    }
  ]
};
if (canEndMonth(scenarioState)) {
  console.error('FAIL: active decision should block month close');
  failed = true;
}
const decResult = applyDecisionChoice(scenarioState, 0);
if (!decResult.ok || hasActiveDecision(scenarioState) || scenarioRevenueMult(scenarioState) < 1.09) {
  console.error('FAIL: decision choice should apply modifier and clear active');
  failed = true;
} else {
  console.log('OK: desk decision applies fallout and unblocks month');
}

applyScenarioEffects(scenarioState, {
  modifier: {
    id: 'smoke-block',
    label: 'PR freeze',
    fundraisingBlocked: true,
    months: 1
  }
});
if (!isFundraisingBlockedByScenario(scenarioState)) {
  console.error('FAIL: scenario modifier should block fundraising');
  failed = true;
} else {
  console.log('OK: scenario fundraising block');
}

const { buzzEngagementMult, socialFollowers } = await import(
  `file://${join(sim, 'modules/Social.js')}`
);
const lowBuzz = createInitialState({
  companyName: 'SocialLow',
  categoryId: 'b2b-saas',
  mode: 'career'
});
lowBuzz.product.buzz = 0;
const highBuzz = createInitialState({
  companyName: 'SocialHigh',
  categoryId: 'b2b-saas',
  mode: 'career'
});
highBuzz.product.buzz = 15;
const lowLikes = Math.round(10 * buzzEngagementMult(lowBuzz));
const highLikes = Math.round(10 * buzzEngagementMult(highBuzz));
if (highLikes <= lowLikes || socialFollowers(highBuzz, 'chirp') <= socialFollowers(lowBuzz, 'chirp')) {
  console.error(`FAIL: buzz should boost social reach (${lowLikes} vs ${highLikes} likes)`);
  failed = true;
} else {
  console.log(`OK: buzz scales social engagement (${lowLikes} → ${highLikes} likes, mult ${buzzEngagementMult(highBuzz).toFixed(2)}×)`);
}

const { applyOfflineMonthlySocial, unreadSocialCount } = await import(
  `file://${join(sim, 'modules/Social.js')}`
);
const feedState = createInitialState({
  companyName: 'FeedCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
applyOfflineMonthlySocial(feedState);
if ((unreadSocialCount(feedState) ?? 0) < 1) {
  console.error('FAIL: monthly social should mark unread feed posts');
  failed = true;
} else {
  console.log('OK: social unread count after month feed');
}

const preSeedState = createInitialState({
  companyName: 'PreSeedPool',
  categoryId: 'b2b-saas',
  mode: 'career'
});
preSeedState.flags.xcResidencyComplete = true;
preSeedState.flags.seedRoundClosed = false;
for (const categoryId of allCategories) {
  preSeedState.company.categoryId = categoryId;
  const poolSize = getTaskPoolSize(preSeedState);
  const need = getMonthlyTaskSlots(STAGES.POST_XC) + 2;
  if (poolSize < need) {
    console.error(
      `FAIL: post-XC pre-seed pool for ${categoryId} is ${poolSize} (need ≥ ${need} offers)`
    );
    failed = true;
  }
}
if (!failed) {
  console.log('OK: post-XC pre-seed desk pool covers monthly offers (all categories)');
}

const {
  preloadAcquisitionCatalog,
  getAcquisitionCatalog,
  purchaseTarget,
  totalSubsidiaryMrr,
  applySubsidiaryMrrPayout
} = await import(`file://${join(sim, 'modules/Acquisitions.js')}`);
await preloadAcquisitionCatalog();
if (getAcquisitionCatalog().length !== 99) {
  console.error(`FAIL: expected 99 acquisition targets, got ${getAcquisitionCatalog().length}`);
  failed = true;
} else {
  console.log('OK: acquisition catalog has 99 companies');
}
const acqState = createInitialState({
  companyName: 'HoldCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 100_000_000
});
acqState.flags.xcResidencyComplete = true;
const small = getAcquisitionCatalog().find((c) => c.segment === 'small' && !c.isRival);
const buy = purchaseTarget(acqState, small.id);
if (!buy.ok) {
  console.error(`FAIL: could not buy small co: ${buy.reason}`);
  failed = true;
} else {
  const before = acqState.finance.cash;
  const payout = applySubsidiaryMrrPayout(acqState);
  if (payout.total < 1 || acqState.finance.cash <= before) {
    console.error('FAIL: subsidiary MRR payout should add cash');
    failed = true;
  } else {
    console.log(`OK: acquisition + portfolio MRR (${formatMoney(totalSubsidiaryMrr(acqState))}/mo)`);
  }
}

const { STAGES: ST } = await import(`file://${join(sim, 'modules/constants.js')}`);
const {
  fileIpo,
  tickPublicMarket,
  setPublicGuidanceTone,
  executeStockBuyback,
  whisperRevenueTarget
} = await import(`file://${join(sim, 'modules/IPO.js')}`);
const pub = createInitialState({ companyName: 'Ticker Co', categoryId: 'b2b-saas', mode: 'sandbox' });
pub.stage = ST.PUBLIC;
pub.flags.seedRoundClosed = true;
pub.flags.ipoUnlocked = true;
pub.finance.mrr = 5_000_000;
pub.finance.monthlyBurn = 400_000;
pub.finance.cash = 50_000_000;
const ipo = fileIpo(pub);
if (!ipo.ok) {
  console.error(`FAIL: fileIpo smoke: ${ipo.reason}`);
  failed = true;
} else {
  const tone = setPublicGuidanceTone(pub, 'aggressive');
  if (!tone.ok || whisperRevenueTarget(pub) <= 0) {
    console.error('FAIL: public guidance / whisper target');
    failed = true;
  }
  const tick = tickPublicMarket(pub);
  if (!pub.publicMarket.sharePrice || tick.deltaPct == null) {
    console.error('FAIL: tickPublicMarket');
    failed = true;
  }
  const bb = executeStockBuyback(pub, 250_000);
  if (!bb.ok) {
    console.error(`FAIL: buyback smoke: ${bb.reason}`);
    failed = true;
  }
  const { tickPublicMarketAtMonthStart } = await import(`file://${join(sim, 'modules/IPO.js')}`);
  tickPublicMarketAtMonthStart(pub);
  if (!pub.publicMarket.marketTape?.length) {
    console.error('FAIL: market tape after buyback');
    failed = true;
  } else if (!failed) {
    console.log('OK: late-game public market (IPO, guidance, tick, buyback, tape)');
  }
}

const { closeAngelSafe, canCloseAngelSafe } = await import(`file://${join(sim, 'modules/AngelSafe.js')}`);
const { joinAccelerator } = await import(`file://${join(sim, 'modules/Accelerators.js')}`);
const { computeCreditLimit, requestLoanDraw, loanOverheadMonthly, prepayLoan, computeCreditScore, bankApprovalBreakdown } =
  await import(`file://${join(sim, 'modules/BankLoan.js')}`);
const { convertOutstandingSafesAtSeed } = await import(`file://${join(sim, 'modules/FinanceCapital.js')}`);
const { drawRevenueAdvance, rbfOutstanding } = await import(`file://${join(sim, 'modules/RevenueAdvance.js')}`);
const angelState = createInitialState({ companyName: 'Angel Co', categoryId: 'b2b-saas', mode: 'sandbox' });
angelState.product.level = 2;
const ag = closeAngelSafe(angelState);
if (!ag.ok) {
  console.error(`FAIL: angel SAFE: ${ag.reason}`);
  failed = true;
} else if (angelState.finance.cash < 50_000) {
  console.error('FAIL: angel SAFE cash');
  failed = true;
}
const xcAccel = createInitialState({ companyName: 'Accel Co', categoryId: 'b2b-saas', mode: 'sandbox' });
xcAccel.flags.xcAccepted = true;
xcAccel.finance.arr = 80_000;
xcAccel.finance.mrr = Math.round(80_000 / 12);
const ja = joinAccelerator(xcAccel, 'angel-rail');
if (!ja.ok) {
  console.error(`FAIL: accelerator after XC: ${ja.reason}`);
  failed = true;
}
const loanState = createInitialState({ companyName: 'Loan Co', categoryId: 'b2b-saas', mode: 'sandbox' });
loanState.finance.lifetimeRevenue = 100_000;
loanState.finance.arr = 60_000;
loanState.finance.mrr = 5_000;
loanState.meta.runSeed = 42;
let approved = false;
const { advanceCalendarMonth: advanceLoanMonth } = await import(
  `file://${join(sim, 'modules/Calendar.js')}`
);
for (let i = 0; i < 12; i += 1) {
  if (i > 0) advanceLoanMonth(loanState);
  const r = requestLoanDraw(loanState, 25_000);
  if (r.ok) {
    approved = true;
    break;
  }
}
if (!approved) {
  console.error('FAIL: loan draw never approved in 12 tries');
  failed = true;
} else if (loanOverheadMonthly(loanState) <= 0) {
  console.error('FAIL: loan overhead');
  failed = true;
}
if (!failed && computeCreditScore(loanState) < 480) {
  console.error('FAIL: credit score range');
  failed = true;
}
if (!failed && !bankApprovalBreakdown(loanState, 25_000).factors?.length) {
  console.error('FAIL: approval breakdown');
  failed = true;
}
if (!failed) {
  loanState.finance.cash = 200_000;
  const prep = prepayLoan(loanState, 10_000);
  if (!prep.ok) {
    console.error(`FAIL: loan prepay: ${prep.reason}`);
    failed = true;
  }
}
if (!failed && ag.ok) {
  const lines = convertOutstandingSafesAtSeed(angelState, 15_000_000);
  const converted = angelState.finance.instruments.every((i) => i.type !== 'safe' || i.converted);
  if (!converted || !lines.length) {
    console.error('FAIL: SAFE conversion at seed');
    failed = true;
  }
}
const rbfState = createInitialState({ companyName: 'RBF Co', categoryId: 'b2b-saas', mode: 'sandbox' });
rbfState.finance.mrr = 8_000;
const rbf = drawRevenueAdvance(rbfState);
if (!rbf.ok) {
  console.error(`FAIL: revenue advance: ${rbf.reason}`);
  failed = true;
} else if (rbfOutstanding(rbfState) <= 0) {
  console.error('FAIL: revenue advance owed');
  failed = true;
}
const {
  setCeoSalaryAnnual,
  takeOwnerDraw,
  ceoSalaryMonthly,
  recordCeoSalaryForMonth,
  wealthMix,
  buildCompLedger,
  suggestedCeoSalaryBand
} = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);
const { projectMonthlyBurn } = await import(`file://${join(sim, 'modules/Finance.js')}`);
const ceoState = createInitialState({ companyName: 'CEO Pay Co', categoryId: 'b2b-saas', mode: 'sandbox' });
const sal = setCeoSalaryAnnual(ceoState, 120_000);
if (!sal.ok) {
  console.error(`FAIL: set CEO salary: ${sal.reason}`);
  failed = true;
} else if (ceoSalaryMonthly(ceoState) !== 10_000) {
  console.error('FAIL: CEO monthly salary');
  failed = true;
} else if (projectMonthlyBurn(ceoState) < 10_000) {
  console.error('FAIL: CEO salary in burn');
  failed = true;
}
if (!failed) {
  ceoState.finance.cash = 50_000;
  const od = takeOwnerDraw(ceoState, 5_000);
  if (!od.ok || ceoState.ceo.careerOwnerDraws !== 5_000) {
    console.error('FAIL: owner draw');
    failed = true;
  }
}
if (!failed) {
  recordCeoSalaryForMonth(ceoState);
  if (ceoState.ceo.careerSalaryPaid !== 10_000) {
    console.error('FAIL: career salary accrual');
    failed = true;
  } else if (!ceoState.ceo.salaryPayLog?.length) {
    console.error('FAIL: salary pay log');
    failed = true;
  } else if (!buildCompLedger(ceoState).length) {
    console.error('FAIL: comp ledger');
    failed = true;
  } else if (!suggestedCeoSalaryBand(ceoState).presets?.length) {
    console.error('FAIL: salary band');
    failed = true;
  } else if (wealthMix(ceoState).salary <= 0) {
    console.error('FAIL: wealth mix');
    failed = true;
  }
}
const { isRealCalendarYear, formatStateMonth } = await import(
  `file://${join(sim, 'modules/GameCalendar.js')}`
);
const {
  rollInitialPersonalBankBalance,
  ceoPersonalBankBalance,
  settlePersonalExpensesAtMonthEnd
} = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);
const bankA = createInitialState({ companyName: 'Bank A', categoryId: 'b2b-saas', mode: 'career', ceoFirstName: 'A', ceoLastName: 'One' });
const bankB = createInitialState({ companyName: 'Bank B', categoryId: 'b2b-saas', mode: 'career', ceoFirstName: 'B', ceoLastName: 'Two' });
const openA = ceoPersonalBankBalance(bankA);
const openB = ceoPersonalBankBalance(bankB);
if (openA < 4500 || openA > 10500 || openB < 4500 || openB > 10500) {
  console.error('FAIL: personal bank opening range');
  failed = true;
} else if (openA === openB && bankA.meta.runSeed !== bankB.meta.runSeed) {
  console.error('FAIL: personal bank should vary by run');
  failed = true;
}
if (!failed) {
  setCeoSalaryAnnual(bankA, 120_000);
  recordCeoSalaryForMonth(bankA);
  const beforeExp = bankA.ceo.bankBalance;
  settlePersonalExpensesAtMonthEnd(bankA);
  if (bankA.ceo.bankBalance >= beforeExp) {
    console.error('FAIL: personal expenses should reduce bank');
    failed = true;
  }
}

const calState = createInitialState({ companyName: 'Cal Co', categoryId: 'b2b-saas', mode: 'career' });
if (!isRealCalendarYear(calState.calendar.year)) {
  console.error('FAIL: career should start on real calendar year');
  failed = true;
} else if (!formatStateMonth(calState).match(/\d{4}/)) {
  console.error('FAIL: calendar label format');
  failed = true;
}
if (!failed) {
  console.log('OK: finance stack + CEO salary, draws, career comp, real calendar');
}

process.exit(failed ? 1 : 0);

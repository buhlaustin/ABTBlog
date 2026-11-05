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
const { STAGES, getMonthlyTaskSlots } = await import(
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

const { completeXcAcceptance, maybeStartScheduledXcBatch, isInResidency } = await import(
  `file://${join(sim, 'modules/XC.js')}`
);
const { startMonth } = await import(`file://${join(sim, 'modules/Calendar.js')}`);
const xcState = createInitialState({
  companyName: 'XCSchedule',
  categoryId: 'b2b-saas',
  mode: 'career'
});
xcState.flags.xcUnlocked = true;
const accept = completeXcAcceptance(xcState);
if (!accept.ok || !xcState.xc?.batchStartsTurn) {
  console.error('FAIL: XC acceptance should schedule batch start turn');
  failed = true;
} else if (isInResidency(xcState)) {
  console.error('FAIL: XC batch should not start same month as acceptance');
  failed = true;
} else {
  xcState.calendar.monthIndex += 1;
  startMonth(xcState);
  if (!isInResidency(xcState) || xcState.xc?.residencyMonthsRemaining !== 3) {
    console.error('FAIL: XC batch should begin next month with 3 months remaining');
    failed = true;
  } else {
    console.log('OK: XC batch starts month after acceptance');
  }
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
newsA.calendar.monthIndex += 1;
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

process.exit(failed ? 1 : 0);

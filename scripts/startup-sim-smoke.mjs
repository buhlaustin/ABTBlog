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
  selectedOfferCount,
  needsTaskLineup,
  getTaskPoolSize,
  getTaskDefinitions,
  taskCatalogSize,
  RECENT_TASK_COOLDOWN_MONTHS
} = await import(`file://${join(sim, 'modules/Tasks.js')}`);
hydrateTaskCatalog(tasksJson);

let failed = false;

const lifetimeSample = formatMoney(20_754_580_000_000);
const groupedHuge = formatMoney(1_234_560_000_000_000);
const midSample = formatMoney(1_234_567);
if (lifetimeSample !== '$20.75T') {
  console.error(`FAIL: formatMoney should compact trillions (got ${lifetimeSample})`);
  failed = true;
} else if (groupedHuge !== '$1,234.56T') {
  console.error(`FAIL: formatMoney should compact huge trillions (got ${groupedHuge})`);
  failed = true;
} else if (midSample !== '$1,234,567') {
  console.error(`FAIL: formatMoney should comma-group under $10M (got ${midSample})`);
  failed = true;
} else if (!failed) {
  console.log(`OK: formatMoney (${midSample}, ${lifetimeSample}, ${groupedHuge})`);
}

if (taskCatalogSize() < 1200) {
  console.error(`FAIL: merged task catalog ${taskCatalogSize()} < 1200`);
  failed = true;
} else {
  console.log(`OK: task catalog size ${taskCatalogSize()} (cooldown ${RECENT_TASK_COOLDOWN_MONTHS} months)`);
}

const genericPool = getTaskDefinitions().filter((t) => !t.categories?.length && !t.launchPhase);
for (let i = 0; i < 80; i += 1) {
  const recent = genericPool.slice(i * 3, i * 3 + 80).map((t) => t.id);
  const picked = pickMonthlyTaskDefs(genericPool, 10, recent);
  if (monthDealHasDuplicateTaskIds(picked) || picked.length !== new Set(picked.map((t) => t.id)).size) {
    console.error('FAIL: monthly task offers must be unique ids');
    failed = true;
    break;
  }
}
if (!failed) {
  console.log('OK: monthly offers unique (no duplicate options per month)');
}

const { auditTaskCatalog } = await import(`file://${join(sim, 'modules/TaskCatalogAudit.js')}`);
const catalogAudit = auditTaskCatalog(getTaskDefinitions());
if (!catalogAudit.ok) {
  console.error(`FAIL: task catalog audit (${catalogAudit.issues.length} issues on ${catalogAudit.taskCount} tasks)`);
  catalogAudit.issues.slice(0, 12).forEach((issue) => {
    console.error(`  ${issue.code} ${issue.taskId ?? issue.id}: ${issue.message}`);
  });
  failed = true;
} else {
  console.log(`OK: all ${catalogAudit.taskCount} desk tasks pass catalog audit (schema + copy bar)`);
}

const { auditGrowthCampaignCatalog } = await import(
  `file://${join(sim, 'modules/GrowthCampaignAudit.js')}`
);
const { getGrowthCampaigns } = await import(`file://${join(sim, 'modules/GrowthCampaigns.js')}`);
const growthAudit = auditGrowthCampaignCatalog(getGrowthCampaigns());
if (!growthAudit.ok) {
  console.error(
    `FAIL: growth campaign audit (${growthAudit.issues.length} issues on ${growthAudit.campaignCount} campaigns)`
  );
  growthAudit.issues.slice(0, 12).forEach((issue) => {
    console.error(`  ${issue.code} ${issue.campaignId ?? issue.id}: ${issue.message}`);
  });
  failed = true;
} else {
  console.log(
    `OK: all ${growthAudit.campaignCount} paid growth campaigns pass catalog audit (unique, no template slop)`
  );
}

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

const crowdPreLaunch = getTaskDefinitions().filter(
  (t) => t.launchPhase === 'pre_launch' && t.crowdfunding
);
if (crowdPreLaunch.length < 12) {
  console.error(`FAIL: pre-launch crowdfunding desk bank too small (${crowdPreLaunch.length})`);
  failed = true;
}
const { applyTaskOutcome, rollTaskOutcome } = await import(
  `file://${join(sim, 'modules/Finance.js')}`
);
const crowdDef = crowdPreLaunch[0];
if (crowdDef) {
  const rolledCrowd = rollTaskOutcome(crowdDef, state);
  const beforeMrr = state.finance.mrr ?? 0;
  applyTaskOutcome(state, crowdDef, rolledCrowd);
  recordPreLaunchTaskOutcome(state, crowdDef, rolledCrowd.revenue, rolledCrowd);
  if ((state.finance.mrr ?? 0) <= beforeMrr || !(state.launch.crowdfundingMrr > 0)) {
    console.error('FAIL: crowdfunding desk task should add MRR and track campaigns');
    failed = true;
  } else {
    console.log(`OK: pre-launch crowdfunding desk tasks (${crowdPreLaunch.length} in bank)`);
  }
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
  REV_MULT_CAP_SANDBOX,
  getTaskRevenueCap
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

const { parseSandboxTuning } = await import(`file://${join(sim, 'modules/SandboxTuning.js')}`);
const { migrateLegacyCalendar } = await import(`file://${join(sim, 'modules/GameCalendar.js')}`);
const sandboxCalendarForm = new FormData();
sandboxCalendarForm.set('sandboxRevenueMult', '1');
sandboxCalendarForm.set('sandboxStartStage', 'garage');
sandboxCalendarForm.set('sandboxIpoGate', '1000000000');
const { sandboxCalendarYearOptions } = await import(
  `file://${join(sim, 'modules/GameCalendar.js')}`
);
const pastYear = sandboxCalendarYearOptions()[0];
sandboxCalendarForm.set('sandboxStartYear', String(pastYear));
sandboxCalendarForm.set('sandboxStartMonth', '7');
const calendarTuning = parseSandboxTuning(sandboxCalendarForm, 'sandbox');
const ancientStart = createInitialState({
  companyName: 'TimeTravel',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxTuning: calendarTuning
});
if (ancientStart.calendar.year !== pastYear || ancientStart.calendar.monthIndex !== 7) {
  console.error(
    `FAIL: sandbox calendar start expected Jul ${pastYear} got ${ancientStart.calendar.monthIndex}/${ancientStart.calendar.year}`
  );
  failed = true;
} else {
  migrateLegacyCalendar(ancientStart);
  if (ancientStart.calendar.year !== pastYear) {
    console.error(`FAIL: migrateLegacyCalendar rewrote sandbox year ${ancientStart.calendar.year}`);
    failed = true;
  } else {
    const span = sandboxCalendarYearOptions().length;
    console.log(`OK: sandbox calendar dropdown (${span} years, oldest ${pastYear}) + save migration`);
  }
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

const {
  beginResidency,
  isXcDemoDayMonth,
  applyDemoDayPitchChoice,
  getSeedRoundTerms,
  onDemoDayTaskCompleted,
  XC_DEMO_DAY_TASK_ID
} = await import(`file://${join(sim, 'modules/XC.js')}`);
const demoState = createInitialState({
  companyName: 'DemoDayCo',
  categoryId: 'b2b-saas',
  mode: 'career'
});
demoState.flags.xcAccepted = true;
demoState.flags.xcBatchActive = true;
demoState.flags.xcResidencyComplete = false;
beginResidency(demoState);
demoState.xc.residencyMonthsRemaining = 1;
if (!isXcDemoDayMonth(demoState)) {
  console.error('FAIL: residencyMonthsRemaining 1 should be Demo Day month');
  failed = true;
} else {
  dealMonthlyTasks(demoState);
  const offers = demoState.calendar.monthTaskOffers ?? [];
  if (!offers.some((o) => o.taskId === XC_DEMO_DAY_TASK_ID)) {
    console.error('FAIL: Demo Day task should appear on final XC month board');
    failed = true;
  } else {
    const slots = demoState.calendar.monthTaskSlotTarget ?? 6;
    let picked = 0;
    for (const o of offers) {
      if (o.taskId === XC_DEMO_DAY_TASK_ID) {
        o.selected = true;
        picked += 1;
      }
    }
    for (const o of offers) {
      if (picked >= slots) break;
      if (!o.selected) {
        o.selected = true;
        picked += 1;
      }
    }
    confirmTaskLineup(demoState);
    onDemoDayTaskCompleted(demoState);
    applyDemoDayPitchChoice(demoState, 0);
    const terms = getSeedRoundTerms(demoState);
    if (terms.raised !== 3_200_000 || terms.postMoney !== 19_000_000) {
      console.error(`FAIL: focused Demo Day pitch seed terms ${JSON.stringify(terms)}`);
      failed = true;
    } else {
      console.log('OK: Demo Day task + focused pitch sets seed terms');
    }
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
maxedSand.staff.headcountByDept = {
  engineering: 2500,
  product: 1500,
  sales: 2500,
  marketing: 2000,
  finance: 800,
  support: 700
};
maxedSand.staff.draftHeadcountByDept = { ...maxedSand.staff.headcountByDept };
const sandCap = getTaskRevenueCap(maxedSand);
const cappedSand = getTaskRevenueMultiplierPreview(maxedSand);
if (cappedSand > sandCap + 0.01) {
  console.error(`FAIL: sandbox cap exceeded: ${cappedSand} > ${sandCap}`);
  failed = true;
} else if (sandCap < REV_MULT_CAP_SANDBOX - 1) {
  console.error(`FAIL: expected full sandbox workforce cap ${REV_MULT_CAP_SANDBOX}× got ${sandCap}×`);
  failed = true;
} else {
  console.log(`OK: sandbox rev mult cap ${cappedSand}× (workforce ceiling ${sandCap}×)`);
}

const { completeBoardTask, dealBoardTasks, getBoardTaskDefs, ensureBoardRoster } = await import(
  `file://${join(sim, 'modules/Board.js')}`
);
if (getBoardTaskDefs().length < 18) {
  console.error(`FAIL: board task catalog too small (${getBoardTaskDefs().length})`);
  failed = true;
}
const boardState = createInitialState({
  companyName: 'BoardSmoke',
  categoryId: 'b2b-saas',
  mode: 'career'
});
boardState.flags.seriesAClosed = true;
boardState.finance.cash = 500_000;
dealBoardTasks(boardState);
ensureBoardRoster(boardState);
if ((boardState.board?.members?.length ?? 0) < 2) {
  console.error('FAIL: board roster should include lead + founder after Series A');
  failed = true;
}
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
let headB = headA;
for (let i = 0; i < 8 && headB === headA; i += 1) {
  advanceNewsMonth(newsA);
  applyOfflineMonthlyNews(newsA);
  headB = newsA.news.currentMonthArticles?.[0]?.headline ?? '';
  if (headB !== headA) break;
  archiveCurrentNews(newsA);
}
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
  applySubsidiaryMrrPayout,
  computeReinvestQuote,
  reinvestInSubsidiary,
  subsidiarySalePrice,
  subsidiaryValuationMark,
  tickAcquisitionsAtMonthStart
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
  const holding = acqState.acquisitions.owned[0];
  const implied = subsidiarySalePrice(acqState, holding, small);
  const quote5 = computeReinvestQuote(acqState, small.id, 5, 'product');
  if (!quote5.ok) {
    console.error(`FAIL: reinvest quote: ${quote5.reason}`);
    failed = true;
  } else {
    const expected = Math.round(implied * 0.05);
    const tol = Math.max(5000, Math.round(implied * 0.002));
    if (Math.abs(quote5.amount - expected) > tol && quote5.amount !== Math.max(expected, tol)) {
      console.error(
        `FAIL: reinvest 5% should scale with implied value (~${formatMoney(expected)}), got ${formatMoney(quote5.amount)}`
      );
      failed = true;
    } else {
      const rein = reinvestInSubsidiary(acqState, small.id, { pctOfValue: 2, program: 'gtm' });
      if (!rein.ok || rein.pctOfValue !== 2) {
        console.error(`FAIL: pct-based reinvest: ${rein.reason ?? 'bad result'}`);
        failed = true;
      } else {
        console.log(`OK: portfolio reinvest scales with value (${formatMoney(rein.amount)} for 2%)`);
      }
    }
  }
  const markBefore = subsidiaryValuationMark(holding);
  const exitBefore = subsidiarySalePrice(acqState, holding, small);
  acqState.calendar.monthIndex += 1;
  if (acqState.calendar.monthIndex > 12) {
    acqState.calendar.monthIndex = 1;
    acqState.calendar.year += 1;
  }
  tickAcquisitionsAtMonthStart(acqState);
  const markAfter = subsidiaryValuationMark(holding);
  const exitAfter = subsidiarySalePrice(acqState, holding, small);
  if (markAfter === markBefore && exitAfter === exitBefore) {
    console.error('FAIL: portfolio valuation mark should drift monthly');
    failed = true;
  } else if (markAfter < 0.65 || markAfter > 1.85) {
    console.error(`FAIL: valuation mark out of bounds (${markAfter})`);
    failed = true;
  } else {
    console.log(`OK: portfolio mark drift (${markBefore.toFixed(3)}× → ${markAfter.toFixed(3)}×)`);
  }
}

const { STAGES: ST } = await import(`file://${join(sim, 'modules/constants.js')}`);
const { PUBLIC_FLOAT_ROW_ID, getFounderRow } = await import(`file://${join(sim, 'modules/CapTable.js')}`);
const {
  fileIpo,
  tickPublicMarket,
  setPublicGuidanceTone,
  executeStockBuyback,
  whisperRevenueTarget,
  sellFounderSharesPartial
} = await import(`file://${join(sim, 'modules/IPO.js')}`);
const pub = createInitialState({ companyName: 'Ticker Co', categoryId: 'b2b-saas', mode: 'sandbox' });
pub.stage = ST.PUBLIC;
pub.flags.seedRoundClosed = true;
pub.flags.ipoUnlocked = true;
pub.finance.mrr = 5_000_000;
pub.finance.monthlyBurn = 400_000;
const cashBeforeIpo = 50_000_000;
pub.finance.cash = cashBeforeIpo;
const ipo = fileIpo(pub);
const floatRow = pub.capTable?.find((r) => r.id === PUBLIC_FLOAT_ROW_ID);
const listPrice = pub.publicMarket?.sharePrice ?? 0;
if (!ipo.ok) {
  console.error(`FAIL: fileIpo smoke: ${ipo.reason}`);
  failed = true;
} else if (!floatRow?.shares || floatRow.shares < 1000) {
  console.error('FAIL: IPO should add public float shares on cap table');
  failed = true;
} else if (listPrice > 450 || listPrice < 5) {
  console.error(`FAIL: IPO share price out of band (${listPrice})`);
  failed = true;
} else if ((pub.finance.cash ?? 0) <= cashBeforeIpo) {
  console.error(`FAIL: IPO should add primary proceeds to company cash (before ${cashBeforeIpo}, after ${pub.finance.cash})`);
  failed = true;
} else if ((ipo.primaryProceeds ?? 0) <= 0) {
  console.error('FAIL: fileIpo should report primary proceeds');
  failed = true;
} else {
  const founder = getFounderRow(pub);
  const floatPct = floatRow?.pct ?? 0;
  if ((founder?.pct ?? 0) < 18) {
    console.error(`FAIL: founder pct at IPO too low (${founder?.pct}%)`);
    failed = true;
  } else if (floatPct < 20 || floatPct > 34) {
    console.error(`FAIL: IPO public float should be realistic (~20–32% FD, got ${floatPct}%)`);
    failed = true;
  } else if ((founder?.pct ?? 0) > 82) {
    console.error(`FAIL: IPO float too small — founder still ${founder?.pct}% (expected meaningful dilution)`);
    failed = true;
  } else {
    console.log(
      `OK: IPO primary + float (${formatMoney(ipo.primaryProceeds)} primary, float ${floatPct}%, founder ${founder?.pct}%, ${formatMoney(listPrice)}/share)`
    );
  }
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
  pub.publicMarket.lockupMonthsRemaining = 0;
  const founderBefore = getFounderRow(pub)?.shares ?? 0;
  const partial = sellFounderSharesPartial(pub, 10);
  const founderAfter = getFounderRow(pub)?.shares ?? 0;
  if (!partial.ok || partial.proceeds <= 0) {
    console.error(`FAIL: partial founder stock sale: ${partial.reason ?? 'bad result'}`);
    failed = true;
  } else if (founderAfter >= founderBefore || (pub.ceo.careerStockSales ?? 0) < 1) {
    console.error('FAIL: partial sale should reduce founder shares and credit CEO bank');
    failed = true;
  } else if (!failed) {
    console.log(
      `OK: partial founder stock sale (${formatMoney(partial.proceeds)}, ${founderBefore - founderAfter} shares)`
    );
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
} else if (closeAngelSafe(angelState).ok) {
  console.error('FAIL: second angel SAFE should be blocked');
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
} else if (joinAccelerator(xcAccel, 'techlot').ok) {
  console.error('FAIL: third accelerator should be blocked');
  failed = true;
}
const postASeries = createInitialState({ companyName: 'Post A', categoryId: 'b2b-saas', mode: 'sandbox' });
postASeries.flags.seriesAClosed = true;
postASeries.finance.arr = 5_000_000;
postASeries.finance.mrr = Math.round(5_000_000 / 12);
if (joinAccelerator(postASeries, 'velocity-lab').ok) {
  console.error('FAIL: accelerator after Series A should be blocked');
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
const { loanDrawPresets, loanHeadroom } = await import(`file://${join(sim, 'modules/BankLoan.js')}`);
const scaleLoanState = createInitialState({ companyName: 'BigLine', categoryId: 'b2b-saas', mode: 'sandbox' });
scaleLoanState.flags.seedRoundClosed = true;
scaleLoanState.flags.seriesAClosed = true;
scaleLoanState.finance.arr = 80_000_000;
scaleLoanState.finance.mrr = Math.round(80_000_000 / 12);
scaleLoanState.finance.lifetimeRevenue = 400_000_000;
scaleLoanState.finance.cash = 10_000_000_000_000;
scaleLoanState.finance.valuation = 500_000_000;
const bigLimit = computeCreditLimit(scaleLoanState);
const presets = loanDrawPresets(scaleLoanState);
const maxPreset = presets.find((p) => p.fraction === 1);
if (bigLimit <= 750_000) {
  console.error(`FAIL: scaled credit limit should exceed $750k, got ${bigLimit}`);
  failed = true;
} else if (!maxPreset || maxPreset.amount !== loanHeadroom(scaleLoanState)) {
  console.error('FAIL: loan Max preset should equal headroom');
  failed = true;
} else {
  console.log(`OK: scaled credit limit ${formatMoney(bigLimit)} · max draw ${formatMoney(maxPreset.amount)}`);
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
const { projectMonthlyBurn, estimateEraRevenuePotential, allTierRevenuePotentialRows } =
  await import(`file://${join(sim, 'modules/Finance.js')}`);
const { TIER_REVENUE_PROFILE, eraBaseRevenueScaleForTask } = await import(
  `file://${join(sim, 'modules/ProgressionEconomy.js')}`
);
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
if (!failed) {
  if (TIER_REVENUE_PROFILE.length !== 8) {
    console.error(`FAIL: tier revenue profile length ${TIER_REVENUE_PROFILE.length}`);
    failed = true;
  } else {
    const eraRows = allTierRevenuePotentialRows(ceoState);
    const era = estimateEraRevenuePotential(ceoState);
    if (eraRows.length !== 8 || era.desk[1] < era.desk[0] || era.growth[1] < era.growth[0]) {
      console.error('FAIL: tier revenue potential rows');
      failed = true;
    }
  }
}
if (!failed) {
  const sharedTask = getTaskDefinitions().find((t) => t.id === 'mega-deal-close');
  if (sharedTask) {
    const seedEra = createInitialState({ companyName: 'Era', categoryId: 'b2b-saas', mode: 'career' });
    seedEra.flags.seedRoundClosed = true;
    const pubEra = createInitialState({ companyName: 'Era', categoryId: 'b2b-saas', mode: 'career' });
    pubEra.flags.ipoFiled = true;
    pubEra.stage = STAGES.PUBLIC;
    const seedRoll = rollTaskOutcome(sharedTask, seedEra).revenue;
    const pubRoll = rollTaskOutcome(sharedTask, pubEra).revenue;
    if (pubRoll <= seedRoll * 50) {
      console.error(`FAIL: era base scale seed=${seedRoll} public=${pubRoll}`);
      failed = true;
    }
  }
}
if (!failed) {
  const bigSal = setCeoSalaryAnnual(ceoState, 20_000_000);
  if (!bigSal.ok || bigSal.annual !== 20_000_000) {
    console.error('FAIL: CEO salary should not be capped at $2M');
    failed = true;
  }
}
const { isRealCalendarYear, formatStateMonth } = await import(
  `file://${join(sim, 'modules/GameCalendar.js')}`
);
const {
  rollInitialPersonalBankBalance,
  ceoPersonalBankBalance,
  settlePersonalExpensesAtMonthEnd,
  personalExpenseBandForSalary,
  scheduledPersonalExpense,
  preparePersonalExpensesForMonth,
  rollPersonalExpenseTotal
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
  setCeoSalaryAnnual(bankA, 60_000);
  recordCeoSalaryForMonth(bankA);
  const band60 = personalExpenseBandForSalary(60_000);
  const due = scheduledPersonalExpense(bankA).total;
  if (due > band60.max * 1.2 || due < band60.min * 0.9) {
    console.error(`FAIL: $60k salary expense ${due} outside band ${band60.min}-${band60.max}`);
    failed = true;
  }
  bankA.finance.arr = 500_000_000;
  preparePersonalExpensesForMonth(bankA);
  const dueRich = scheduledPersonalExpense(bankA).total;
  const { purchaseCeoHomeMortgage, ceoHousingSummary } = await import(
    `file://${join(sim, 'modules/CeoLifestyle.js')}`
  );
  const homeState = createInitialState({ companyName: 'Home CEO', categoryId: 'b2b-saas', mode: 'sandbox' });
  homeState.ceo.bankBalance = 2_000_000;
  homeState.ceo.salaryAnnual = 350_000;
  const beforeSched = scheduledPersonalExpense(homeState);
  const housingLineBefore = beforeSched.breakdown.find((l) => l.label === 'Housing')?.amount ?? 0;
  const mort = purchaseCeoHomeMortgage(homeState, 'starter-condo');
  if (!mort.ok) {
    console.error(`FAIL: CEO mortgage purchase: ${mort.reason}`);
    failed = true;
  } else {
    preparePersonalExpensesForMonth(homeState);
    const afterSched = scheduledPersonalExpense(homeState);
    const housingLine = afterSched.breakdown.find((l) => l.label.startsWith('Mortgage'));
    const summary = ceoHousingSummary(homeState);
    if (!housingLine || housingLine.amount !== summary.monthlyHousingDebit) {
      console.error('FAIL: mortgage should replace Housing debit line');
      failed = true;
    } else if (afterSched.total === beforeSched.total) {
      console.error('FAIL: scheduled debit total should change after mortgage');
      failed = true;
    } else {
      console.log(
        `OK: CEO mortgage replaces housing debit (${formatMoney(housingLineBefore)} → ${formatMoney(housingLine.amount)})`
      );
    }
  }
  if (dueRich > band60.max * 1.2) {
    console.error(`FAIL: personal debits should not scale with ARR (${dueRich})`);
    failed = true;
  }
  const beforeExp = bankA.ceo.bankBalance;
  settlePersonalExpensesAtMonthEnd(bankA);
  if (bankA.ceo.bankBalance >= beforeExp) {
    console.error('FAIL: personal expenses should reduce bank');
    failed = true;
  }
  const { advanceCalendarMonth } = await import(`file://${join(sim, 'modules/Calendar.js')}`);
  const monthA = rollPersonalExpenseTotal(bankA);
  advanceCalendarMonth(bankA);
  preparePersonalExpensesForMonth(bankA);
  const monthB = rollPersonalExpenseTotal(bankA);
  if (monthA === monthB) {
    console.error('FAIL: personal debits should vary month to month');
    failed = true;
  } else {
    console.log('OK: salary-based personal debits (not ARR, vary monthly)');
  }
}

const { hireCoo, isCooHired, cooSalaryMonthly, garageCooSalaryFromEquity } = await import(
  `file://${join(sim, 'modules/Coo.js')}`
);
const garageState = createInitialState({
  companyName: 'Garage COO',
  categoryId: 'b2b-saas',
  mode: 'career'
});
if (garageCooSalaryFromEquity(5) !== 2500 || garageCooSalaryFromEquity(10) !== 0) {
  console.error('FAIL: garage COO equity/salary curve (5%→2.5K, 10%→0)');
  failed = true;
}
const hireLow = hireCoo(garageState, { firstName: 'Riley', lastName: 'Chen', equityPct: 2 });
if (!hireLow.ok || !isCooHired(garageState)) {
  console.error(`FAIL: garage COO hire: ${hireLow.reason ?? 'unknown'}`);
  failed = true;
} else {
  const founderBefore = getFounderRow(garageState)?.pct ?? 100;
  const sal2 = cooSalaryMonthly(garageState);
  if (founderBefore >= 99 || sal2 <= 2500 || sal2 >= 7500) {
    console.error(`FAIL: COO 2% salary band founder=${founderBefore} sal=${sal2}`);
    failed = true;
  } else {
    console.log('OK: named COO from garage with equity on cap table');
  }
}
const garageZero = createInitialState({
  companyName: 'Garage COO Zero',
  categoryId: 'b2b-saas',
  mode: 'career'
});
const hireMax = hireCoo(garageZero, { firstName: 'Jordan', lastName: 'Lee', equityPct: 10 });
if (!hireMax.ok || cooSalaryMonthly(garageZero) !== 0) {
  console.error(`FAIL: 10% garage COO should be $0/mo sal=${cooSalaryMonthly(garageZero)}`);
  failed = true;
} else {
  console.log('OK: 10% garage COO at $0/mo');
}
if (!failed) {
  const { workspaceRentMonthly, WORKSPACE_TIER: WS_TIER } = await import(
    `file://${join(sim, 'modules/Workspace.js')}`
  );
  const campusRent = workspaceRentMonthly({
    workspace: { tier: WS_TIER.CAMPUS }
  });
  const hubRentState = createInitialState({ companyName: 'Hub Rent', categoryId: 'b2b-saas', mode: 'career' });
  hubRentState.workspace.tier = WS_TIER.HUB;
  hubRentState.offices = { hubId: 'nashville' };
  hubRentState.finance.hubRentMonthly = 125_000;
  const hubMo = workspaceRentMonthly(hubRentState);
  if (hubMo < 125_000 || hubMo <= campusRent) {
    console.error(`FAIL: hub rent ${hubMo} should exceed campus ${campusRent}`);
    failed = true;
  } else {
    console.log(`OK: hub city rent (${hubMo}/mo) above campus HQ (${campusRent}/mo)`);
  }

  const { addSatellite, getSatelliteTemplates, availableSatelliteTemplates } = await import(
    `file://${join(sim, 'modules/Offices.js')}`
  );
  const catalog = getSatelliteTemplates();
  if (catalog.length < 30) {
    console.error(`FAIL: expected 30+ satellite cities (got ${catalog.length})`);
    failed = true;
  }
  const satState = createInitialState({ companyName: 'SatCo', categoryId: 'b2b-saas', mode: 'sandbox' });
  satState.offices = { hubId: 'atlanta', hubLabel: 'Atlanta', satellites: [], usedSatelliteTemplateIds: [] };
  const open = addSatellite(satState, 'sat-denver', 'medium');
  const dup = addSatellite(satState, 'sat-denver', 'large');
  const avail = availableSatelliteTemplates(satState);
  if (!open.ok || dup.ok) {
    console.error(`FAIL: satellite one-time use (open ${open.ok}, dup ${dup.ok})`);
    failed = true;
  } else if (avail.some((t) => t.id === 'sat-denver')) {
    console.error('FAIL: used satellite should not appear in available list');
    failed = true;
  } else if (!failed) {
    console.log(`OK: satellite catalog (${catalog.length} cities, one-time open)`);
  }
  const { computeSatelliteOffice } = await import(`file://${join(sim, 'modules/SatelliteOffices.js')}`);
  const denverTpl = catalog.find((t) => t.id === 'sat-denver');
  const knoxTpl = catalog.find((t) => t.id === 'sat-knoxville');
  const denverMed = computeSatelliteOffice(denverTpl, 'medium');
  const knoxMed = computeSatelliteOffice(knoxTpl, 'medium');
  const laTpl = catalog.find((t) => t.id === 'sat-los-angeles');
  const laMed = computeSatelliteOffice(laTpl, 'medium');
  if (laMed.seats <= knoxMed.seats || laMed.rentMonthly <= knoxMed.rentMonthly) {
    console.error('FAIL: Los Angeles medium satellite should exceed Knoxville on seats and rent');
    failed = true;
  } else if (knoxMed.rentMonthly >= laMed.rentMonthly) {
    console.error('FAIL: Knoxville should rent cheaper than Los Angeles at the same footprint size');
    failed = true;
  } else if (!failed) {
    console.log(
      `OK: satellite sizing (Knoxville medium ${knoxMed.seats}/${knoxMed.rentMonthly}, LA medium ${laMed.seats}/${laMed.rentMonthly})`
    );
  }

  const { totalHeadcountCap, headcountCapBreakdown } = await import(
    `file://${join(sim, 'modules/Offices.js')}`
  );
  const { maxHeadcountForStage } = await import(`file://${join(sim, 'modules/Staff.js')}`);
  const { HUB_HEADCOUNT_CAP } = await import(`file://${join(sim, 'modules/Workspace.js')}`);
  const hubCapState = createInitialState({ companyName: 'HubCap', categoryId: 'b2b-saas', mode: 'career' });
  hubCapState.workspace = { ...(hubCapState.workspace ?? {}), tier: WS_TIER.HUB, hubOwned: true };
  hubCapState.offices = {
    hubId: 'atlanta',
    hubLabel: 'Atlanta',
    satellites: [
      {
        id: 'sat-denver',
        templateId: 'sat-denver',
        label: 'Denver',
        size: 'medium',
        sizeLabel: 'Medium',
        seats: denverMed.seats,
        rentMonthly: denverMed.rentMonthly
      }
    ],
    usedSatelliteTemplateIds: ['sat-denver']
  };
  const hubBaseCap = headcountCapBreakdown(hubCapState);
  if (hubBaseCap.base !== HUB_HEADCOUNT_CAP || totalHeadcountCap(hubCapState) !== HUB_HEADCOUNT_CAP + denverMed.seats) {
    console.error(
      `FAIL: hub cap expected ${HUB_HEADCOUNT_CAP}+${denverMed.seats} seats got base ${hubBaseCap.base} total ${totalHeadcountCap(hubCapState)}`
    );
    failed = true;
  } else if (maxHeadcountForStage(hubCapState.stage, hubCapState) !== totalHeadcountCap(hubCapState)) {
    console.error('FAIL: People tab cap should match totalHeadcountCap with satellites');
    failed = true;
  } else {
    console.log(`OK: hub HQ cap ${HUB_HEADCOUNT_CAP} + satellite seats (${totalHeadcountCap(hubCapState)} hiring cap)`);
  }
}
if (!failed) {
  const publicCoo = createInitialState({ companyName: 'Public COO', categoryId: 'b2b-saas', mode: 'sandbox' });
  publicCoo.workspace.tier = WORKSPACE_TIER.LARGE;
  publicCoo.flags.ipoFiled = true;
  publicCoo.stage = STAGES.PUBLIC;
  setCeoSalaryAnnual(publicCoo, 20_000_000);
  const hired = hireCoo(publicCoo, { firstName: 'Sam', lastName: 'Ops', equityPct: 2 });
  if (!hired.ok) {
    console.error(`FAIL: public COO hire: ${hired.reason}`);
    failed = true;
  } else {
    const expectedFloor = Math.round((20_000_000 / 12) * 0.6);
    const cooMo = cooSalaryMonthly(publicCoo);
    if (cooMo < expectedFloor) {
      console.error(`FAIL: public COO ${cooMo} < 60% CEO ${expectedFloor}`);
      failed = true;
    } else {
      console.log(`OK: public COO comp tracks CEO (${cooMo}/mo ≥ 60% floor)`);
    }
  }
}

const {
  growthCampaignCatalogSize,
  GROWTH_MONTHLY_OFFER_COUNT,
  growthMonthlyOfferCount,
  refreshGrowthCampaignOffers,
  availableCampaigns,
  runGrowthCampaign,
  resetGrowthCampaignsMonth
} = await import(`file://${join(sim, 'modules/GrowthCampaigns.js')}`);
const { getProductActions, sideTaskBankSize, sideTaskPlaysPerMonth } = await import(
  `file://${join(sim, 'modules/ProductActions.js')}`
);
const { growthCampaignSlots } = await import(
  `file://${join(sim, 'modules/SideTaskProgression.js')}`
);
const earlySide = createInitialState({ companyName: 'Side Cap', categoryId: 'b2b-saas', mode: 'career' });
const earlyPlays = sideTaskPlaysPerMonth(earlySide);
if (earlyPlays < 2) {
  console.error(`FAIL: early side plays expected >=2 got ${earlyPlays}`);
  failed = true;
}
earlySide.flags.seedRoundClosed = true;
earlySide.flags.seriesAClosed = true;
earlySide.flags.seriesBClosed = true;
earlySide.product.level = 12;
earlySide.product.buzz = 24;
earlySide.staff.headcountByDept = { marketing: 16, product: 8, engineering: 12 };
const scaledPlays = sideTaskPlaysPerMonth(earlySide);
const scaledCampaigns = growthCampaignSlots(earlySide);
if (scaledPlays <= earlyPlays || scaledCampaigns < 3) {
  console.error(`FAIL: side limits should scale (${earlyPlays}→${scaledPlays}, campaigns ${scaledCampaigns})`);
  failed = true;
}
if (scaledPlays > scaledCampaigns) {
  console.error(`FAIL: side plays should be capped at campaign ceiling (${scaledPlays} > ${scaledCampaigns})`);
  failed = true;
}
const hubState = createInitialState({ companyName: 'Hub Side', categoryId: 'b2b-saas', mode: 'career' });
hubState.workspace.tier = WORKSPACE_TIER.HUB;
hubState.offices = { ...(hubState.offices ?? {}), hubId: 'test-hub' };
if (
  sideTaskPlaysPerMonth(hubState) !== Infinity ||
  growthCampaignSlots(hubState) !== Infinity
) {
  console.error('FAIL: hub workspace should grant unlimited side tasks');
  failed = true;
} else {
  console.log(`OK: dynamic side limits (${earlyPlays}→${scaledPlays} plays, hub unlimited)`);
}

const spaceState = createInitialState({
  companyName: 'Orbit Labs',
  categoryId: 'space-exploration',
  mode: 'career'
});
if (spaceState.world?.competitor?.name !== 'SpaceXY') {
  console.error(`FAIL: space rival expected SpaceXY got ${spaceState.world?.competitor?.name}`);
  failed = true;
}
const spaceDesk = getTaskDefinitions().filter((t) => t.categories?.includes('space-exploration'));
const spaceSigs = spaceDesk.filter((t) => t.signature);
if (spaceDesk.length < 70) {
  console.error(`FAIL: space-exploration desk bank ${spaceDesk.length} < 70`);
  failed = true;
} else if (spaceSigs.length < 10) {
  console.error(`FAIL: space-exploration signatures ${spaceSigs.length} < 10`);
  failed = true;
} else if (getTaskPoolSize(spaceState) < getMonthlyTaskOfferCount(STAGES.GARAGE)) {
  console.error(`FAIL: space-exploration garage pool ${getTaskPoolSize(spaceState)} too small`);
  failed = true;
} else {
  console.log(
    `OK: space-exploration category (${spaceDesk.length} custom desk tasks, ${spaceSigs.length} signatures, rival SpaceXY)`
  );
}

const growthRosterState = createInitialState({
  companyName: 'Growth Roster',
  categoryId: 'b2b-saas',
  mode: 'sandbox'
});
growthRosterState.flags.ipoFiled = true;
growthRosterState.stage = STAGES.PUBLIC;
growthRosterState.finance.cash = 50_000_000_000;
resetGrowthCampaignsMonth(growthRosterState);
const roster = growthRosterState.growth.monthCampaignOffers ?? [];
const expectedOffers = growthMonthlyOfferCount(growthRosterState);
if (roster.length < 1 || roster.length > expectedOffers) {
  console.error(`FAIL: growth monthly roster size ${roster.length} (max ${expectedOffers})`);
  failed = true;
} else {
  const playable = availableCampaigns(growthRosterState);
  if (!playable.length) {
    console.error('FAIL: public growth roster has no playable campaigns');
    failed = true;
  } else {
    const first = playable[0];
    const run = runGrowthCampaign(growthRosterState, first.id);
    if (!run.ok || !growthRosterState.growth.recentCampaignIds?.includes(first.id)) {
      console.error(`FAIL: growth campaign run / cooldown track: ${run.reason ?? 'ok'}`);
      failed = true;
    } else {
      resetGrowthCampaignsMonth(growthRosterState);
      if (availableCampaigns(growthRosterState).some((c) => c.id === first.id)) {
        console.error('FAIL: ran growth campaign should stay off roster until cooldown');
        failed = true;
      } else {
        console.log(`OK: growth roster + cooldown (${roster.length}/mo, era-scaled payouts)`);
      }
    }
  }
}

const productSideBank = sideTaskBankSize(['product', 'both']);
if (growthCampaignCatalogSize() < 270) {
  console.error(`FAIL: growth campaign bank too small (${growthCampaignCatalogSize()})`);
  failed = true;
} else if (getProductActions().length < 75) {
  console.error(`FAIL: side-task lever bank too small (${getProductActions().length})`);
  failed = true;
} else if (productSideBank < 32) {
  console.error(`FAIL: product side-task bank too small (${productSideBank})`);
  failed = true;
} else {
  console.log(
    `OK: side-task banks (${growthCampaignCatalogSize()} paid campaigns, ${getProductActions().length} levers, ${productSideBank} product-focused)`
  );
}

const { runAllRemainingSideTasks, canBuyAllRemainingSideTasks } = await import(
  `file://${join(sim, 'modules/ProductActions.js')}`
);
const sideBulk = createInitialState({
  companyName: 'SideBulk',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 500_000
});
sideBulk.flags.xcResidencyComplete = true;
sideBulk.flags.seedRoundClosed = true;
if (!canBuyAllRemainingSideTasks(sideBulk, ['product', 'growth', 'brand', 'both'])) {
  console.error('FAIL: sandbox should allow buy-all side plays');
  failed = true;
} else {
  const bulk = runAllRemainingSideTasks(sideBulk, ['product', 'growth', 'brand', 'both']);
  if (!bulk.ok || bulk.count < 1) {
    console.error(`FAIL: buy-all side plays: ${bulk.reason ?? 'empty'}`);
    failed = true;
  } else {
    console.log(`OK: buy-all side plays (${bulk.count} runs)`);
  }
}

const {
  payCompanyWideBonus,
  totalEmployeeSalaryMassMonthly,
  EXTRA_PERKS,
  runExtraEmployeePerk
} = await import(`file://${join(sim, 'modules/EmployeeBenefits.js')}`);
const { expandEmployeeOptionPool, applySeedCapTableSnapshot } = await import(
  `file://${join(sim, 'modules/CapTable.js')}`
);
const perkState = createInitialState({
  companyName: 'PerkCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 2_000_000
});
perkState.flags.seedRoundClosed = true;
perkState.flags.xcResidencyComplete = true;
perkState.staff.headcountByDept.engineering = 5;
perkState.ceo.salaryAnnual = 120_000;
const mass = totalEmployeeSalaryMassMonthly(perkState);
if (mass.total < 1) {
  console.error('FAIL: employee salary mass should be positive with staff');
  failed = true;
} else {
  const bonus = payCompanyWideBonus(perkState, 5);
  if (!bonus.ok || (perkState.ceo.careerEmployeeBonuses ?? 0) < 1) {
    console.error(`FAIL: company bonus: ${bonus.reason ?? 'no ceo credit'}`);
    failed = true;
  } else {
    console.log(`OK: company bonus (${bonus.pct}%, CEO ${formatMoney(bonus.ceoShare)})`);
  }
}
const annualBonusState = createInitialState({
  companyName: 'AnnualBonusCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 8_000_000
});
annualBonusState.staff.headcountByDept.engineering = 5;
annualBonusState.ceo.salaryAnnual = 120_000;
annualBonusState.staff.companyBonusAnnualMode = true;
const massAnnual = totalEmployeeSalaryMassMonthly(annualBonusState);
const expectedAnnualPool = Math.round(massAnnual.total * 12 * 0.05);
const bonusAnnual = payCompanyWideBonus(annualBonusState, 5);
if (!bonusAnnual.ok || bonusAnnual.pool !== expectedAnnualPool || !bonusAnnual.annualMode) {
  console.error(
    `FAIL: annual company bonus: ${bonusAnnual.reason ?? `expected pool ${expectedAnnualPool}, got ${bonusAnnual.pool}`}`
  );
  failed = true;
} else {
  console.log(`OK: annual company bonus (${bonusAnnual.pct}%, pool ${formatMoney(bonusAnnual.pool)})`);
}
if (EXTRA_PERKS.length < 15) {
  console.error(`FAIL: expected 15+ employee perks, got ${EXTRA_PERKS.length}`);
  failed = true;
} else {
  perkState.flags.seriesAClosed = true;
  const beforeProduct = perkState.product?.level ?? 0;
  const hack = runExtraEmployeePerk(perkState, 'hackathon');
  if (!hack.ok || (perkState.product?.level ?? 0) !== beforeProduct + 1) {
    console.error(`FAIL: hackathon perk: ${hack.reason ?? 'product level unchanged'}`);
    failed = true;
  } else {
    console.log(`OK: employee perks catalog (${EXTRA_PERKS.length}) + hackathon run`);
  }
}
const { skippedSeriesBToIpo, meetsProgressionTierMin } = await import(
  `file://${join(sim, 'modules/ProgressionEconomy.js')}`
);
const skipBIpoState = createInitialState({
  companyName: 'SkipBCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 500_000
});
skipBIpoState.flags.seedRoundClosed = true;
skipBIpoState.flags.seriesAClosed = true;
skipBIpoState.flags.ipoFiled = true;
skipBIpoState.stage = STAGES.PUBLIC;
skipBIpoState.finance.cash = 500_000;
if (!skippedSeriesBToIpo(skipBIpoState) || !meetsProgressionTierMin(skipBIpoState, 4)) {
  console.error('FAIL: Series A → IPO without B should satisfy Series B+ unlock tier');
  failed = true;
} else {
  const family = runExtraEmployeePerk(skipBIpoState, 'family-stipend');
  if (!family.ok) {
    console.error(`FAIL: family stipend after skip-B IPO: ${family.reason ?? 'blocked'}`);
    failed = true;
  } else {
    console.log('OK: Series B+ perks unlock on IPO after Series A (no B raise)');
  }
}
const poolState = createInitialState({ companyName: 'PoolCo', categoryId: 'b2b-saas', mode: 'career' });
poolState.flags.seedRoundClosed = true;
applySeedCapTableSnapshot(poolState);
const before = poolState.capTable.find((r) => r.id === 'esop')?.shares ?? 0;
const expand = expandEmployeeOptionPool(poolState, 5);
const expectedTopUp = Math.max(1, Math.round(before * 0.05));
if (
  !expand.ok ||
  (poolState.capTable.find((r) => r.id === 'esop')?.shares ?? 0) !== before + expectedTopUp ||
  expand.sharesAdded !== expectedTopUp
) {
  console.error(
    `FAIL: option pool expand: ${expand.reason ?? `expected +${expectedTopUp}, got ${expand.sharesAdded ?? 0}`}`
  );
  failed = true;
} else {
  console.log(`OK: option pool expand +5% of pool (${expand.sharesAdded} shares)`);
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

const {
  closeFiscalYearOnDecember,
  computeTaxLiability,
  completeTaxFilingTask,
  donateToCharity,
  isTaxFilingRequired,
  TAX_FILING_TASK_ID,
  ensureFiscal,
  taxBaseRevenue
} = await import(`file://${join(sim, 'modules/CorporateTax.js')}`);

const fyRoll = createInitialState({ companyName: 'FY Co', categoryId: 'b2b-saas', mode: 'career' });
ensureFiscal(fyRoll);
fyRoll.finance.fiscal.current.revenue = 50_000;
fyRoll.finance.fiscal.current.expenses = 12_000;
const rolled = closeFiscalYearOnDecember(fyRoll, 2025, 12);
if (!rolled || rolled.revenue !== 50_000 || rolled.profit !== 38_000) {
  console.error('FAIL: fiscal year rollover on December close');
  failed = true;
} else if (fyRoll.finance.fiscal.current.year !== 2026 || fyRoll.finance.fiscal.current.revenue !== 0) {
  console.error('FAIL: fiscal current year should reset after December close');
  failed = true;
} else {
  console.log('OK: fiscal year rollover (Jan–Dec)');
}

const taxState = createInitialState({ companyName: 'Tax Co', categoryId: 'b2b-saas', mode: 'career' });
taxState.meta.calendarStartYear = 2024;
taxState.calendar.year = 2026;
taxState.calendar.monthIndex = 4;
taxState.finance.cash = 100_000;
ensureFiscal(taxState);
taxState.finance.fiscal.prior = { year: 2025, revenue: 100_000, expenses: 40_000, profit: 60_000 };
if (!isTaxFilingRequired(taxState)) {
  console.error('FAIL: April tax filing should be required with prior FY revenue');
  failed = true;
} else {
  const owed = computeTaxLiability(taxState);
  if (owed !== Math.max(500, Math.round(100_000 * 0.21))) {
    console.error(`FAIL: tax liability on revenue base (got ${owed})`);
    failed = true;
  } else {
    const filed = completeTaxFilingTask(taxState);
    if (!filed.ok || taxState.finance.fiscal.taxPaidYear !== 2026) {
      console.error(`FAIL: complete tax filing: ${filed.reason ?? 'bad state'}`);
      failed = true;
    } else if (taxBaseRevenue(taxState) !== 100_000) {
      console.error('FAIL: tax base should use prior FY revenue after year one');
      failed = true;
    } else {
      console.log(`OK: April corporate tax filing (${formatMoney(filed.owed)})`);
    }
  }
}

const {
  isCeoPersonalTaxFilingRequired,
  CEO_PERSONAL_TAX_FILING_TASK_ID,
  completeCeoPersonalTaxFilingTask,
  ceoPersonalTaxBaseIncome,
  accrueCeoTaxableIncome,
  ensureCeoPersonalTax
} = await import(`file://${join(sim, 'modules/CeoPersonalTax.js')}`);
const { payCeoPersonalTaxFromBank } = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);

const ceoTaxState = createInitialState({ companyName: 'CEO Tax Co', categoryId: 'b2b-saas', mode: 'career' });
ceoTaxState.meta.calendarStartYear = 2024;
ceoTaxState.calendar.year = 2026;
ceoTaxState.calendar.monthIndex = 4;
ensureCeoPersonalTax(ceoTaxState);
ceoTaxState.ceo.personalTax.prior = { year: 2025, income: 200_000 };
ceoTaxState.ceo.bankBalance = 100_000;
if (!isCeoPersonalTaxFilingRequired(ceoTaxState)) {
  console.error('FAIL: April CEO personal tax filing should be required with prior-year income');
  failed = true;
} else {
  const ceoOwed = Math.max(250, Math.round(200_000 * 0.28));
  const ceoFiled = completeCeoPersonalTaxFilingTask(ceoTaxState, payCeoPersonalTaxFromBank);
  if (!ceoFiled.ok || ceoTaxState.ceo.personalTax.taxPaidYear !== 2026) {
    console.error(`FAIL: complete CEO personal tax filing: ${ceoFiled.reason ?? 'bad state'}`);
    failed = true;
  } else if (ceoFiled.owed !== ceoOwed) {
    console.error(`FAIL: CEO personal tax liability (got ${ceoFiled.owed}, expected ${ceoOwed})`);
    failed = true;
  } else if (ceoPersonalTaxBaseIncome(ceoTaxState) !== 200_000) {
    console.error('FAIL: CEO personal tax base should use prior year after year one');
    failed = true;
  } else {
    console.log(`OK: April CEO personal tax filing (${formatMoney(ceoFiled.owed)})`);
  }
}

const accrualState = createInitialState({ companyName: 'Accrual Co', categoryId: 'b2b-saas', mode: 'career' });
accrualState.ceo.salaryAnnual = 120_000;
accrueCeoTaxableIncome(accrualState, ceoSalaryMonthly(accrualState));
if ((ensureCeoPersonalTax(accrualState).current.income ?? 0) !== ceoSalaryMonthly(accrualState)) {
  console.error('FAIL: CEO taxable income accrual');
  failed = true;
} else {
  console.log('OK: CEO taxable income accrual');
}

const charityState = createInitialState({ companyName: 'Give Co', categoryId: 'b2b-saas', mode: 'career' });
charityState.finance.cash = 50_000;
const beforeCash = charityState.finance.cash;
const gift = donateToCharity(charityState, 5_000);
if (!gift.ok || charityState.finance.cash !== beforeCash - 5_000) {
  console.error(`FAIL: charity donate: ${gift.reason ?? 'cash mismatch'}`);
  failed = true;
} else if ((charityState.finance.fiscal?.charityDonatedLifetime ?? 0) !== 5_000) {
  console.error('FAIL: charity lifetime tracker');
  failed = true;
} else {
  console.log('OK: charity donation from company cash');
}

const { autoSelectRecommendedLineup, deskMonthCloseChecklist } = await import(
  `file://${join(sim, 'modules/Desk.js')}`
);
const deskState = createInitialState({ companyName: 'DeskCo', categoryId: 'b2b-saas', mode: 'sandbox' });
deskState.workspace.tier = 'small';
dealMonthlyTasks(deskState);
if (!needsTaskLineup(deskState) || !(deskState.calendar.monthTaskOffers?.length > 0)) {
  console.error('FAIL: desk should open monthly lineup with offers');
  failed = true;
} else {
  const auto = autoSelectRecommendedLineup(deskState);
  const slots = deskState.calendar.monthTaskSlotTarget ?? 4;
  if (!auto.ok || selectedOfferCount(deskState) !== slots) {
    console.error(`FAIL: desk auto-lineup: ${auto.reason ?? `picked ${selectedOfferCount(deskState)}/${slots}`}`);
    failed = true;
  } else {
    const checklist = deskMonthCloseChecklist(deskState);
    if (!checklist.some((c) => c.id === 'lineup') || checklist.find((c) => c.id === 'tasks')?.done) {
      console.error('FAIL: desk month-close checklist shape');
      failed = true;
    } else {
      console.log(`OK: desk tab (auto-lineup ${auto.picked}/${slots}, checklist ${checklist.length} items)`);
    }
  }
}

if (getTaskDefinitions().some((t) => t.id === TAX_FILING_TASK_ID)) {
  console.log('OK: tax filing desk task in catalog');
} else {
  console.error('FAIL: tax filing task missing from merged catalog');
  failed = true;
}

if (getTaskDefinitions().some((t) => t.id === CEO_PERSONAL_TAX_FILING_TASK_ID)) {
  console.log('OK: CEO personal tax filing desk task in catalog');
} else {
  console.error('FAIL: CEO personal tax filing task missing from merged catalog');
  failed = true;
}

const {
  DEPARTMENTS,
  emptyHeadcount,
  visibleDepartments,
  isDepartmentUnlocked,
  migrateStaffHeadcount,
  totalHeadcount
} = await import(`file://${join(sim, 'modules/Staff.js')}`);
const { sellCeoHome, purchaseCeoHomeCash, purchaseCeoHomeMortgage, prepayCeoMortgage } =
  await import(`file://${join(sim, 'modules/CeoLifestyle.js')}`);
const {
  donateFromPersonalBank,
  recordCeoNetWorthSnapshot,
  depositPersonalInvestment
} = await import(`file://${join(sim, 'modules/CeoEconomics.js')}`);
const homeState = createInitialState({
  companyName: 'HomeSellCo',
  categoryId: 'b2b-saas',
  mode: 'sandbox',
  sandboxCash: 500_000
});
homeState.ceo.bankBalance = 2_000_000;
const bought = purchaseCeoHomeCash(homeState, 'starter-condo');
if (!bought.ok) {
  console.error(`FAIL: CEO home purchase: ${bought.reason}`);
  failed = true;
} else {
  const sold = sellCeoHome(homeState);
  if (!sold.ok || homeState.ceo.housing.mode !== 'rent') {
    console.error(`FAIL: CEO sell home: ${sold.reason ?? 'housing not reset'}`);
    failed = true;
  } else {
    const giveState = createInitialState({
      companyName: 'GivePersonal',
      categoryId: 'b2b-saas',
      mode: 'sandbox'
    });
    giveState.ceo.bankBalance = 20_000;
    const gift = donateFromPersonalBank(giveState, 5_000);
    if (!gift.ok || giveState.ceo.personalGivingLifetime !== 5_000) {
      console.error(`FAIL: personal philanthropy: ${gift.reason ?? 'lifetime mismatch'}`);
      failed = true;
    } else {
      recordCeoNetWorthSnapshot(giveState);
      if (!(giveState.ceo.netWorthHistory?.[0]?.netWorth > 0)) {
        console.error('FAIL: CEO net worth snapshot');
        failed = true;
      } else {
        const investState = createInitialState({
          companyName: 'InvestCo',
          categoryId: 'b2b-saas',
          mode: 'sandbox'
        });
        investState.ceo.bankBalance = 50_000;
        const dep = depositPersonalInvestment(investState, 10_000);
        const mortgageState = createInitialState({
          companyName: 'MortgageCo',
          categoryId: 'b2b-saas',
          mode: 'sandbox'
        });
        mortgageState.ceo.bankBalance = 500_000;
        purchaseCeoHomeMortgage(mortgageState, 'starter-condo');
        const prepay = prepayCeoMortgage(mortgageState, 25_000);
        if (!dep.ok || investState.ceo.investmentBalance !== 10_000 || !prepay.ok) {
          console.error('FAIL: CEO portfolio deposit or mortgage prepay');
          failed = true;
        } else {
          console.log(
            `OK: CEO tab (sell home ${formatMoney(sold.proceeds)}, portfolio ${formatMoney(investState.ceo.investmentBalance)}, mortgage prepay)`
          );
        }
      }
    }
  }
}

const { heuristicStaffingPlan, applyStaffingDraftPlan } = await import(
  `file://${join(sim, 'modules/StaffingPlanner.js')}`
);
const staffPlanState = createInitialState({ companyName: 'StaffPlan Co', categoryId: 'b2b-saas', mode: 'sandbox' });
staffPlanState.workspace.tier = WORKSPACE_TIER.SMALL;
staffPlanState.stage = STAGES.OFFICE;
staffPlanState.finance.cash = 500_000;
staffPlanState.calendar.monthRevenue = 80_000;
staffPlanState.staff.draftHeadcountByDept = { ...emptyHeadcount(), engineering: 2, sales: 1, product: 1 };
staffPlanState.staff.headcountByDept = { ...staffPlanState.staff.draftHeadcountByDept };
const growPlan = heuristicStaffingPlan(staffPlanState, 'increase');
if (!growPlan.ok || totalHeadcount(growPlan.headcountByDept) <= 4) {
  console.error(`FAIL: staffing increase heuristic: ${growPlan.reason ?? 'no growth'}`);
  failed = true;
} else {
  applyStaffingDraftPlan(staffPlanState, growPlan.headcountByDept);
  console.log(`OK: staffing auto-increase (${totalHeadcount(staffPlanState.staff.draftHeadcountByDept)} draft HC)`);
}

const shrinkState = createInitialState({ companyName: 'StaffCut Co', categoryId: 'b2b-saas', mode: 'sandbox' });
shrinkState.workspace.tier = WORKSPACE_TIER.SMALL;
shrinkState.stage = STAGES.OFFICE;
shrinkState.calendar.monthRevenue = 5_000;
shrinkState.staff.draftHeadcountByDept = { ...emptyHeadcount(), engineering: 8, sales: 6, marketing: 4, support: 3 };
const shrinkPlan = heuristicStaffingPlan(shrinkState, 'decrease');
const priorShrink = totalHeadcount(shrinkState.staff.draftHeadcountByDept);
if (!shrinkPlan.ok || totalHeadcount(shrinkPlan.headcountByDept) >= priorShrink) {
  console.error(`FAIL: staffing decrease heuristic: ${shrinkPlan.reason ?? 'no cuts'}`);
  failed = true;
} else {
  console.log(`OK: staffing auto-decrease (${priorShrink} → ${totalHeadcount(shrinkPlan.headcountByDept)} suggested)`);
}

if (DEPARTMENTS.length < 15) {
  console.error(`FAIL: expected 15 departments, got ${DEPARTMENTS.length}`);
  failed = true;
} else {
  const keys = Object.keys(emptyHeadcount());
  if (keys.length !== DEPARTMENTS.length || DEPARTMENTS.some((d) => !keys.includes(d.id))) {
    console.error('FAIL: emptyHeadcount keys must match DEPARTMENTS ids');
    failed = true;
  } else {
    const officeState = createInitialState({ companyName: 'DeptUnlock', categoryId: 'b2b-saas', mode: 'sandbox' });
    officeState.workspace.tier = WORKSPACE_TIER.SMALL;
    officeState.stage = STAGES.OFFICE;
    const open = visibleDepartments(officeState.stage, officeState).length;
    if (open < 7) {
      console.error(`FAIL: office-tier should unlock core departments (got ${open} open)`);
      failed = true;
    } else {
      const legacyState = createInitialState({ companyName: 'LegacyHC', categoryId: 'b2b-saas', mode: 'sandbox' });
      legacyState.staff.headcountByDept = { engineering: 2, sales: 1 };
      legacyState.staff.draftHeadcountByDept = { engineering: 2, sales: 1 };
      migrateStaffHeadcount(legacyState);
      if (Object.keys(legacyState.staff.headcountByDept).length !== DEPARTMENTS.length) {
        console.error('FAIL: migrateStaffHeadcount should backfill all department keys');
        failed = true;
      } else {
        const research = DEPARTMENTS.find((d) => d.id === 'research');
        officeState.flags.seriesAClosed = false;
        if (isDepartmentUnlocked(research, officeState)) {
          console.error('FAIL: R&D should require Series A');
          failed = true;
        } else {
          console.log(`OK: departments (${DEPARTMENTS.length}, ${open} open at office tier)`);
        }
      }
    }
  }
}

process.exit(failed ? 1 : 0);

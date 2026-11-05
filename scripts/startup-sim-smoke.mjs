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
const { createInitialState, normalizeSave } = await import(
  `file://${join(sim, 'modules/GameState.js')}`
);
const {
  hydrateTaskCatalog,
  dealMonthlyTasks,
  pickMonthlyTaskDefs,
  monthDealHasDuplicateTaskIds,
  confirmTaskLineup
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

const { totalHeadcountCap } = await import(`file://${join(sim, 'modules/Offices.js')}`);
if (totalHeadcountCap(state) !== 0) {
  console.error('FAIL: garage headcount cap expected 0 got', totalHeadcountCap(state));
  failed = true;
} else {
  console.log('OK: Offices STAGES import / headcount cap');
}

if (normalizeSave(null) !== null) failed = true;
if (normalizeSave({ company: {}, finance: {} }) !== null) failed = true;

const { getTaskRevenueMultiplierPreview, getCoreTaskRevenueMult } = await import(
  `file://${join(sim, 'modules/Finance.js')}`
);
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
const expected = Math.round(coreSand * 2 * 100) / 100;
if (Math.abs(totalSand - expected) > 0.05) {
  console.error(
    `FAIL: sandbox overlay expected ~${expected} (core ${coreSand} × 2), got ${totalSand}`
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
if (progMult < 20) {
  console.error(`FAIL: post-Series-B progression mult too low: ${progMult}`);
  failed = true;
} else {
  console.log(`OK: progression revenue mult after A/B ${progMult}`);
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

process.exit(failed ? 1 : 0);

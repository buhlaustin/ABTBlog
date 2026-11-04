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
const { hydrateTaskCatalog, dealMonthlyTasks } = await import(
  `file://${join(sim, 'modules/Tasks.js')}`
);
hydrateTaskCatalog(tasksJson);

function stageAllowed(task, stage) {
  const stages = task.stages ?? ['garage'];
  if (stage === STAGES.GARAGE || stage === STAGES.OFFICE) return stages.includes(stage);
  if (stage === STAGES.XC) return stages.includes('xc') || stages.includes('office');
  if (stage === STAGES.POST_XC) return stages.includes('post_xc') || stages.includes('xc');
  if (stage === STAGES.PUBLIC) return stages.includes('public') || stages.includes('post_xc');
  return stages.includes(stage);
}

let failed = false;
for (const stage of Object.values(STAGES)) {
  const pool = tasksJson.tasks.filter((t) => stageAllowed(t, stage));
  const slots = getMonthlyTaskSlots(stage);
  if (pool.length === 0) {
    console.error(`FAIL: no tasks for stage ${stage}`);
    failed = true;
    continue;
  }
  if (pool.length < slots) {
    console.warn(`WARN: stage ${stage} pool ${pool.length} < slots ${slots} (will repeat tasks)`);
  }
  console.log(`OK: stage ${stage} pool ${pool.length}, slots ${slots}`);
}

const state = createInitialState({
  companyName: 'SmokeTest',
  categoryId: 'b2b-saas',
  mode: 'career'
});

if (!state.calendar.monthTasks?.length) {
  dealMonthlyTasks(state);
}
if (!state.calendar.monthTasks?.length) {
  console.error('FAIL: could not deal tasks after hydrating catalog');
  failed = true;
} else {
  console.log(`OK: initial deal ${state.calendar.monthTasks.length} tasks`);
}

const { totalHeadcountCap } = await import(`file://${join(sim, 'modules/Offices.js')}`);
if (totalHeadcountCap(state) !== 2) {
  console.error('FAIL: garage headcount cap expected 2 got', totalHeadcountCap(state));
  failed = true;
} else {
  console.log('OK: Offices STAGES import / headcount cap');
}

if (normalizeSave(null) !== null) failed = true;
if (normalizeSave({ company: {}, finance: {} }) !== null) failed = true;

process.exit(failed ? 1 : 0);

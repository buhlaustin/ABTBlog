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
  monthDealHasDuplicateTaskIds
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

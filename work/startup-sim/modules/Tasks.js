import { assetBaseUrl } from './utils.js';
import { STAGES, getMonthlyTaskSlots } from './constants.js';
import bundledCatalog from '../data/tasks.json' with { type: 'json' };

/** Shipped catalog — always available with the game bundle. */
let taskCatalog = bundledCatalog;

export async function loadTaskCatalog() {
  if (!taskCatalog?.tasks?.length) {
    throw new Error('startup-sim: bundled tasks.json is empty');
  }
  try {
    const res = await fetch(`${assetBaseUrl()}data/tasks.json`, { cache: 'no-store' });
    if (!res.ok) return taskCatalog;
    const data = await res.json();
    if (Array.isArray(data.tasks) && data.tasks.length > 0) {
      taskCatalog = data;
    }
  } catch {
    /* keep bundled catalog */
  }
  return taskCatalog;
}

export function getTaskDefinitions() {
  return taskCatalog?.tasks ?? [];
}

export function isTaskCatalogReady() {
  return getTaskDefinitions().length > 0;
}

/** Used by headless smoke tests only (loads tasks.json without fetch). */
export function hydrateTaskCatalog(data) {
  if (data?.tasks?.length) taskCatalog = data;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function categoryAllowed(task, categoryId) {
  const cats = task.categories;
  if (!cats?.length) return true;
  return cats.includes(categoryId);
}

function stageAllowed(task, stage) {
  const stages = task.stages ?? ['garage'];
  if (stage === STAGES.GARAGE || stage === STAGES.OFFICE) {
    return stages.includes(stage);
  }
  if (stage === STAGES.XC) {
    return stages.includes('xc') || stages.includes('office');
  }
  if (stage === STAGES.POST_XC) {
    return stages.includes('post_xc') || stages.includes('xc');
  }
  if (stage === STAGES.PUBLIC) {
    return stages.includes('public') || stages.includes('post_xc');
  }
  return stages.includes(stage);
}

/** Deal counted tasks for the current month. */
export function dealMonthlyTasks(state) {
  const slots = getMonthlyTaskSlots(state.stage);
  const categoryId = state.company?.categoryId;
  const pool = getTaskDefinitions().filter(
    (t) => stageAllowed(t, state.stage) && categoryAllowed(t, categoryId)
  );
  if (!pool.length) {
    state.calendar.taskCatalogError = true;
    state.calendar.monthTasks = [];
    state.calendar.tasksCompleted = 0;
    state.calendar.monthRevenue = 0;
    state.calendar.monthSpend = 0;
    return state;
  }
  state.calendar.taskCatalogError = false;
  const shuffled = shuffle(pool);
  const picked = [];
  while (picked.length < slots) {
    for (const def of shuffled) {
      if (picked.length >= slots) break;
      picked.push(def);
    }
    if (!shuffled.length) break;
  }
  state.calendar.monthTaskSlotTarget = slots;
  state.calendar.monthTasks = picked.map((def, index) => ({
    instanceId: `${state.calendar.year}-${state.calendar.monthIndex}-${def.id}-${index}`,
    taskId: def.id,
    status: 'pending'
  }));
  state.calendar.tasksCompleted = 0;
  state.calendar.monthRevenue = 0;
  state.calendar.monthSpend = 0;
  return state;
}

export function getTaskDef(taskId) {
  return getTaskDefinitions().find((t) => t.id === taskId);
}

export function pendingTasks(state) {
  return (state.calendar.monthTasks ?? []).filter((t) => t.status === 'pending');
}

export function allTasksComplete(state) {
  return pendingTasks(state).length === 0;
}

export function canEndMonth(state) {
  if (state.flags?.gameOver) return false;
  if (state.calendar?.taskCatalogError) return false;
  if (state.crisis?.active) return false;
  return allTasksComplete(state);
}

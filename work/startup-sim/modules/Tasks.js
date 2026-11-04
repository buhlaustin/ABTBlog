import { fetchGameJson } from './utils.js';
import { STAGES, getMonthlyTaskSlots, getMonthlyTaskOfferCount } from './constants.js';
import { getTaskStage } from './Workspace.js';
import { progressionTier } from './ProgressionEconomy.js';
import bundledCatalog from '../data/tasks.json' with { type: 'json' };

/** Shipped catalog — always available with the game bundle. */
let taskCatalog = bundledCatalog;

export async function loadTaskCatalog() {
  if (!taskCatalog?.tasks?.length) {
    throw new Error('startup-sim: bundled tasks.json is empty');
  }
  try {
    const data = await fetchGameJson('data/tasks.json');
    if (Array.isArray(data?.tasks) && data.tasks.length > 0) {
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

/** Months of dealt task ids to deprioritize when building the next desk lineup. */
const RECENT_TASK_COOLDOWN_MONTHS = 8;

/**
 * Pick up to `slots` tasks from `pool` with unique ids per month.
 * Prefers tasks not seen in `recentTaskIds` (cross-month variety).
 * Duplicates in one month only when pool.length < slots (should not happen in shipped catalog).
 */
export function pickMonthlyTaskDefs(pool, slots, recentTaskIds = []) {
  if (!pool.length || slots <= 0) return [];

  const cooldownLen = slots * RECENT_TASK_COOLDOWN_MONTHS;
  const recent = new Set((recentTaskIds ?? []).slice(-cooldownLen));
  const fresh = pool.filter((t) => !recent.has(t.id));
  const stale = pool.filter((t) => recent.has(t.id));

  const picked = [];
  const used = new Set();

  function takeUnique(source) {
    for (const def of shuffle(source)) {
      if (picked.length >= slots) break;
      if (used.has(def.id)) continue;
      used.add(def.id);
      picked.push(def);
    }
  }

  takeUnique(fresh.length ? fresh : pool);
  if (picked.length < slots) takeUnique(stale);
  if (picked.length < slots) takeUnique(pool);

  if (picked.length < slots && pool.length > 0) {
    const extras = shuffle(pool);
    let guard = 0;
    while (picked.length < slots && guard < slots * 4) {
      const def = extras[picked.length % extras.length];
      picked.push(def);
      guard += 1;
    }
  }

  return picked.slice(0, slots);
}

export function monthDealHasDuplicateTaskIds(picked) {
  const seen = new Set();
  for (const def of picked) {
    if (seen.has(def.id)) return true;
    seen.add(def.id);
  }
  return false;
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
    return stages.includes('xc');
  }
  if (stage === STAGES.POST_XC) {
    return stages.includes('post_xc');
  }
  if (stage === STAGES.PUBLIC) {
    return stages.includes('public') || stages.includes('post_xc');
  }
  return stages.includes(stage);
}

function inferredTierBand(task) {
  if (task.tierMin != null || task.tierMax != null) {
    return { min: task.tierMin ?? 0, max: task.tierMax ?? 99 };
  }
  const stages = task.stages ?? [];
  const rMax = task.revenue?.[1] ?? 0;
  if (stages.includes('garage') || stages.includes('office')) {
    return { min: 0, max: 1 };
  }
  if (stages.includes('xc')) {
    return { min: 0, max: 2 };
  }
  if (stages.includes('public')) {
    return { min: 5, max: 99 };
  }
  if (rMax >= 500_000) return { min: 5, max: 99 };
  if (rMax >= 120_000) return { min: 4, max: 99 };
  if (rMax >= 40_000) return { min: 3, max: 5 };
  if (rMax >= 12_000) return { min: 2, max: 4 };
  return { min: 1, max: 2 };
}

function taskTierAllowed(task, state) {
  const tier = progressionTier(state);
  const { min, max } = inferredTierBand(task);
  return tier >= min && tier <= max;
}

function buildTaskPool(state) {
  const taskStage = getTaskStage(state);
  const categoryId = state.company?.categoryId;
  return getTaskDefinitions().filter(
    (t) =>
      stageAllowed(t, taskStage) &&
      categoryAllowed(t, categoryId) &&
      taskTierAllowed(t, state)
  );
}

/** Offer extra tasks; player confirms lineup before work counts. */
export function dealMonthlyTasks(state) {
  const taskStage = getTaskStage(state);
  const slots = getMonthlyTaskSlots(taskStage);
  const offerCount = getMonthlyTaskOfferCount(taskStage);
  const pool = buildTaskPool(state);
  if (!pool.length) {
    state.calendar.taskCatalogError = true;
    state.calendar.monthTaskOffers = [];
    state.calendar.monthTasks = [];
    state.calendar.tasksCompleted = 0;
    state.calendar.monthRevenue = 0;
    state.calendar.monthSpend = 0;
    state.calendar.taskLineupConfirmed = false;
    return state;
  }
  state.calendar.taskCatalogError = false;
  const recent = state.calendar.recentTaskIds ?? [];
  const offered = pickMonthlyTaskDefs(pool, offerCount, recent);
  state.calendar.monthTaskSlotTarget = slots;
  state.calendar.monthTaskOffers = offered.map((def, index) => ({
    offerId: `${state.calendar.year}-${state.calendar.monthIndex}-offer-${def.id}-${index}`,
    taskId: def.id,
    selected: false
  }));
  state.calendar.monthTasks = [];
  state.calendar.taskLineupConfirmed = false;
  state.calendar.tasksCompleted = 0;
  state.calendar.monthRevenue = 0;
  state.calendar.monthSpend = 0;
  return state;
}

export function selectedOfferCount(state) {
  return (state.calendar.monthTaskOffers ?? []).filter((o) => o.selected).length;
}

export function toggleTaskOffer(state, offerId) {
  const slots = state.calendar.monthTaskSlotTarget ?? getMonthlyTaskSlots(getTaskStage(state));
  if (state.calendar.taskLineupConfirmed) {
    return { ok: false, reason: 'Lineup locked — complete tasks or finish the month.' };
  }
  const offer = state.calendar.monthTaskOffers?.find((o) => o.offerId === offerId);
  if (!offer) return { ok: false, reason: 'Task not on this month’s board.' };
  if (offer.selected) {
    offer.selected = false;
    return { ok: true };
  }
  if (selectedOfferCount(state) >= slots) {
    return { ok: false, reason: `Pick ${slots} tasks only.` };
  }
  offer.selected = true;
  return { ok: true };
}

export function confirmTaskLineup(state) {
  const slots = state.calendar.monthTaskSlotTarget ?? getMonthlyTaskSlots(getTaskStage(state));
  const selected = (state.calendar.monthTaskOffers ?? []).filter((o) => o.selected);
  if (selected.length !== slots) {
    return { ok: false, reason: `Select exactly ${slots} tasks for this month.` };
  }
  const recent = state.calendar.recentTaskIds ?? [];
  const dealtIds = selected.map((o) => o.taskId);
  state.calendar.recentTaskIds = [...recent, ...dealtIds].slice(-slots * 6);
  state.calendar.monthTasks = selected.map((o, index) => ({
    instanceId: `${state.calendar.year}-${state.calendar.monthIndex}-${o.taskId}-${index}`,
    taskId: o.taskId,
    status: 'pending'
  }));
  state.calendar.taskLineupConfirmed = true;
  return { ok: true };
}

export function needsTaskLineup(state) {
  if (state.calendar?.taskCatalogError) return false;
  return !state.calendar?.taskLineupConfirmed;
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
  if (needsTaskLineup(state)) return false;
  return allTasksComplete(state);
}

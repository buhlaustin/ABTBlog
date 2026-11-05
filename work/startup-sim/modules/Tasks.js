import { fetchGameJson } from './utils.js';
import { STAGES, getMonthlyTaskSlots, getMonthlyTaskOfferCount } from './constants.js';
import { getTaskStage } from './Workspace.js';
import { progressionTier } from './ProgressionEconomy.js';
import bundledCatalog from '../data/tasks.json' with { type: 'json' };
import bundledSignature from '../data/signature-tasks.json' with { type: 'json' };
import bundledLaunch from '../data/launch-tasks.json' with { type: 'json' };
import bundledLaunchCrowd from '../data/launch-crowdfunding-tasks.json' with { type: 'json' };
import bundledSpaceExploration from '../data/space-exploration-tasks.json' with { type: 'json' };
import bundledSpaceExpansion from '../data/space-exploration-expansion.json' with { type: 'json' };
import bundledCatalogExpansion from '../data/tasks-catalog-expansion.json' with { type: 'json' };
import bundledPublicLate from '../data/tasks-public-late-game.json' with { type: 'json' };
import bundledPostXcPreSeed from '../data/post-xc-pre-seed-tasks.json' with { type: 'json' };
import bundledXcDemoDay from '../data/xc-demo-day-task.json' with { type: 'json' };
import { isXcDemoDayMonth, XC_DEMO_DAY_TASK_ID } from './XC.js';
import {
  currentLaunchTaskPhase,
  launchPhaseAllowed,
  launchLifecycleActive,
  canSchedulePublicLaunch
} from './LaunchLifecycle.js';

/** Shipped catalog — always available with the game bundle. */
function mergeSignatureTasks(base) {
  const sig = bundledSignature?.tasks ?? [];
  if (!sig.length) return base;
  const ids = new Set((base.tasks ?? []).map((t) => t.id));
  const merged = [...(base.tasks ?? [])];
  for (const t of sig) {
    if (!ids.has(t.id)) merged.push(t);
  }
  return { ...base, tasks: merged };
}

function mergeLaunchTasks(base) {
  const launch = [
    ...(bundledLaunch?.tasks ?? []),
    ...(bundledLaunchCrowd?.tasks ?? [])
  ];
  if (!launch.length) return base;
  const ids = new Set((base.tasks ?? []).map((t) => t.id));
  const merged = [...(base.tasks ?? [])];
  for (const t of launch) {
    if (!ids.has(t.id)) merged.push(t);
  }
  return { ...base, tasks: merged };
}

function mergePostXcPreSeedTasks(base) {
  const extra = bundledPostXcPreSeed?.tasks ?? [];
  if (!extra.length) return base;
  const ids = new Set((base.tasks ?? []).map((t) => t.id));
  const merged = [...(base.tasks ?? [])];
  for (const t of extra) {
    if (!ids.has(t.id)) merged.push(t);
  }
  return { ...base, tasks: merged };
}

function mergeXcDemoDayTasks(base) {
  const extra = bundledXcDemoDay?.tasks ?? [];
  if (!extra.length) return base;
  const ids = new Set((base.tasks ?? []).map((t) => t.id));
  const merged = [...(base.tasks ?? [])];
  for (const t of extra) {
    if (!ids.has(t.id)) merged.push(t);
  }
  return { ...base, tasks: merged };
}

function mergeSpaceExplorationTasks(base) {
  let out = base;
  for (const pack of [bundledSpaceExploration, bundledSpaceExpansion]) {
    out = mergeTaskPack(out, pack?.tasks ?? []);
  }
  return out;
}

function mergeCatalogExpansion(base) {
  return mergeTaskPack(base, bundledCatalogExpansion?.tasks ?? []);
}

function mergePublicLateGameTasks(base) {
  return mergeTaskPack(base, bundledPublicLate?.tasks ?? []);
}

function mergeCatalog(base) {
  return mergeXcDemoDayTasks(
    mergePostXcPreSeedTasks(
      mergeLaunchTasks(
        mergeSpaceExplorationTasks(
          mergePublicLateGameTasks(mergeCatalogExpansion(mergeSignatureTasks(base)))
        )
      )
    )
  );
}

let taskCatalog = mergeCatalog(bundledCatalog);

export async function loadTaskCatalog() {
  if (!taskCatalog?.tasks?.length) {
    throw new Error('startup-sim: bundled tasks.json is empty');
  }
  taskCatalog = mergeCatalog(taskCatalog);
  try {
    const data = await fetchGameJson('data/tasks.json');
    if (Array.isArray(data?.tasks) && data.tasks.length > 0) {
      taskCatalog = mergeCatalog(data);
    }
  } catch {
    /* keep bundled catalog */
  }
  return taskCatalog;
}

export function getTaskDefinitions() {
  return taskCatalog?.tasks ?? [];
}

export function taskCatalogSize() {
  return getTaskDefinitions().length;
}

/** Headless tests — eligible desk pool for the current run state. */
export function getTaskPoolSize(state) {
  return buildTaskPool(state).length;
}

export function isTaskCatalogReady() {
  return getTaskDefinitions().length > 0;
}

/** Used by headless smoke tests only (loads tasks.json without fetch). */
export function hydrateTaskCatalog(data) {
  if (data?.tasks?.length) taskCatalog = mergeCatalog(data);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Cross-month cooldown — task ids stay out of the offer board for this many deal cycles. */
export const RECENT_TASK_COOLDOWN_MONTHS = 12;

function mergeTaskPack(base, extraTasks) {
  if (!extraTasks?.length) return base;
  const merged = [...(base.tasks ?? [])];
  const ids = new Set(merged.map((t) => t.id));
  for (const t of extraTasks) {
    if (!ids.has(t.id)) {
      ids.add(t.id);
      merged.push(t);
    }
  }
  if (merged.length === (base.tasks ?? []).length) return base;
  return { ...base, tasks: merged };
}

/**
 * Pick up to `slots` tasks from `pool` with unique ids per month.
 * Prefers tasks not seen in `recentTaskIds` (cross-month variety).
 * Duplicates in one month only when pool.length < slots (should not happen in shipped catalog).
 */
export function pickMonthlyTaskDefs(pool, slots, recentTaskIds = []) {
  if (!pool.length || slots <= 0) return [];

  const cap = Math.min(slots, pool.length);
  const cooldownLen = cap * RECENT_TASK_COOLDOWN_MONTHS;
  const recent = new Set((recentTaskIds ?? []).slice(-cooldownLen));
  const fresh = pool.filter((t) => !recent.has(t.id));
  const stale = pool.filter((t) => recent.has(t.id));

  const picked = [];
  const used = new Set();

  function takeUnique(source) {
    for (const def of shuffle(source)) {
      if (picked.length >= cap) break;
      if (used.has(def.id)) continue;
      used.add(def.id);
      picked.push(def);
    }
  }

  const signaturePool = pool.filter((t) => t.signature && !recent.has(t.id));
  if (signaturePool.length && cap > 0 && !pool.some((t) => t.launchPhase)) {
    const sig = shuffle(signaturePool)[0];
    used.add(sig.id);
    picked.push(sig);
  }

  takeUnique(fresh.length ? fresh : pool);
  if (picked.length < cap) takeUnique(stale);
  if (picked.length < cap) takeUnique(pool);

  return picked.slice(0, cap);
}

/** Force-inject a task into offers without duplicate ids. */
export function mergeUniqueTaskOffers(offered, def, offerCount) {
  if (!def) return offered;
  const rest = offered.filter((t) => t.id !== def.id);
  const next = [def, ...rest];
  const seen = new Set();
  const unique = [];
  for (const t of next) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    unique.push(t);
  }
  return unique.slice(0, Math.min(offerCount, unique.length));
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

function postXcRevenueBand(rMax) {
  if (rMax >= 500_000) return { min: 5, max: 99 };
  if (rMax >= 120_000) return { min: 4, max: 99 };
  if (rMax >= 40_000) return { min: 3, max: 5 };
  if (rMax >= 12_000) return { min: 2, max: 4 };
  return { min: 1, max: 2 };
}

/** Union tier bands when a task spans multiple stages (e.g. post_xc + public). */
function inferredTierBand(task) {
  if (task.tierMin != null || task.tierMax != null) {
    return { min: task.tierMin ?? 0, max: task.tierMax ?? 99 };
  }
  const stages = task.stages ?? [];
  const rMax = task.revenue?.[1] ?? 0;
  let min = 99;
  let max = 0;
  const add = (lo, hi) => {
    min = Math.min(min, lo);
    max = Math.max(max, hi);
  };
  if (stages.includes('garage') || stages.includes('office')) add(0, 1);
  if (stages.includes('xc')) add(0, 2);
  if (stages.includes('post_xc')) {
    const b = postXcRevenueBand(rMax);
    add(b.min, b.max);
  }
  if (stages.includes('public')) add(5, 99);
  if (min === 99) return postXcRevenueBand(rMax);
  return { min, max };
}

function taskTierAllowed(task, state) {
  const tier = progressionTier(state);
  const { min, max } = inferredTierBand(task);
  return tier >= min && tier <= max;
}

function buildTaskPool(state) {
  const taskStage = getTaskStage(state);
  const categoryId = state.company?.categoryId;
  const demoMonth = isXcDemoDayMonth(state) && !state.xc?.demoDayTaskDone;
  return getTaskDefinitions().filter(
    (t) => {
      if (t.xcDemoDay && !demoMonth) return false;
      return (
        stageAllowed(t, taskStage) &&
        categoryAllowed(t, categoryId) &&
        taskTierAllowed(t, state) &&
        launchPhaseAllowed(t, state)
      );
    }
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
  let offered = pickMonthlyTaskDefs(pool, offerCount, recent);
  const launchDesk = currentLaunchTaskPhase(state);
  if (launchDesk === 'pre_launch' && state.launch?.phase === 'pre_launch' && canSchedulePublicLaunch(state)) {
    const sched = pool.find((t) => t.scheduleLaunch);
    if (sched) offered = mergeUniqueTaskOffers(offered, sched, offerCount);
  }
  if (launchDesk === 'pre_launch' && state.launch?.phase === 'pre_launch') {
    const crowdPool = pool.filter((t) => t.crowdfunding);
    if (crowdPool.length && !offered.some((t) => t.crowdfunding)) {
      const pick = shuffle(crowdPool)[0];
      offered = mergeUniqueTaskOffers(offered, pick, offerCount);
    }
  }
  if (isXcDemoDayMonth(state) && !state.xc?.demoDayTaskDone) {
    const demo = pool.find((t) => t.id === XC_DEMO_DAY_TASK_ID);
    if (demo) offered = mergeUniqueTaskOffers(offered, demo, offerCount);
  }
  if (!launchLifecycleActive(state)) {
    const sigPool = pool.filter((t) => t.signature);
    if (sigPool.length && !offered.some((t) => t.signature) && offered.length > 0) {
      const available = sigPool.filter((t) => !offered.some((o) => o.id === t.id));
      const sig = shuffle(available.length ? available : sigPool)[0];
      if (sig) {
        const trimmed = offered.filter((t) => t.id !== sig.id);
        if (trimmed.length >= offerCount) {
          offered = mergeUniqueTaskOffers(trimmed.slice(0, offerCount - 1), sig, offerCount);
        } else {
          offered = mergeUniqueTaskOffers(offered, sig, offerCount);
        }
      }
    }
  }

  if (monthDealHasDuplicateTaskIds(offered)) {
    const seen = new Set();
    offered = offered.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  const offeredIds = offered.map((t) => t.id);
  state.calendar.recentTaskIds = [...(state.calendar.recentTaskIds ?? []), ...offeredIds].slice(
    -offerCount * RECENT_TASK_COOLDOWN_MONTHS
  );
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
  if (isXcDemoDayMonth(state) && !state.xc?.demoDayTaskDone) {
    if (!selected.some((o) => o.taskId === XC_DEMO_DAY_TASK_ID)) {
      return { ok: false, reason: 'Demo Day is mandatory in your final batch month — include it in your lineup.' };
    }
  }
  const recent = state.calendar.recentTaskIds ?? [];
  const dealtIds = selected.map((o) => o.taskId);
  state.calendar.recentTaskIds = [...recent, ...dealtIds].slice(
    -slots * RECENT_TASK_COOLDOWN_MONTHS * 2
  );
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
  if (state.decision?.active) return false;
  if (needsTaskLineup(state)) return false;
  return allTasksComplete(state);
}

import { STAGES, formatMoney } from './constants.js';
import { getTaskStage } from './Workspace.js';
import { addCalendarMonths, formatCalendarMonth } from './GameCalendar.js';

/** Minimum product buzz before "Schedule public launch" unlocks. */
export const PRE_LAUNCH_BUZZ_REQUIRED = 10;
/** Minimum product level from engineering pre-launch work. */
export const PRE_LAUNCH_PRODUCT_REQUIRED = 4;

export function isPreLaunchDeskPhase(state) {
  return currentLaunchTaskPhase(state) === 'pre_launch';
}

export function canSchedulePublicLaunch(state) {
  if (!launchLifecycleActive(state)) return false;
  if (state.launch?.phase !== 'pre_launch') return false;
  const buzz = state.product?.buzz ?? 0;
  const level = state.product?.level ?? 0;
  return buzz >= PRE_LAUNCH_BUZZ_REQUIRED && level >= PRE_LAUNCH_PRODUCT_REQUIRED;
}

export function preLaunchGateStatus(state) {
  const buzz = state.product?.buzz ?? 0;
  const level = state.product?.level ?? 0;
  return {
    buzz,
    level,
    buzzOk: buzz >= PRE_LAUNCH_BUZZ_REQUIRED,
    productOk: level >= PRE_LAUNCH_PRODUCT_REQUIRED,
    ready: canSchedulePublicLaunch(state)
  };
}

function ensureLaunchMetrics(state) {
  if (!state.launch) state.launch = createInitialLaunchState();
  if (state.launch.waitlistSignups == null) state.launch.waitlistSignups = 0;
  if (state.launch.preSellBooked == null) state.launch.preSellBooked = 0;
  if (state.launch.marketingTasksDone == null) state.launch.marketingTasksDone = 0;
  if (state.launch.productTasksDone == null) state.launch.productTasksDone = 0;
}

/** After a pre-launch desk task completes — flavor metrics only; revenue stays normal. */
export function recordPreLaunchTaskOutcome(state, taskDef, revenue) {
  if (!isPreLaunchDeskPhase(state) || !taskDef?.launchPhase) return [];
  ensureLaunchMetrics(state);
  const lines = [];
  const types = taskDef.types ?? [];
  const isMarketing = types.includes('marketing') || (taskDef.buzz ?? 0) > 0;
  const isProduct = types.includes('product') || (taskDef.product ?? 0) > 0;

  if (revenue > 0) {
    state.launch.preSellBooked += revenue;
  }
  if (isMarketing) {
    state.launch.marketingTasksDone += 1;
    const signups = 35 + (taskDef.buzz ?? 0) * 22 + Math.floor(revenue / 80);
    state.launch.waitlistSignups += signups;
    lines.push(`Waitlist +${signups} (now ${state.launch.waitlistSignups}).`);
  }
  if (isProduct) {
    state.launch.productTasksDone += 1;
  }
  return lines;
}

export function tickPreLaunchAtMonthStart(state) {
  if (!launchLifecycleActive(state)) return [];
  const phase = state.launch?.phase;
  if (phase !== 'pre_launch' && phase !== 'scheduled') return [];
  ensureLaunchMetrics(state);
  const buzz = state.product?.buzz ?? 0;
  const level = state.product?.level ?? 0;
  if (buzz <= 0 && level <= 0) return [];
  const organic = Math.floor(buzz * 12 + level * 8);
  if (organic <= 0) return [];
  state.launch.waitlistSignups += organic;
  return [`Pre-launch waitlist grew by ~${organic} from word-of-mouth (total ${state.launch.waitlistSignups}).`];
}

export function renderPreLaunchProgressBlock(state) {
  if (!launchLifecycleActive(state) || !isPreLaunchDeskPhase(state)) return '';
  ensureLaunchMetrics(state);
  const g = preLaunchGateStatus(state);
  const buzzPct = Math.min(100, Math.round((g.buzz / PRE_LAUNCH_BUZZ_REQUIRED) * 100));
  const prodPct = Math.min(100, Math.round((g.level / PRE_LAUNCH_PRODUCT_REQUIRED) * 100));
  const waitlist = state.launch.waitlistSignups ?? 0;
  const preSell = state.launch.preSellBooked ?? 0;
  const readyLabel = g.ready ? 'Ready to schedule launch' : 'Not ready to schedule';
  return `<div class="prelaunch-progress" role="region" aria-label="Pre-launch readiness">
    <p class="prelaunch-progress-title"><strong>Pre-launch runway</strong> · ${readyLabel}</p>
    <div class="prelaunch-meter">
      <span class="stat-label">Buzz ${g.buzz}/${PRE_LAUNCH_BUZZ_REQUIRED}</span>
      <div class="prelaunch-bar"><div class="prelaunch-fill" style="width:${buzzPct}%"></div></div>
    </div>
    <div class="prelaunch-meter">
      <span class="stat-label">Product ${g.level}/${PRE_LAUNCH_PRODUCT_REQUIRED}</span>
      <div class="prelaunch-bar"><div class="prelaunch-fill product" style="width:${prodPct}%"></div></div>
    </div>
    <p class="fine-print">Waitlist ${waitlist.toLocaleString()} · Pre-sell booked ${formatMoney(preSell)} · ${state.launch.marketingTasksDone ?? 0} marketing / ${state.launch.productTasksDone ?? 0} product tasks done</p>
  </div>`;
}

export function createInitialLaunchState() {
  return {
    phase: 'pre_launch',
    launchYear: null,
    launchMonthIndex: null,
    postLaunchMonthsLeft: 0,
    waitlistSignups: 0,
    preSellBooked: 0,
    marketingTasksDone: 0,
    productTasksDone: 0
  };
}

/** Garage launch arc still gating the desk catalog. */
export function launchLifecycleActive(state) {
  if (getTaskStage(state) !== STAGES.GARAGE) return false;
  return state.launch?.phase !== 'graduated';
}

export function launchPhaseLabel(state) {
  if (!launchLifecycleActive(state)) return null;
  const p = state.launch?.phase;
  if (p === 'pre_launch') return 'Pre-launch';
  if (p === 'scheduled') {
    const y = state.launch.launchYear;
    const m = state.launch.launchMonthIndex;
    return `Pre-launch · launch scheduled ${formatCalendarMonth(y, m)}`;
  }
  if (p === 'launch_month') return 'Launch month';
  if (p === 'post_launch') {
    const left = state.launch.postLaunchMonthsLeft ?? 0;
    return `Post-launch · ${left} month(s) left in playbook`;
  }
  return null;
}

/** Which `launchPhase` on tasks.json rows to deal this month. */
export function currentLaunchTaskPhase(state) {
  if (!launchLifecycleActive(state)) return null;
  const p = state.launch?.phase ?? 'pre_launch';
  if (p === 'pre_launch' || p === 'scheduled') return 'pre_launch';
  if (p === 'launch_month') return 'launch';
  if (p === 'post_launch') return 'post_launch';
  return null;
}

export function launchPhaseAllowed(task, state) {
  const needed = currentLaunchTaskPhase(state);
  if (!needed) return true;
  if (!task.launchPhase) return false;
  if (needed === 'pre_launch') {
    if (task.scheduleLaunch && state.launch?.phase === 'scheduled') return false;
    if (task.scheduleLaunch && !canSchedulePublicLaunch(state)) return false;
    return task.launchPhase === 'pre_launch';
  }
  return task.launchPhase === needed;
}

export function tickLaunchAtMonthStart(state) {
  if (!launchLifecycleActive(state)) return [];
  const launch = state.launch;
  const { year, monthIndex } = state.calendar;
  const lines = [];

  if (
    launch.phase === 'scheduled' &&
    launch.launchYear === year &&
    launch.launchMonthIndex === monthIndex
  ) {
    launch.phase = 'launch_month';
    lines.push('Launch month — Product Hunt, press, and the servers you forgot to scale.');
  }
  return lines;
}

export function onScheduleLaunchTaskCompleted(state) {
  if (!state.launch) state.launch = createInitialLaunchState();
  if (state.launch.phase !== 'pre_launch' && state.launch.phase !== 'scheduled') {
    return { ok: false, reason: 'Launch already scheduled or shipped.' };
  }
  if (!canSchedulePublicLaunch(state)) {
    const g = preLaunchGateStatus(state);
    return {
      ok: false,
      reason: `Need ${PRE_LAUNCH_BUZZ_REQUIRED}+ buzz (${g.buzz}) and product ${PRE_LAUNCH_PRODUCT_REQUIRED}+ (${g.level}) before scheduling launch.`
    };
  }
  const next = addCalendarMonths(state.calendar.year, state.calendar.monthIndex, 1);
  state.launch.phase = 'scheduled';
  state.launch.launchYear = next.year;
  state.launch.launchMonthIndex = next.monthIndex;
  return {
    ok: true,
    lines: [
      `Public launch scheduled for ${formatCalendarMonth(next.year, next.monthIndex)}. Finish pre-launch work until then.`
    ]
  };
}

export function settleLaunchAtMonthEnd(state) {
  if (!state.launch || state.launch.phase === 'graduated') return [];
  const lines = [];

  if (state.launch.phase === 'launch_month') {
    state.launch.phase = 'post_launch';
    state.launch.postLaunchMonthsLeft = 3;
    lines.push('Launch month closed — post-launch playbook runs for 3 months.');
  } else if (state.launch.phase === 'post_launch') {
    state.launch.postLaunchMonthsLeft = Math.max(0, (state.launch.postLaunchMonthsLeft ?? 0) - 1);
    if (state.launch.postLaunchMonthsLeft <= 0) {
      state.launch.phase = 'graduated';
      lines.push('Launch arc complete — full garage desk catalog unlocks.');
    } else {
      lines.push(`Post-launch month — ${state.launch.postLaunchMonthsLeft} left in the playbook.`);
    }
  }
  return lines;
}

export function graduateLaunchIfLeftGarage(state) {
  if (state.stage !== STAGES.GARAGE && state.launch?.phase !== 'graduated') {
    state.launch = state.launch ?? createInitialLaunchState();
    state.launch.phase = 'graduated';
    return ['Moved out of the garage — standard desk tasks apply.'];
  }
  return [];
}

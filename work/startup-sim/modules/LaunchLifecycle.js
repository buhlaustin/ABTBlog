import { STAGES } from './constants.js';

export function createInitialLaunchState() {
  return {
    phase: 'pre_launch',
    launchYear: null,
    launchMonthIndex: null,
    postLaunchMonthsLeft: 0
  };
}

/** Garage launch arc still gating the desk catalog. */
export function launchLifecycleActive(state) {
  return state.stage === STAGES.GARAGE && state.launch?.phase !== 'graduated';
}

export function launchPhaseLabel(state) {
  if (!launchLifecycleActive(state)) return null;
  const p = state.launch?.phase;
  if (p === 'pre_launch') return 'Pre-launch';
  if (p === 'scheduled') {
    const y = state.launch.launchYear;
    const m = state.launch.launchMonthIndex;
    return `Pre-launch · public launch scheduled Y${y} M${m}`;
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
  let monthIndex = state.calendar.monthIndex + 1;
  let year = state.calendar.year;
  if (monthIndex > 12) {
    monthIndex = 1;
    year += 1;
  }
  state.launch.phase = 'scheduled';
  state.launch.launchYear = year;
  state.launch.launchMonthIndex = monthIndex;
  return {
    ok: true,
    lines: [
      `Public launch scheduled for Month ${monthIndex}, Year ${year}. Finish pre-launch work until then.`
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

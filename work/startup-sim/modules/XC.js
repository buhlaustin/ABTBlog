import { fetchGameJson } from './utils.js';
import { STAGES } from './constants.js';
import { applyXCSafe } from './CapTable.js';
import { restorePostXcWorkspace } from './Workspace.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import bundledInterview from '../data/xc-interview.json' with { type: 'json' };
import { calendarTurn, turnToCalendar, formatCalendarMonth } from './GameCalendar.js';

export { calendarTurn };

let interviewCache = bundledInterview;

export async function loadInterviewQuestions() {
  try {
    const data = await fetchGameJson('data/xc-interview.json');
    if (data && Array.isArray(data.questions) && data.questions.length > 0) {
      interviewCache = data;
    }
  } catch {
    /* keep bundled questions */
  }
  return interviewCache;
}

export function createInitialXcState() {
  return {
    residencyMonthsRemaining: 0,
    batchLabel: null,
    retryAvailableTurn: null,
    needsFollowUpQuestion: false,
    batchStartsTurn: null,
    graduateBoostMonths: 0
  };
}

export function xcWaitingForRetry(state) {
  const retry = state.xc?.retryAvailableTurn;
  if (retry == null) return false;
  return calendarTurn(state) < retry;
}

export function canStartInterview(state) {
  if (!state.flags?.xcUnlocked || state.flags?.xcAccepted) return false;
  if (xcWaitingForRetry(state)) return false;
  return true;
}

/** True during the 3-month SF batch (desk tasks are XC-only). */
export function isInResidency(state) {
  return Boolean(state.flags?.xcBatchActive && !state.flags?.xcResidencyComplete);
}

export function isXcAcceptedPendingBatch(state) {
  return Boolean(
    state.flags?.xcAccepted && !state.flags?.xcBatchActive && !state.flags?.xcResidencyComplete
  );
}

export function xcBatchStartLabel(state) {
  const turn = state.xc?.batchStartsTurn;
  if (turn == null) return null;
  return turnToCalendar(state, turn);
}

export function xcBatchStartLabelText(state) {
  const start = xcBatchStartLabel(state);
  return start ? formatCalendarMonth(start.year, start.monthIndex) : null;
}

export function xcProgramRevenueMult(state) {
  if (isInResidency(state)) return 1.35;
  const grad = state.xc?.graduateBoostMonths ?? 0;
  if (grad > 0 && state.flags?.xcResidencyComplete) return 1.15;
  return 1;
}

export function xcProgramProductBonus(state) {
  if (isInResidency(state)) return 1.25;
  if ((state.xc?.graduateBoostMonths ?? 0) > 0) return 1.1;
  return 1;
}

/** Lenient offline pass — any non-empty answers with minimal length. */
export function scoreInterviewOffline(answers) {
  const values = Object.values(answers ?? {});
  const filled = values.filter((a) => String(a).trim().length >= 20);
  const score = Math.min(100, 55 + filled.length * 15);
  const accepted = filled.length >= 2 || values.some((a) => String(a).trim().length >= 40);
  const waitlisted = !accepted && filled.length >= 1;
  return {
    accepted,
    waitlisted,
    score,
    feedback: accepted
      ? 'Partners liked your clarity — welcome to the batch.'
      : waitlisted
        ? 'Promising — partners want one more month of clarity. Reapply next month.'
        : 'Add more detail to your answers and try again.'
  };
}

export async function scoreInterview(state, answers) {
  const questions = (await loadInterviewQuestions()).questions ?? [];
  const payload = {
    companyName: state.company.name,
    category: state.company.categoryLabel,
    lifetimeRevenue: state.finance.lifetimeRevenue,
    answers: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      answer: String(answers[q.id] ?? '').trim()
    }))
  };

  if (shouldUseNarrativeAi()) {
    try {
      const res = await requestNarrative('startup_xc_interview_score', payload);
      if (res?.accepted !== undefined || res?.waitlisted !== undefined) {
        const accepted = Boolean(res.accepted);
        const waitlisted = Boolean(res.waitlisted) && !accepted;
        return {
          accepted,
          waitlisted,
          score: Number(res.score) || 70,
          feedback: String(res.feedback || 'Decision rendered.')
        };
      }
      if (res?.text) {
        return parseScoreJson(res.text);
      }
    } catch {
      /* fallback */
    }
  }

  return scoreInterviewOffline(answers);
}

function parseScoreJson(text) {
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      const accepted = Boolean(parsed.accepted);
      return {
        accepted,
        waitlisted: Boolean(parsed.waitlisted) && !accepted,
        score: Number(parsed.score) || 70,
        feedback: String(parsed.feedback || 'Decision rendered.')
      };
    }
  } catch {
    /* fall through */
  }
  return scoreInterviewOffline({});
}

export function beginResidency(state) {
  state.xc = state.xc ?? createInitialXcState();
  state.xc.residencyMonthsRemaining = 3;
  state.xc.batchLabel = `Batch ${formatCalendarMonth(state.calendar.year, state.calendar.monthIndex, 'short')}`;
  state.company.location = 'San Francisco (XC batch)';
  state.finance.fixedCostsMonthly = 6_000;
  state.flags.xcResidencyComplete = false;
  state.flags.xcBatchActive = true;
  state.stage = STAGES.XC;
  state.product.buzz = (state.product.buzz ?? 0) + 4;
  state.product.level = (state.product.level ?? 0) + 2;
}

/** Schedule batch for next calendar month (acceptance is immediate; batch starts then). */
export function completeXcAcceptance(state) {
  const result = applyXCSafe(state);
  if (!result.ok) return result;
  state.xc = state.xc ?? createInitialXcState();
  state.xc.batchStartsTurn = calendarTurn(state) + 1;
  state.flags.xcBatchActive = false;
  const start = xcBatchStartLabel(state);
  return { ok: true, xcShares: result.xcShares, batchStarts: start };
}

/** Call at the start of each month before dealing tasks. */
export function maybeStartScheduledXcBatch(state) {
  if (!state.flags?.xcAccepted || state.flags?.xcBatchActive || state.flags?.xcResidencyComplete) {
    return null;
  }
  const start = state.xc?.batchStartsTurn;
  if (start == null) return null;
  if (calendarTurn(state) < start) return null;
  beginResidency(state);
  return state.xc.batchLabel;
}

/** Call at month end while in residency. */
export function tickXcResidency(state) {
  if (!isInResidency(state)) return [];
  const lines = [];
  state.xc.residencyMonthsRemaining = Math.max(0, (state.xc.residencyMonthsRemaining ?? 0) - 1);
  lines.push(`XC batch month complete — ${state.xc.residencyMonthsRemaining} left in San Francisco.`);
  if (state.xc.residencyMonthsRemaining <= 0) {
    state.flags.xcResidencyComplete = true;
    state.flags.xcBatchActive = false;
    state.xc.graduateBoostMonths = 8;
    state.product.buzz = (state.product.buzz ?? 0) + 3;
    state.product.level = (state.product.level ?? 0) + 2;
    restorePostXcWorkspace(state);
    lines.push('Batch finished — alumni boost active for 8 months. Close seed when you have a small office.');
  }
  return lines;
}

export function tickXcGraduateBoost(state) {
  if ((state.xc?.graduateBoostMonths ?? 0) <= 0) return;
  state.xc.graduateBoostMonths -= 1;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function renderInterviewForm(container, state) {
  if (!container) return;
  const data = await loadInterviewQuestions();
  const questions = [...(data.questions ?? [])];
  if (state?.xc?.needsFollowUpQuestion && data.followUpQuestions?.length) {
    questions.push(data.followUpQuestions[0]);
  }
  const fields = questions
    .map(
      (q) => `
      <label for="xc-${q.id}">${escapeHtml(q.prompt)}</label>
      <p class="fine-print">${escapeHtml(q.hint)}</p>
      <textarea id="xc-${q.id}" name="${q.id}" rows="3" maxlength="600" required></textarea>
    `
    )
    .join('');

  container.innerHTML = `
    <p class="panel-lede">Partner office hours — short answers, real effort. If accepted, you join the batch <strong>next month</strong> (3-month program).</p>
    <form id="xc-interview-form" class="setup-form">${fields}
      <button type="submit" class="btn btn-primary">Submit application</button>
      <button type="button" class="btn btn-ghost" id="btn-xc-interview-cancel">Cancel</button>
    </form>
    <p id="xc-interview-feedback" class="desk-feedback" hidden></p>
  `;
}

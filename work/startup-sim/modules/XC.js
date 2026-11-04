import { assetBaseUrl } from './utils.js';
import { applyXCSafe } from './CapTable.js';
import { requestNarrative, shouldUseNarrativeAi } from './NarrativeApi.js';
import bundledInterview from '../data/xc-interview.json' with { type: 'json' };

let interviewCache = bundledInterview;

export async function loadInterviewQuestions() {
  try {
    const res = await fetch(`${assetBaseUrl()}data/xc-interview.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        interviewCache = data;
      }
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
    needsFollowUpQuestion: false
  };
}

export function calendarTurn(state) {
  const year = state.calendar?.year ?? 1;
  const month = state.calendar?.monthIndex ?? 1;
  return (year - 1) * 12 + month;
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

export function isInResidency(state) {
  return Boolean(state.flags?.xcAccepted && !state.flags?.xcResidencyComplete);
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
  state.xc.batchLabel = `Batch ${state.calendar.year}-${state.calendar.monthIndex}`;
  state.company.location = 'San Francisco (XC batch)';
  state.finance.fixedCostsMonthly = 6_000;
  state.flags.xcResidencyComplete = false;
}

export function completeXcAcceptance(state) {
  const result = applyXCSafe(state);
  if (!result.ok) return result;
  beginResidency(state);
  return result;
}

/** Call at month end while in residency. */
export function tickXcResidency(state) {
  if (!isInResidency(state)) return [];
  const lines = [];
  state.xc.residencyMonthsRemaining = Math.max(0, (state.xc.residencyMonthsRemaining ?? 0) - 1);
  lines.push(`XC batch month complete — ${state.xc.residencyMonthsRemaining} left in San Francisco.`);
  if (state.xc.residencyMonthsRemaining <= 0) {
    state.flags.xcResidencyComplete = true;
    lines.push('Batch finished — choose your permanent hub on the Finance tab.');
  }
  return lines;
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
    <p class="panel-lede">Partner office hours — short answers, real effort. They reward clarity, not buzzwords.</p>
    <form id="xc-interview-form" class="setup-form">${fields}
      <button type="submit" class="btn btn-primary">Submit application</button>
      <button type="button" class="btn btn-ghost" id="btn-xc-interview-cancel">Cancel</button>
    </form>
    <p id="xc-interview-feedback" class="desk-feedback" hidden></p>
  `;
}

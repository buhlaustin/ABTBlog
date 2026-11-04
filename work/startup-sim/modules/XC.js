import { assetBaseUrl } from './utils.js';
import { applyXCSafe } from './CapTable.js';
import { requestNarrative, isNarrativeApiEnabled } from './NarrativeApi.js';

let interviewCache = null;

export async function loadInterviewQuestions() {
  if (interviewCache) return interviewCache;
  try {
    const res = await fetch(`${assetBaseUrl()}data/xc-interview.json`, { cache: 'no-store' });
    interviewCache = await res.json();
  } catch {
    interviewCache = { questions: [] };
  }
  return interviewCache;
}

export function createInitialXcState() {
  return {
    residencyMonthsRemaining: 0,
    batchLabel: null
  };
}

export function canStartInterview(state) {
  return Boolean(state.flags?.xcUnlocked && !state.flags?.xcAccepted);
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
  return {
    accepted,
    score,
    feedback: accepted
      ? 'Partners liked your clarity — welcome to the batch.'
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

  if (isNarrativeApiEnabled()) {
    try {
      const res = await requestNarrative('startup_xc_interview_score', payload);
      if (res?.accepted !== undefined) {
        return {
          accepted: Boolean(res.accepted),
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
      return {
        accepted: Boolean(parsed.accepted),
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

export async function renderInterviewForm(container) {
  if (!container) return;
  const { questions } = await loadInterviewQuestions();
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
    <p class="panel-lede">X Combinator partner office — short answers. Scoring is forgiving; this is a game.</p>
    <form id="xc-interview-form" class="setup-form">${fields}
      <button type="submit" class="btn btn-primary">Submit application</button>
      <button type="button" class="btn btn-ghost" id="btn-xc-interview-cancel">Cancel</button>
    </form>
    <p id="xc-interview-feedback" class="desk-feedback" hidden></p>
  `;
}

import { requestNarrative, isNarrativeApiEnabled } from './NarrativeApi.js';
import { buildGameSnapshot } from './GameContext.js';

const MAX_HISTORY = 12;

export function createInitialAdvisor() {
  return {
    messages: [],
    pending: false
  };
}

function offlineAdvisorReply(state) {
  const snap = buildGameSnapshot(state);
  const tips = [];
  if (snap.runwayMonths != null && snap.runwayMonths < 4) {
    tips.push('Runway is tight — finish Desk tasks that pay cash this month before hiring.');
  }
  if (!state.flags?.xcAccepted && snap.lifetimeRevenue >= 400_000) {
    tips.push('You are approaching XC unlock — bank tasks that spike lifetime revenue.');
  }
  if (state.staff && totalPendingDraft(state) > totalFinal(state)) {
    tips.push('You raised draft headcount but have not finalized — payroll still uses last finalized counts.');
  }
  if (!tips.length) {
    tips.push('Close the month only after all counted tasks — overhead hits at month end.');
  }
  return tips.join(' ');
}

function totalFinal(state) {
  return Object.values(state.staff?.headcountByDept ?? {}).reduce((a, b) => a + b, 0);
}

function totalPendingDraft(state) {
  return Object.values(state.staff?.draftHeadcountByDept ?? {}).reduce((a, b) => a + b, 0);
}

export async function sendAdvisorMessage(state, userText) {
  const text = String(userText ?? '').trim();
  if (!text) return { ok: false, reason: 'Ask something.' };
  if (!state.advisor) state.advisor = createInitialAdvisor();
  if (state.advisor.pending) return { ok: false, reason: 'Advisor is thinking…' };

  state.advisor.messages.push({ role: 'user', content: text.slice(0, 500) });
  state.advisor.pending = true;

  let reply = offlineAdvisorReply(state);

  if (isNarrativeApiEnabled()) {
    try {
      const context = {
        snapshot: buildGameSnapshot(state),
        messages: state.advisor.messages.slice(-MAX_HISTORY),
        rules:
          'You are the founder chief of staff in Startup Simulator. Suggest in-game actions only. Not real financial advice. Under 120 words.'
      };
      const res = await requestNarrative('startup_advisor_chat', context);
      if (res?.reply) reply = String(res.reply).slice(0, 600);
      else if (res?.text) reply = String(res.text).slice(0, 600);
    } catch {
      /* offline */
    }
  }

  state.advisor.messages.push({ role: 'assistant', content: reply });
  state.advisor.messages = state.advisor.messages.slice(-MAX_HISTORY);
  state.advisor.pending = false;
  return { ok: true, reply };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderAdvisorPanel(container, state) {
  if (!container) return;
  if (!state.advisor) state.advisor = createInitialAdvisor();
  const api = isNarrativeApiEnabled() ? 'AI chief of staff' : 'Offline tips mode';

  const msgs = (state.advisor.messages ?? [])
    .map(
      (m) =>
        `<div class="advisor-msg advisor-${m.role}"><span class="advisor-role">${m.role === 'user' ? 'You' : 'Chief of staff'}</span><p>${escapeHtml(m.content)}</p></div>`
    )
    .join('');

  container.innerHTML = `
    <p class="panel-lede">${api} — knows your cash, stage, tasks, and headlines.</p>
    <div class="advisor-log">${msgs || '<p class="fine-print">Ask what to focus on this month.</p>'}</div>
    <form id="advisor-form" class="setup-form">
      <textarea id="advisor-input" rows="2" maxlength="400" placeholder="What should we prioritize?"></textarea>
      <button type="submit" class="btn btn-primary btn-small" ${state.advisor.pending ? 'disabled' : ''}>Ask</button>
    </form>
    <p class="fine-print">Game guidance only — not real investment or legal advice.</p>
  `;
}

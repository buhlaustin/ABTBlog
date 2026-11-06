import { escapeHtml, panelStatCard, panelMetricGrid } from './PanelChrome.js';

/** Brief popup after completing an optional board task. */
export function openBoardTaskOutcomeDialog({
  title,
  sentimentDelta,
  sentimentAfter,
  buzzDelta,
  mandateBonus,
  stockPct,
  happinessDelta,
  isMeeting
}) {
  const dialog = document.getElementById('board-outcome-dialog');
  const body = document.getElementById('board-outcome-body');
  if (!dialog || !body) return Promise.resolve();

  const delta = Number(sentimentDelta) || 0;
  const deltaLabel = delta === 0 ? 'No change' : delta > 0 ? `+${delta}` : String(delta);
  const deltaTone = delta > 0 ? 'pos' : delta < 0 ? 'neg' : null;
  const buzzLine =
    buzzDelta > 0
      ? `<p class="fine-print">Product buzz +${buzzDelta} from the board’s network.</p>`
      : '';
  const mandateLine =
    mandateBonus > 0
      ? `<p class="fine-print positive">Lead director ask fulfilled — bonus +${mandateBonus} approval.</p>`
      : '';
  const stockLine =
    stockPct != null && stockPct !== 0
      ? `<p class="fine-print">Public stock ${stockPct > 0 ? '+' : ''}${Math.round(Number(stockPct) * 100)}% on the read-through.</p>`
      : '';
  const happinessLine =
    happinessDelta != null && happinessDelta !== 0
      ? `<p class="fine-print">Personal happiness ${happinessDelta} from CEO time in the room.</p>`
      : '';

  body.innerHTML = `
    <p class="eyebrow">${isMeeting ? 'Board meeting held' : 'Board task complete'}</p>
    <h2 id="board-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    <div class="dialog-metric-panel">${panelMetricGrid('2', [
      panelStatCard('Board approval', `${deltaLabel}${delta !== 0 ? ' pts' : ''}`, { tone: deltaTone }),
      panelStatCard('New score', `${sentimentAfter}/100`)
    ])}</div>
    ${buzzLine}
    ${mandateLine}
    ${stockLine}
    ${happinessLine}
    <p class="fine-print">Board approval gates follow-on rounds after Series A.</p>
  `;

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
    return new Promise((resolve) => {
      const done = () => {
        dialog.removeEventListener('close', done);
        resolve();
      };
      dialog.addEventListener('close', done);
    });
  }
  dialog.hidden = false;
  return Promise.resolve();
}

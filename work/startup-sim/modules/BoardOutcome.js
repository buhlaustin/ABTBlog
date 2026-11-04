function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Brief popup after completing an optional board task. */
export function openBoardTaskOutcomeDialog({ title, sentimentDelta, sentimentAfter, buzzDelta }) {
  const dialog = document.getElementById('board-outcome-dialog');
  const body = document.getElementById('board-outcome-body');
  if (!dialog || !body) return Promise.resolve();

  const deltaLabel =
    sentimentDelta >= 0 ? `+${sentimentDelta}` : String(sentimentDelta);
  const buzzLine =
    buzzDelta > 0
      ? `<p class="fine-print">Product buzz +${buzzDelta} from the board’s network.</p>`
      : '';

  body.innerHTML = `
    <p class="eyebrow">Board task complete</p>
    <h2 id="board-outcome-title" class="month-summary-title">${escapeHtml(title)}</h2>
    <div class="summary-grid">
      <div><span class="stat-label">Board approval</span><span class="stat-value positive">${deltaLabel} pts</span></div>
      <div><span class="stat-label">New score</span><span class="stat-value">${sentimentAfter}/100</span></div>
    </div>
    ${buzzLine}
    <p class="fine-print">Board approval is your investor sentiment score — it gates follow-on rounds.</p>
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

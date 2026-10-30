import { escapeHtml } from './utils.js';
import { METERS, METER_LABELS } from './GameState.js';

export class UIManager {
  constructor() {
    this.root = document.getElementById('app');
    this.screens = {
      setup: document.getElementById('screen-setup'),
      game: document.getElementById('screen-game'),
      end: document.getElementById('screen-end')
    };
    this.meterEls = Object.fromEntries(
      METERS.map((k) => [k, document.getElementById(`meter-${k}`)])
    );
    this.emailCard = document.getElementById('email-card');
    this.feed = document.getElementById('story-feed');
    this.dayLabel = document.getElementById('day-label');
    this.progressLabel = document.getElementById('email-progress');
    this.choiceButtons = [
      document.getElementById('choice-a'),
      document.getElementById('choice-b')
    ];
    this.toastEl = document.getElementById('toast');
    this.ceoNameInput = document.getElementById('ceo-name');
    this.endSummary = document.getElementById('end-summary');
    this.endTitle = document.getElementById('end-title');
  }

  showSetup() {
    this._screen('setup');
  }

  showGame() {
    this._screen('game');
  }

  showEnd(won) {
    this._screen('end');
    this.endTitle.textContent = won ? 'You survived… for now' : 'You\'ve been ousted';
  }

  _screen(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      if (el) el.hidden = key !== name;
    }
  }

  renderMeters(meters, flash = null) {
    for (const key of METERS) {
      const wrap = this.meterEls[key];
      if (!wrap) continue;
      const val = Math.round(meters[key]);
      const fill = wrap.querySelector('.meter-fill');
      const label = wrap.querySelector('.meter-value');
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, val))}%`;
      if (label) label.textContent = `${val}%`;
      wrap.classList.toggle('meter-danger', val <= 15 || val >= 85);
      wrap.classList.toggle('meter-flash', flash === key);
    }
    if (flash) {
      setTimeout(() => {
        const wrap = this.meterEls[flash];
        if (wrap) wrap.classList.remove('meter-flash');
      }, 600);
    }
  }

  setDay(day, index, total) {
    if (this.dayLabel) this.dayLabel.textContent = `Day ${day}`;
    if (this.progressLabel) {
      this.progressLabel.textContent = total > 0 ? `Email ${index + 1} of ${total}` : 'Loading inbox…';
    }
  }

  renderEmail(email) {
    if (!this.emailCard || !email) return;
    this.emailCard.innerHTML = `
      <div class="email-meta">
        <span class="email-from">${escapeHtml(email.from)}</span>
        <span class="email-priority">URGENT</span>
      </div>
      <h2 class="email-subject">${escapeHtml(email.subject)}</h2>
      <p class="email-body">${escapeHtml(email.body)}</p>
    `;
  }

  bindChoices(handler) {
    this.choiceButtons.forEach((btn, i) => {
      if (!btn) return;
      btn.onclick = () => handler(i);
    });
  }

  setChoices(labels, enabled = true) {
    this.choiceButtons.forEach((btn, i) => {
      if (!btn) return;
      btn.textContent = labels[i] || '…';
      btn.disabled = !enabled || !labels[i];
    });
  }

  appendFeed(text, type = 'narrative') {
    if (!this.feed) return;
    const el = document.createElement('div');
    el.className = `feed-entry feed-${type}`;
    el.innerHTML = text;
    this.feed.prepend(el);
    while (this.feed.children.length > 30) {
      this.feed.lastElementChild?.remove();
    }
  }

  clearFeed() {
    if (this.feed) this.feed.innerHTML = '';
  }

  showToast(msg) {
    if (!this.toastEl) return;
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('visible');
    setTimeout(() => this.toastEl.classList.remove('visible'), 2600);
  }

  setEndSummary(html) {
    if (this.endSummary) this.endSummary.innerHTML = html;
  }
}

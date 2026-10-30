/**
 * Executive Email Roulette — Reigns-style corporate inbox triage.
 */

import { GameState, METER_LABELS, METERS } from './modules/GameState.js';
import { pickLocalInbox, pickReaction } from './modules/EmailDeck.js';
import {
  fetchAiDailyInbox,
  fetchOusterLine,
  initNarrativeApiUrl,
  isNarrativeApiEnabled
} from './modules/NarrativeApi.js';
import { StorageManager } from './modules/Storage.js';
import { UIManager } from './modules/UI.js';
import { escapeHtml } from './modules/utils.js';

class ExecutiveEmailRoulette {
  constructor() {
    this.state = null;
    this.ui = new UIManager();
    this.loadingInbox = false;
    this._bindSetup();
  }

  _bindSetup() {
    document.getElementById('btn-start')?.addEventListener('click', () => {
      const name = this.ui.ceoNameInput?.value.trim() || 'Interim CEO';
      void this.startNewGame(name);
    });
    document.getElementById('btn-load')?.addEventListener('click', () => this.loadGame());
    document.getElementById('btn-save')?.addEventListener('click', () => this.saveGame());
    document.getElementById('btn-restart')?.addEventListener('click', () => {
      StorageManager.clear();
      this.ui.showSetup();
    });
    this.ui.bindChoices((i) => this.pickChoice(i));
    this.ui.showSetup();
  }

  async startNewGame(ceoName) {
    await initNarrativeApiUrl();
    this.state = new GameState({ ceoName });
    this.state.aiEnabled = isNarrativeApiEnabled();
    this.ui.clearFeed();
    this.ui.showGame();
    if (this.state.aiEnabled) {
      this.ui.appendFeed('AI inbox generation is <strong>on</strong>.', 'system');
    }
    await this.loadDayInbox();
  }

  loadGame() {
    const data = StorageManager.loadRaw();
    if (!data) {
      this.ui.showToast('No save found.');
      return;
    }
    this.state = GameState.fromJSON(data);
    this.ui.clearFeed();
    this.ui.showGame();
    this.render();
    if (this.state.gameOver) {
      void this.endGame(false);
      return;
    }
    if (this.state.isDayComplete()) {
      void this.finishDay();
    } else if (this.state.inbox.length === 0) {
      void this.loadDayInbox();
    } else {
      this.showCurrentEmail();
    }
  }

  saveGame() {
    if (!this.state) return;
    if (StorageManager.save(this.state)) {
      this.ui.showToast('Saved.');
    } else {
      this.ui.showToast('Save failed.');
    }
  }

  async loadDayInbox() {
    if (!this.state || this.loadingInbox) return;
    this.loadingInbox = true;
    this.ui.setChoices(['Loading…', 'Loading…'], false);
    this.ui.setDay(this.state.day, 0, 5);
    this.ui.renderEmail({
      subject: 'Syncing inbox…',
      from: 'Executive Assistant · Auto',
      body: 'Pulling today’s crises onto your desk.'
    });

    try {
      let emails = null;
      if (this.state.aiEnabled) {
        emails = await fetchAiDailyInbox(this.state);
      }
      if (!emails?.length) {
        emails = pickLocalInbox(this.state.day, this.state.recentSubjects);
        if (this.state.aiEnabled) {
          this.ui.appendFeed('Using local inbox (AI unavailable).', 'warning');
        }
      } else {
        this.ui.appendFeed(`Day ${this.state.day} inbox generated.`, 'ai');
      }

      this.state.setInbox(emails);
      this.render();
      this.showCurrentEmail();
    } catch (err) {
      console.error('loadDayInbox failed', err);
      this.state.setInbox(pickLocalInbox(this.state.day, this.state.recentSubjects));
      this.ui.appendFeed('Inbox failed to load — showing offline scenarios.', 'warning');
      this.render();
      this.showCurrentEmail();
    } finally {
      this.loadingInbox = false;
    }
  }

  showCurrentEmail() {
    const email = this.state.currentEmail();
    if (!email) {
      void this.finishDay();
      return;
    }
    this.ui.setDay(this.state.day, this.state.emailIndex, this.state.inbox.length);
    this.ui.renderEmail(email);
    this.ui.setChoices(email.choices.map((c) => c.label), true);
  }

  pickChoice(index) {
    if (!this.state || this.state.gameOver || this.loadingInbox) return;

    const result = this.state.applyChoice(index);
    if (!result) return;

    const { choice, fail } = result;
    const flash = METERS.find((k) => (choice.effects[k] ?? 0) !== 0) || null;
    this.ui.renderMeters(this.state.meters, flash);

    const deltaLines = METERS.filter((k) => choice.effects[k])
      .map((k) => {
        const d = choice.effects[k];
        const sign = d > 0 ? '+' : '';
        return `${METER_LABELS[k]} ${sign}${d}`;
      })
      .join(' · ');

    this.ui.appendFeed(
      `<strong>You:</strong> ${escapeHtml(choice.label)}${deltaLines ? `<br><span class="muted">${escapeHtml(deltaLines)}</span>` : ''}`,
      'choice'
    );
    this.ui.appendFeed(escapeHtml(pickReaction()), 'narrative');

    if (fail) {
      void this.endGame(false);
      return;
    }

    if (this.state.isDayComplete()) {
      void this.finishDay();
    } else {
      this.showCurrentEmail();
    }
  }

  async finishDay() {
    if (this.state.gameOver) return;

    this.ui.appendFeed(
      `<strong>Day ${this.state.day} cleared.</strong> The board pretends to sleep.`,
      'success'
    );
    this.ui.setChoices(['…', '…'], false);

    await new Promise((r) => setTimeout(r, 900));
    this.state.startNextDay();
    await this.loadDayInbox();
  }

  async endGame(survived) {
    this.state.gameOver = true;
    StorageManager.clear();

    let headline = '';
    if (!survived && this.state.failedMeter) {
      const meter = METER_LABELS[this.state.failedMeter];
      const dir = this.state.ousterReason === 'bottomed_out' ? 'collapsed' : 'spiked';
      headline = `${meter} ${dir}. The board accepts your resignation “effective immediately.”`;
      const aiLine = await fetchOusterLine(this.state);
      if (aiLine) headline = aiLine;
    }

    const days = this.state.day;
    this.ui.setEndSummary(`
      <p>${escapeHtml(headline || `You survived ${days} day(s) of executive roulette.`)}</p>
      <ul class="end-stats">
        ${METERS.map((k) => `<li>${METER_LABELS[k]}: ${Math.round(this.state.meters[k])}%</li>`).join('')}
      </ul>
      <p class="muted">Emails processed: ${this.state.history.length}</p>
    `);
    this.ui.showEnd(survived);
  }

  render() {
    if (!this.state) return;
    this.ui.renderMeters(this.state.meters);
    this.ui.setDay(
      this.state.day,
      this.state.emailIndex,
      this.state.inbox.length || 5
    );
  }
}

new ExecutiveEmailRoulette();

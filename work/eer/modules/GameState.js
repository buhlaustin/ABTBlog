import { clamp } from './utils.js';

export const METERS = ['stock', 'board', 'morale', 'cash'];

export const METER_LABELS = {
  stock: 'Stock Price',
  board: 'Board Approval',
  morale: 'Employee Morale',
  cash: 'Cash Runway'
};

const DEFAULT_METERS = { stock: 50, board: 50, morale: 50, cash: 50 };

export class GameState {
  constructor({ ceoName = 'Interim CEO' } = {}) {
    this.ceoName = ceoName;
    this.day = 1;
    this.meters = { ...DEFAULT_METERS };
    this.inbox = [];
    this.emailIndex = 0;
    this.gameOver = false;
    this.ousterReason = null;
    this.failedMeter = null;
    this.history = [];
    this.recentSubjects = [];
    this.aiEnabled = false;
  }

  reset(ceoName) {
    this.ceoName = ceoName || this.ceoName;
    this.day = 1;
    this.meters = { ...DEFAULT_METERS };
    this.inbox = [];
    this.emailIndex = 0;
    this.gameOver = false;
    this.ousterReason = null;
    this.failedMeter = null;
    this.history = [];
    this.recentSubjects = [];
  }

  setInbox(emails) {
    this.inbox = emails.slice(0, 5);
    this.emailIndex = 0;
    for (const e of this.inbox) {
      if (e.subject) this.recentSubjects.push(e.subject);
    }
    this.recentSubjects = this.recentSubjects.slice(-20);
  }

  currentEmail() {
    return this.inbox[this.emailIndex] ?? null;
  }

  applyChoice(choiceIndex) {
    const email = this.currentEmail();
    if (!email || this.gameOver) return null;
    const choice = email.choices[choiceIndex];
    if (!choice) return null;

    const before = { ...this.meters };
    for (const key of METERS) {
      this.meters[key] += choice.effects[key] ?? 0;
    }

    const fail = METERS.find((k) => this.meters[k] <= 0 || this.meters[k] >= 100);
    if (fail) {
      this.gameOver = true;
      this.failedMeter = fail;
      this.ousterReason = this.meters[fail] <= 0 ? 'bottomed_out' : 'maxed_out';
    } else {
      for (const key of METERS) {
        this.meters[key] = clamp(this.meters[key], 1, 99);
      }
    }

    this.history.push({
      day: this.day,
      subject: email.subject,
      choice: choice.label,
      effects: choice.effects,
      before,
      after: { ...this.meters }
    });

    this.emailIndex += 1;
    return { choice, fail, email };
  }

  isDayComplete() {
    return this.emailIndex >= this.inbox.length && this.inbox.length > 0;
  }

  startNextDay() {
    this.day += 1;
    this.inbox = [];
    this.emailIndex = 0;
  }

  toJSON() {
    return {
      ceoName: this.ceoName,
      day: this.day,
      meters: { ...this.meters },
      inbox: this.inbox,
      emailIndex: this.emailIndex,
      gameOver: this.gameOver,
      ousterReason: this.ousterReason,
      failedMeter: this.failedMeter,
      history: this.history,
      recentSubjects: this.recentSubjects
    };
  }

  static fromJSON(data) {
    const s = new GameState({ ceoName: data.ceoName });
    Object.assign(s, data);
    s.meters = { ...DEFAULT_METERS, ...data.meters };
    return s;
  }
}

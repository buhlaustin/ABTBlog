import { Contestant } from './Contestant.js';
import {
  DIFFICULTY_CONFIG,
  generateAINames,
  pickRandom,
  shuffle,
  uid,
  resetIdCounter
} from './utils.js';

/** Calendar: Friday → Thursday (Big Brother–style week). */
export const WEEKDAYS = [
  'Friday',
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday'
];

/** Game phases within a week. */
export const PHASES = {
  SOCIAL: 'social',
  COMPETITION: 'competition',
  NOMINATION: 'nomination',
  VETO_COMP: 'veto_comp',
  VETO_CEREMONY: 'veto_ceremony',
  /** @deprecated saved games — mapped to VETO_CEREMONY on load */
  VETO: 'veto',
  EVICTION: 'eviction',
  WEEK_END: 'week_end'
};

export const PHASE_LABELS = {
  [PHASES.SOCIAL]: 'Social time in the house',
  [PHASES.COMPETITION]: 'Head of Household — live',
  [PHASES.NOMINATION]: 'Nomination ceremony',
  [PHASES.VETO_COMP]: 'Power of Veto — competition',
  [PHASES.VETO_CEREMONY]: 'Power of Veto — ceremony',
  [PHASES.VETO]: 'Power of Veto — ceremony',
  [PHASES.EVICTION]: 'Live eviction',
  [PHASES.WEEK_END]: 'Week summary'
};

export const ALLIANCE_MAX_SIZE = 3;

/**
 * Central game state: contestants, week progression, alliances, and history.
 */
export class GameState {
  constructor({
    playerName,
    difficulty = 'normal',
    aiCount = 10,
    castPreset = 'standard',
    doubleEvictionEnabled = true
  } = {}) {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty];
    this.castPreset = castPreset;
    this.doubleEvictionEnabled = doubleEvictionEnabled;
    this.week = 1;
    /** 0 = Friday … 6 = Thursday */
    this.weekdayIndex = 4;
    this.day = 5;
    this.phase = PHASES.SOCIAL;
    this.actionsRemaining = this.config.actionsPerDay;
    this.maxDaysPerWeek = 7;
    this.vetoHolderId = null;

    this.contestants = [];
    this.alliances = [];
    this.history = [];
    this.storyLog = [];

    this.currentHOH = null;
    this.nominees = [];
    this.vetoUsed = false;
    this.vetoReplacements = [];
    this.evictedThisWeek = null;
    this.competitionWinner = null;
    this.lastCompetitionType = null;
    this.currentCompetition = null;
    this.challengeData = null;
    this.playerIntel = []; // secrets player has learned
    this.gameOver = false;
    this.winner = null;

    this._initContestants(playerName, aiCount);
  }

  _initContestants(playerName, aiCount) {
    const aiNames = generateAINames(aiCount);
    const player = new Contestant({
      name: playerName || 'You',
      isPlayer: true,
      personality: { id: 'player', name: 'Player', strategy: 'custom' },
      stats: {
        loyalty: 6,
        intelligence: 6,
        social: 6 + this.config.playerSocialBonus,
        competition: 6,
        aggression: 4
      }
    });

    const aiContestants = aiNames.map((name) => new Contestant({
      name,
      difficultyBonus: this.config.aiStatBonus
    }));

    // Aggression modifier from difficulty
    for (const ai of aiContestants) {
      ai.aggression = Math.max(1, Math.min(10, ai.aggression + this.config.aiAggressionMod));
    }

    this.contestants = shuffle([player, ...aiContestants]);
    const all = this.contestants;
    for (const c of all) {
      c.initRelationships(all, this.config.startingTrust);
    }
  }

  getPlayer() {
    return this.contestants.find((c) => c.isPlayer);
  }

  getActiveContestants() {
    return this.contestants.filter((c) => !c.evicted);
  }

  getContestant(id) {
    return this.contestants.find((c) => c.id === id);
  }

  getOthers(contestant) {
    return this.getActiveContestants().filter((c) => c.id !== contestant.id);
  }

  addStory(text, type = 'narrative') {
    const entry = { text, type, week: this.week, day: this.day, phase: this.phase };
    this.storyLog.push(entry);
    return entry;
  }

  addHistory(event) {
    this.history.push({ ...event, week: this.week, day: this.day });
  }

  getWeekdayName() {
    return WEEKDAYS[this.weekdayIndex] ?? `Day ${this.weekdayIndex + 1}`;
  }

  syncPhaseForWeekday() {
    const map = {
      0: PHASES.COMPETITION,
      1: PHASES.NOMINATION,
      2: PHASES.VETO_COMP,
      3: PHASES.VETO_CEREMONY,
      4: PHASES.SOCIAL,
      5: PHASES.SOCIAL,
      6: PHASES.EVICTION
    };
    this.phase = map[this.weekdayIndex] ?? PHASES.SOCIAL;
    this.day = this.weekdayIndex + 1;
  }

  /** Advance Fri → … → Thu; week 1 skips from Wed to Fri (move-in). */
  advanceWeekday() {
    if (this.week === 1 && this.weekdayIndex === 5) {
      this.weekdayIndex = 0;
      this.syncPhaseForWeekday();
      return;
    }
    this.weekdayIndex += 1;
    if (this.weekdayIndex > 6) {
      this.weekdayIndex = 0;
    }
    this.syncPhaseForWeekday();
  }

  /** Alliances visible to the player (own alliance or exposed). */
  getVisibleAlliances(forPlayerId) {
    return this.alliances.filter(
      (a) => a.exposed || (forPlayerId && a.members.includes(forPlayerId))
    );
  }

  canJoinAlliance(allianceId, contestantId) {
    const alliance = this.alliances.find((a) => a.id === allianceId);
    if (!alliance) return { ok: false, reason: 'Alliance not found.' };
    if (alliance.members.includes(contestantId)) return { ok: true };
    if (alliance.members.length >= ALLIANCE_MAX_SIZE) {
      return { ok: false, reason: 'That alliance is full.' };
    }
    return { ok: true };
  }

  /** Create a new alliance (max 3 members). */
  createAlliance(leaderId, memberIds, name = null) {
    const members = [...new Set([leaderId, ...memberIds])];
    if (members.length > ALLIANCE_MAX_SIZE) {
      return null;
    }
    const alliance = {
      id: uid('alliance'),
      name: name || `Alliance ${this.alliances.length + 1}`,
      leaderId,
      members,
      trust: 70,
      exposed: false
    };
    this.alliances.push(alliance);
    for (const id of alliance.members) {
      const c = this.getContestant(id);
      if (c) c.allianceId = alliance.id;
    }
    return alliance;
  }

  /** Add member to existing alliance if room. */
  addAllianceMember(allianceId, contestantId) {
    const check = this.canJoinAlliance(allianceId, contestantId);
    if (!check.ok) return check;
    const alliance = this.alliances.find((a) => a.id === allianceId);
    const c = this.getContestant(contestantId);
    if (!alliance || !c) return { ok: false, reason: 'Could not add member.' };
    if (!alliance.members.includes(contestantId)) {
      alliance.members.push(contestantId);
    }
    c.allianceId = alliance.id;
    return { ok: true, alliance };
  }

  removeFromAlliance(contestantId) {
    const c = this.getContestant(contestantId);
    if (!c || !c.allianceId) return;
    const alliance = this.alliances.find((a) => a.id === c.allianceId);
    c.allianceId = null;
    if (alliance) {
      alliance.members = alliance.members.filter((id) => id !== contestantId);
      if (alliance.members.length < 2) {
        this.alliances = this.alliances.filter((a) => a.id !== alliance.id);
        for (const id of alliance.members) {
          const member = this.getContestant(id);
          if (member) member.allianceId = null;
        }
      }
    }
  }

  /** Recalculate threat for all active contestants. */
  updateThreatLevels() {
    for (const c of this.getActiveContestants()) {
      c.recalculateThreat(this);
    }
  }

  resetWeeklyFlags() {
    for (const c of this.getActiveContestants()) {
      c.isHOH = false;
      c.isNominated = false;
      c.hasVeto = false;
      c.votesReceived = 0;
    }
    this.nominees = [];
    this.vetoUsed = false;
    this.vetoReplacements = [];
    this.evictedThisWeek = null;
    this.competitionWinner = null;
    this.currentHOH = null;
  }

  advancePhase() {
    const order = [
      PHASES.SOCIAL,
      PHASES.COMPETITION,
      PHASES.NOMINATION,
      PHASES.VETO_COMP,
      PHASES.VETO_CEREMONY,
      PHASES.EVICTION,
      PHASES.WEEK_END
    ];
    const idx = order.indexOf(this.phase);
    if (idx < order.length - 1) {
      this.phase = order[idx + 1];
      return true;
    }
    return false;
  }

  startNewWeek() {
    this.week += 1;
    this.weekdayIndex = 0;
    this.vetoHolderId = null;
    this.actionsRemaining = this.config.actionsPerDay;
    this.resetWeeklyFlags();
    this.syncPhaseForWeekday();
  }

  checkWinCondition(allowFinalTwo = true) {
    const active = this.getActiveContestants();
    if (active.length === 1) {
      this.gameOver = true;
      this.winner = active[0];
      return true;
    }
    if (allowFinalTwo && active.length === 2) {
      const [a, b] = active;
      const scoreA = a.competition * 2 + a.social + a.reputation / 10;
      const scoreB = b.competition * 2 + b.social + b.reputation / 10;
      this.gameOver = true;
      this.winner = scoreA >= scoreB ? a : b;
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      difficulty: this.difficulty,
      castPreset: this.castPreset,
      doubleEvictionEnabled: this.doubleEvictionEnabled,
      week: this.week,
      weekdayIndex: this.weekdayIndex,
      day: this.day,
      phase: this.phase,
      vetoHolderId: this.vetoHolderId,
      actionsRemaining: this.actionsRemaining,
      maxDaysPerWeek: this.maxDaysPerWeek,
      contestants: this.contestants.map((c) => c.toJSON()),
      alliances: this.alliances,
      history: this.history,
      storyLog: this.storyLog,
      currentHOH: this.currentHOH?.id ?? this.currentHOH,
      nominees: this.nominees,
      vetoUsed: this.vetoUsed,
      vetoReplacements: this.vetoReplacements,
      evictedThisWeek: this.evictedThisWeek,
      competitionWinner: this.competitionWinner?.id ?? this.competitionWinner,
      lastCompetitionType: this.lastCompetitionType,
      currentCompetition: this.currentCompetition,
      challengeData: this.challengeData,
      playerIntel: this.playerIntel,
      gameOver: this.gameOver,
      winner: this.winner ? this.winner.id : null
    };
  }

  static fromJSON(data) {
    resetIdCounter(1000);
    const state = Object.create(GameState.prototype);
    state.difficulty = data.difficulty;
    state.config = DIFFICULTY_CONFIG[data.difficulty];
    state.castPreset = data.castPreset ?? 'standard';
    state.doubleEvictionEnabled = data.doubleEvictionEnabled ?? true;
    state.week = data.week;
    state.weekdayIndex =
      data.weekdayIndex ??
      (typeof data.day === 'number' ? Math.max(0, Math.min(6, data.day - 1)) : 4);
    state.day = data.day ?? state.weekdayIndex + 1;
    state.phase =
      data.phase === PHASES.VETO ? PHASES.VETO_CEREMONY : data.phase;
    state.vetoHolderId = data.vetoHolderId ?? null;
    state.actionsRemaining = data.actionsRemaining;
    state.maxDaysPerWeek = data.maxDaysPerWeek;
    state.contestants = data.contestants.map((c) => Contestant.fromJSON(c));
    state.alliances = data.alliances;
    state.history = data.history;
    state.storyLog = data.storyLog;
    state.currentHOH = data.currentHOH
      ? state.contestants.find((c) => c.id === data.currentHOH) || data.currentHOH
      : null;
    state.nominees = data.nominees;
    state.vetoUsed = data.vetoUsed;
    state.vetoReplacements = data.vetoReplacements;
    state.evictedThisWeek = data.evictedThisWeek;
    state.competitionWinner = data.competitionWinner
      ? state.contestants.find((c) => c.id === data.competitionWinner) || null
      : null;
    state.lastCompetitionType = data.lastCompetitionType;
    state.currentCompetition = data.currentCompetition || null;
    state.challengeData = data.challengeData || null;
    state.playerIntel = data.playerIntel;
    state.gameOver = data.gameOver;
    state.winner = data.winner ? state.contestants.find((c) => c.id === data.winner) : null;
    return state;
  }
}

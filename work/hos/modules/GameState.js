import { Contestant } from './Contestant.js';
import {
  DIFFICULTY_CONFIG,
  SAVE_VERSION,
  JURY_START_HOUSE_COUNT,
  aiCountForCast,
  generateAINames,
  pickRandom,
  shuffle,
  uid,
  resetIdCounter,
  totalCastSize
} from './utils.js';

/** Game phases within a week. */
export const PHASES = {
  SOCIAL: 'social',
  COMPETITION: 'competition',
  NOMINATION: 'nomination',
  VETO: 'veto',
  EVICTION: 'eviction',
  WEEK_END: 'week_end'
};

export const PHASE_LABELS = {
  [PHASES.SOCIAL]: 'Social Phase',
  [PHASES.COMPETITION]: 'Head of Household Competition',
  [PHASES.NOMINATION]: 'Nomination Ceremony',
  [PHASES.VETO]: 'Power of Veto',
  [PHASES.EVICTION]: 'Live Eviction',
  [PHASES.WEEK_END]: 'Week Summary'
};

export const FINALE_PHASES = {
  R1: 'r1',
  R2: 'r2',
  R3: 'r3',
  FINAL_PICK: 'final_pick',
  JURY_VOTE: 'jury_vote',
  COMPLETE: 'complete'
};

/**
 * Central game state: contestants, week progression, alliances, and history.
 */
export class GameState {
  constructor({
    playerName,
    difficulty = 'normal',
    aiCount = aiCountForCast('standard'),
    castPreset = 'standard',
    doubleEvictionEnabled = true
  } = {}) {
    this.saveVersion = SAVE_VERSION;
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty];
    this.castPreset = castPreset;
    this.startingCastSize = totalCastSize(aiCount);
    this.doubleEvictionEnabled = doubleEvictionEnabled;
    this.doubleEvictionUsed = false;
    this.doubleEvictionWeek = false;
    this.secondEvictionPending = false;

    this.week = 1;
    this.day = 1;
    this.phase = PHASES.SOCIAL;
    this.actionsRemaining = this.config.actionsPerDay;
    this.maxDaysPerWeek = 5;

    this.contestants = [];
    this.jury = [];
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
    this.playerIntel = [];
    this.gameOver = false;
    this.winner = null;

    this.finalePhase = null;
    this.finaleR1WinnerId = null;
    this.finaleR2WinnerId = null;
    this.finaleR3WinnerId = null;

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

  getJurors() {
    return this.jury
      .map((id) => this.getContestant(id))
      .filter((c) => c && c.isJuror);
  }

  /** First juror when 9 houseguests remain before this eviction. */
  shouldJoinJury(activeCountBeforeEviction) {
    return activeCountBeforeEviction <= JURY_START_HOUSE_COUNT;
  }

  processEviction(evicted, results) {
    if (!evicted || evicted.evicted) return;

    const activeBefore = this.getActiveContestants().length;
    evicted.evicted = true;
    evicted.evictedWeek = this.week;
    evicted.isNominated = false;
    evicted.isHOH = false;
    evicted.hasVeto = false;
    this.evictedThisWeek = evicted.id;

    if (this.shouldJoinJury(activeBefore)) {
      evicted.isJuror = true;
      if (!this.jury.includes(evicted.id)) {
        this.jury.push(evicted.id);
      }
      results.push({
        type: 'success',
        text: `${evicted.name} joins the jury.`
      });
    }

    this.removeFromAlliance(evicted.id);
    this.addHistory({ type: 'eviction', evicted: evicted.id, juror: evicted.isJuror });
    this.updateThreatLevels();
  }

  shouldScheduleDoubleEvictionWeek() {
    if (!this.doubleEvictionEnabled || this.doubleEvictionUsed) return false;
    return this.getActiveContestants().length <= 8;
  }

  planDoubleEvictionForWeek() {
    this.doubleEvictionWeek = this.shouldScheduleDoubleEvictionWeek();
  }

  enterFinale() {
    this.finalePhase = FINALE_PHASES.R1;
    this.phase = PHASES.COMPETITION;
    this.day = 6;
    for (const c of this.getActiveContestants()) {
      c.isHOH = false;
      c.isNominated = false;
    }
  }

  isInFinale() {
    return this.finalePhase != null && this.finalePhase !== FINALE_PHASES.COMPLETE;
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

  /** Create a new alliance. */
  createAlliance(leaderId, memberIds, name = null) {
    const alliance = {
      id: uid('alliance'),
      name: name || `Alliance ${this.alliances.length + 1}`,
      leaderId,
      members: [...new Set([leaderId, ...memberIds])],
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
      PHASES.VETO,
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
    this.day = 1;
    this.phase = PHASES.SOCIAL;
    this.actionsRemaining = this.config.actionsPerDay;
    this.resetWeeklyFlags();
  }

  checkWinCondition() {
    if (this.gameOver && this.winner) return true;
    const active = this.getActiveContestants();
    if (active.length === 1) {
      this.gameOver = true;
      this.winner = active[0];
      return true;
    }
    if (active.length === 3 && !this.isInFinale()) {
      return false;
    }
    if (active.length === 2 && this.finalePhase === FINALE_PHASES.JURY_VOTE) {
      return false;
    }
    return false;
  }

  needsFinaleStart() {
    return this.getActiveContestants().length === 3 && !this.isInFinale() && !this.gameOver;
  }

  toJSON() {
    return {
      saveVersion: SAVE_VERSION,
      difficulty: this.difficulty,
      castPreset: this.castPreset,
      startingCastSize: this.startingCastSize,
      doubleEvictionEnabled: this.doubleEvictionEnabled,
      doubleEvictionUsed: this.doubleEvictionUsed,
      doubleEvictionWeek: this.doubleEvictionWeek,
      secondEvictionPending: this.secondEvictionPending,
      jury: [...this.jury],
      finalePhase: this.finalePhase,
      finaleR1WinnerId: this.finaleR1WinnerId,
      finaleR2WinnerId: this.finaleR2WinnerId,
      finaleR3WinnerId: this.finaleR3WinnerId,
      week: this.week,
      day: this.day,
      phase: this.phase,
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
    state.saveVersion = data.saveVersion ?? 1;
    state.difficulty = data.difficulty;
    state.config = DIFFICULTY_CONFIG[data.difficulty];
    state.castPreset = data.castPreset ?? 'legacy';
    state.startingCastSize = data.startingCastSize ?? data.contestants?.length ?? 11;
    state.doubleEvictionEnabled = data.doubleEvictionEnabled ?? false;
    state.doubleEvictionUsed = data.doubleEvictionUsed ?? false;
    state.doubleEvictionWeek = data.doubleEvictionWeek ?? false;
    state.secondEvictionPending = data.secondEvictionPending ?? false;
    state.jury = data.jury ?? [];
    state.finalePhase = data.finalePhase ?? null;
    state.finaleR1WinnerId = data.finaleR1WinnerId ?? null;
    state.finaleR2WinnerId = data.finaleR2WinnerId ?? null;
    state.finaleR3WinnerId = data.finaleR3WinnerId ?? null;
    state.week = data.week;
    state.day = data.day;
    state.phase = data.phase;
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

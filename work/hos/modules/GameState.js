import { Contestant } from './Contestant.js';
import {
  addContestantToAlliance,
  getAllianceIds,
  removeContestantFromAlliance,
  sharesAllianceWith
} from './allianceUtils.js';
import {
  DIFFICULTY_CONFIG,
  JURY_START_HOUSE_COUNT,
  generateAINames,
  pickRandom,
  PERSONALITY_TYPES,
  shuffle,
  uid,
  resetIdCounter
} from './utils.js';
import { ensureEasyCastFloaters } from './floaterShields.js';
import { evaluateTwistsForNewWeek, initTwistSchedule, trackFirstEvicted } from './SeasonTwists.js';

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

/** Second power cycle on Double Eviction Thursday (stays on calendar Thursday). */
export const DOUBLE_EVICTION_ROUND2_PHASES = [
  PHASES.COMPETITION,
  PHASES.NOMINATION,
  PHASES.VETO_COMP,
  PHASES.VETO_CEREMONY,
  PHASES.EVICTION
];

/** Final 3: three HOH comps → Final HOH pick → Jury Q&A → jury vote. */
export const FINALE_PHASES = {
  INTRO: 'intro',
  R1: 'r1',
  R2: 'r2',
  R3: 'r3',
  FINAL_PICK: 'final_pick',
  JURY_QA: 'jury_qa',
  JURY_VOTE: 'jury_vote',
  COMPLETE: 'complete'
};

export const FINALE_PHASE_LABELS = {
  [FINALE_PHASES.INTRO]: 'Finale — Final 3',
  [FINALE_PHASES.R1]: 'Finale — HOH Part 1',
  [FINALE_PHASES.R2]: 'Finale — HOH Part 2',
  [FINALE_PHASES.R3]: 'Finale — HOH Part 3',
  [FINALE_PHASES.FINAL_PICK]: 'Finale — Final HOH decision',
  [FINALE_PHASES.JURY_QA]: 'Finale — Jury Q&A',
  [FINALE_PHASES.JURY_VOTE]: 'Finale — Jury vote',
  [FINALE_PHASES.COMPLETE]: 'Finale — Winner'
};

export { sharesAllianceWith, getAllianceIds, getContestantAlliances } from './allianceUtils.js';

/**
 * Central game state: contestants, week progression, alliances, and history.
 */
export class GameState {
  constructor({
    playerName,
    difficulty = 'normal',
    aiCount = 10,
    castPreset = 'standard',
    doubleEvictionEnabled = true,
    battleBackEnabled = false,
    mvpTwistEnabled = false
  } = {}) {
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty];
    this.castPreset = castPreset;
    this.doubleEvictionEnabled = doubleEvictionEnabled;
    this.battleBackEnabled = battleBackEnabled;
    this.mvpTwistEnabled = mvpTwistEnabled;
    this.week = 1;
    /** 0 = Friday … 6 = Thursday */
    this.weekdayIndex = 0;
    this.day = 1;
    this.phase = PHASES.SOCIAL;
    this.actionsRemaining = this.config.actionsPerDay;
    this.maxDaysPerWeek = 7;
    this.vetoHolderId = null;

    this.contestants = [];
    this.alliances = [];
    this.history = [];
    this.storyLog = [];

    /** Player threat at week open — for band panel week delta. */
    this.playerThreatWeekStart = null;
    this.playerThreatWeekSnapshotWeek = null;

    this.lastPawnShieldWeek = null;
    this.lastPawnShieldNomineeNames = [];
    this.lastPawnShieldNomineeIds = [];

    /** Intentionally tank the next comp the player enters (HOH or veto). */
    this.playerThrowCompetition = false;
    /** Player HOH backdoor replacement target id. */
    this.backdoorTargetId = null;
    this.backdoorPawnsLocked = false;

    this.currentHOH = null;
    this.nominees = [];
    this.vetoUsed = false;
    this.vetoSavedNomineeId = null;
    this.vetoReplacements = [];
    this.evictedThisWeek = null;
    this.competitionWinner = null;
    this.lastCompetitionType = null;
    this.currentCompetition = null;
    this.challengeData = null;
    this.playerIntel = []; // secrets player has learned
    this.gameOver = false;
    this.winner = null;
    /** True after HOH / noms / veto / eviction finishes for the current calendar day. */
    this.houseEventComplete = false;

    this.doubleEvictionSeasonUsed = false;
    this.doubleEvictionWeekActive = false;
    /** 1 = first eviction vote tonight; 2 = second cycle. */
    this.doubleEvictionRound = 1;
    this.doubleEvictionAwaitingRound2 = false;
    this.doubleEvictionRound2Cycle = false;
    this.doubleEvictionPendingNextPhase = null;

    this.battleBackSeasonUsed = false;
    this.battleBackWeekActive = false;
    this.battleBackScheduledWeek = null;
    this.battleBackResolvedTonight = false;
    this.firstEvictedId = null;

    this.mvpTwistSeasonUsed = false;
    this.mvpTwistWeekActive = false;
    this.mvpTwistScheduledWeek = null;
    this.mvpHolderId = null;
    this.mvpPowerAvailable = false;
    this.mvpRaceOpen = false;
    /** @type {Record<string, number>} */
    this.mvpCampaignPoints = {};
    this.mvpCampaignedToday = false;

    this.inFinale = false;
    this.finalePhase = null;
    this.finaleR1WinnerId = null;
    this.finaleR2WinnerId = null;
    this.finaleR3WinnerId = null;
    this.finalePartLosers = [];
    this.finaleAwaitingStep = null;
    this.finaleQAIndex = 0;
    /** Shuffled indices into JURY_QA_TEMPLATES for this finale. */
    this.finaleQAQuestionOrder = [];
    /** @type {Record<string, Record<string, number>>} jurorId → finalistId → vote sway */
    this.juryQAAdjustments = {};

    this._initContestants(playerName, aiCount);
    initTwistSchedule(this);

    this.syncPhaseForWeekday();
    this.houseEventComplete = false;
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

    const floaterType = PERSONALITY_TYPES.find((p) => p.id === 'floater');
    const aiContestants = aiNames.map((name) => {
      const personality = this.difficulty === 'easy' && floaterType && Math.random() < 0.22
        ? { ...floaterType }
        : null;
      return new Contestant({
        name,
        difficultyBonus: this.config.aiStatBonus,
        personality: personality || undefined
      });
    });

    // Aggression modifier from difficulty
    for (const ai of aiContestants) {
      ai.aggression = Math.max(1, Math.min(10, ai.aggression + this.config.aiAggressionMod));
    }

    this.contestants = shuffle([player, ...aiContestants]);
    ensureEasyCastFloaters(this.contestants, this.difficulty);
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

  /** Advance Fri → … → Thu (always includes eviction night). */
  advanceWeekday() {
    this.weekdayIndex += 1;
    if (this.weekdayIndex > 6) {
      this.weekdayIndex = 0;
    }
    this.houseEventComplete = false;
    this.syncPhaseForWeekday();
  }

  /** Active nominees on the block (excludes evicted / cleared flags). */
  getActiveNominees() {
    return this.nominees
      .map((id) => this.getContestant(id))
      .filter((c) => c && !c.evicted && c.isNominated);
  }

  /**
   * Heal saves that reached eviction night without HOH and/or two nominees
   * (e.g. Week 1 starting mid-week before this fix).
   */
  repairInvalidEvictionSchedule() {
    if (this.gameOver) return false;
    if (this.phase !== PHASES.EVICTION) return false;
    if (this.getActiveNominees().length >= 2) return false;

    this._scheduleRepaired = true;

    const hoh =
      this.currentHOH ||
      this.getActiveContestants().find((c) => c.isHOH) ||
      null;

    if (!hoh) {
      this.nominees = [];
      this.weekdayIndex = 0;
      this.houseEventComplete = false;
      this.syncPhaseForWeekday();
    } else {
      this.weekdayIndex = 1;
      this.houseEventComplete = false;
      this.phase = PHASES.NOMINATION;
      this.day = 2;
    }
    return true;
  }

  isScheduledHouseEventDay() {
    return this.phase !== PHASES.SOCIAL && this.phase !== PHASES.WEEK_END;
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
    return { ok: true };
  }

  /** Create a new distinct alliance (players can belong to several). */
  createAlliance(leaderId, memberIds, name = null) {
    const members = [...new Set([leaderId, ...memberIds])];
    if (members.length < 2) return null;
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
      if (c) addContestantToAlliance(c, alliance.id);
    }
    return alliance;
  }

  /** Add member to an existing alliance. */
  addAllianceMember(allianceId, contestantId) {
    const check = this.canJoinAlliance(allianceId, contestantId);
    if (!check.ok) return check;
    const alliance = this.alliances.find((a) => a.id === allianceId);
    const c = this.getContestant(contestantId);
    if (!alliance || !c) return { ok: false, reason: 'Could not add member.' };
    if (!alliance.members.includes(contestantId)) {
      alliance.members.push(contestantId);
    }
    addContestantToAlliance(c, alliance.id);
    return { ok: true, alliance };
  }

  removeFromAlliance(contestantId, allianceId = null) {
    const c = this.getContestant(contestantId);
    if (!c) return;
    const ids = allianceId ? [allianceId] : getAllianceIds(c);
    for (const aid of ids) {
      const alliance = this.alliances.find((a) => a.id === aid);
      removeContestantFromAlliance(c, aid);
      if (alliance) {
        alliance.members = alliance.members.filter((id) => id !== contestantId);
        if (alliance.members.length < 2) {
          this.alliances = this.alliances.filter((a) => a.id !== alliance.id);
          for (const id of alliance.members) {
            const member = this.getContestant(id);
            if (member) removeContestantFromAlliance(member, alliance.id);
          }
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
    this.vetoSavedNomineeId = null;
    this.vetoReplacements = [];
    this.evictedThisWeek = null;
    this.competitionWinner = null;
    this.currentHOH = null;
    this.backdoorTargetId = null;
    this.backdoorPawnsLocked = false;
    this.playerThrowCompetition = false;
  }

  /** Clear HOH/nom/veto for Double Eviction round 2 on the same Thursday. */
  resetPowerCycleForDoubleEvictionRound2() {
    for (const c of this.getActiveContestants()) {
      c.isHOH = false;
      c.isNominated = false;
      c.hasVeto = false;
      c.votesReceived = 0;
    }
    this.nominees = [];
    this.vetoUsed = false;
    this.vetoReplacements = [];
    this.vetoHolderId = null;
    this.competitionWinner = null;
    this.currentHOH = null;
    this.currentCompetition = null;
    this.challengeData = null;
  }

  evaluateDoubleEvictionWeek() {
    this.doubleEvictionWeekActive = false;
    this.doubleEvictionRound = 1;
    this.doubleEvictionAwaitingRound2 = false;
    this.doubleEvictionRound2Cycle = false;
    this.doubleEvictionPendingNextPhase = null;
    if (!this.doubleEvictionEnabled || this.doubleEvictionSeasonUsed) return;
    const remaining = this.getActiveContestants().length;
    if (remaining <= 8 && remaining > 3) {
      this.doubleEvictionWeekActive = true;
    }
  }

  getDoubleEvictionRound2NextPhase() {
    if (!this.doubleEvictionRound2Cycle) return null;
    const idx = DOUBLE_EVICTION_ROUND2_PHASES.indexOf(this.phase);
    if (idx < 0 || idx >= DOUBLE_EVICTION_ROUND2_PHASES.length - 1) return null;
    return DOUBLE_EVICTION_ROUND2_PHASES[idx + 1];
  }

  startDoubleEvictionRound2() {
    this.doubleEvictionRound = 2;
    this.doubleEvictionAwaitingRound2 = false;
    this.doubleEvictionRound2Cycle = true;
    this.doubleEvictionPendingNextPhase = null;
    this.doubleEvictionSeasonUsed = true;
    this.resetPowerCycleForDoubleEvictionRound2();
    this.weekdayIndex = 6;
    this.day = 7;
    this.phase = PHASES.COMPETITION;
    this.houseEventComplete = false;
  }

  finalizeDoubleEvictionWeek() {
    this.doubleEvictionWeekActive = false;
    this.doubleEvictionRound2Cycle = false;
    this.doubleEvictionAwaitingRound2 = false;
    this.doubleEvictionPendingNextPhase = null;
    this.doubleEvictionRound = 1;
  }

  shouldRunDoubleEvictionRound2() {
    return (
      this.doubleEvictionWeekActive
      && this.doubleEvictionRound === 1
      && !this.doubleEvictionAwaitingRound2
      && !this.doubleEvictionRound2Cycle
      && this.getActiveContestants().length > 2
    );
  }

  processEviction(evicted) {
    if (!evicted || evicted.evicted) return;
    evicted.evicted = true;
    evicted.evictedWeek = this.week;
    evicted.isNominated = false;
    evicted.isHOH = false;
    evicted.hasVeto = false;
    this.evictedThisWeek = evicted.id;
    this.addHistory({ type: 'eviction', evictedId: evicted.id });
    trackFirstEvicted(this, evicted);

    const remaining = this.getActiveContestants().length;
    if (remaining <= JURY_START_HOUSE_COUNT - 1) {
      evicted.isJuror = true;
    }

    this.nominees = this.nominees.filter((id) => id !== evicted.id);
    for (const c of this.contestants) {
      c.isNominated = this.nominees.includes(c.id);
    }
  }

  getJurors() {
    return this.contestants.filter((c) => c.evicted && c.isJuror);
  }

  addJuryQAAdjustment(jurorId, finalistId, delta) {
    if (!this.juryQAAdjustments[jurorId]) this.juryQAAdjustments[jurorId] = {};
    this.juryQAAdjustments[jurorId][finalistId] =
      (this.juryQAAdjustments[jurorId][finalistId] || 0) + delta;
  }

  getPhaseDisplayLabel() {
    if (this.inFinale && this.finalePhase) {
      return FINALE_PHASE_LABELS[this.finalePhase] || 'Finale';
    }
    if (this.doubleEvictionWeekActive || this.doubleEvictionAwaitingRound2 || this.doubleEvictionRound2Cycle) {
      const round = this.doubleEvictionRound;
      const phase = PHASE_LABELS[this.phase] || this.phase;
      if (this.doubleEvictionAwaitingRound2) {
        return `Double Eviction · Vote 1 complete`;
      }
      return `Double Eviction · Round ${round} · ${phase}`;
    }
    return PHASE_LABELS[this.phase] || this.phase;
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
    this.houseEventComplete = false;
    this.actionsRemaining = this.config.actionsPerDay;
    this.resetWeeklyFlags();
    this.syncPhaseForWeekday();
    this.evaluateDoubleEvictionWeek();
    evaluateTwistsForNewWeek(this);
    for (const c of this.getActiveContestants()) {
      if (c.threatOffset) {
        c.threatOffset = Math.round(c.threatOffset * 0.5);
        if (Math.abs(c.threatOffset) < 1) c.threatOffset = 0;
      }
    }
    this.updateThreatLevels();
    const player = this.getPlayer();
    this.playerThreatWeekStart = player?.threat ?? null;
    this.playerThreatWeekSnapshotWeek = this.week;
  }

  checkWinCondition() {
    const active = this.getActiveContestants();
    if (active.length === 1) {
      this.gameOver = true;
      this.winner = active[0];
      return true;
    }
    return false;
  }

  toJSON() {
    return {
      difficulty: this.difficulty,
      castPreset: this.castPreset,
      doubleEvictionEnabled: this.doubleEvictionEnabled,
      battleBackEnabled: this.battleBackEnabled,
      mvpTwistEnabled: this.mvpTwistEnabled,
      battleBackSeasonUsed: this.battleBackSeasonUsed,
      battleBackWeekActive: this.battleBackWeekActive,
      battleBackScheduledWeek: this.battleBackScheduledWeek,
      battleBackResolvedTonight: this.battleBackResolvedTonight,
      firstEvictedId: this.firstEvictedId,
      mvpTwistSeasonUsed: this.mvpTwistSeasonUsed,
      mvpTwistWeekActive: this.mvpTwistWeekActive,
      mvpTwistScheduledWeek: this.mvpTwistScheduledWeek,
      mvpHolderId: this.mvpHolderId,
      mvpPowerAvailable: this.mvpPowerAvailable,
      mvpRaceOpen: this.mvpRaceOpen,
      mvpCampaignPoints: this.mvpCampaignPoints,
      mvpCampaignedToday: this.mvpCampaignedToday,
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
      playerThreatWeekStart: this.playerThreatWeekStart,
      playerThreatWeekSnapshotWeek: this.playerThreatWeekSnapshotWeek,
      lastPawnShieldWeek: this.lastPawnShieldWeek,
      lastPawnShieldNomineeNames: this.lastPawnShieldNomineeNames,
      lastPawnShieldNomineeIds: this.lastPawnShieldNomineeIds,
      playerThrowCompetition: this.playerThrowCompetition,
      backdoorTargetId: this.backdoorTargetId,
      backdoorPawnsLocked: this.backdoorPawnsLocked,
      currentHOH: this.currentHOH?.id ?? this.currentHOH,
      nominees: this.nominees,
      vetoUsed: this.vetoUsed,
      vetoSavedNomineeId: this.vetoSavedNomineeId,
      vetoReplacements: this.vetoReplacements,
      evictedThisWeek: this.evictedThisWeek,
      competitionWinner: this.competitionWinner?.id ?? this.competitionWinner,
      lastCompetitionType: this.lastCompetitionType,
      currentCompetition: this.currentCompetition,
      challengeData: this.challengeData,
      playerIntel: this.playerIntel,
      gameOver: this.gameOver,
      winner: this.winner ? this.winner.id : null,
      houseEventComplete: this.houseEventComplete,
      doubleEvictionSeasonUsed: this.doubleEvictionSeasonUsed,
      doubleEvictionWeekActive: this.doubleEvictionWeekActive,
      doubleEvictionRound: this.doubleEvictionRound,
      doubleEvictionAwaitingRound2: this.doubleEvictionAwaitingRound2,
      doubleEvictionRound2Cycle: this.doubleEvictionRound2Cycle,
      doubleEvictionPendingNextPhase: this.doubleEvictionPendingNextPhase,
      inFinale: this.inFinale,
      finalePhase: this.finalePhase,
      finaleR1WinnerId: this.finaleR1WinnerId,
      finaleR2WinnerId: this.finaleR2WinnerId,
      finaleR3WinnerId: this.finaleR3WinnerId,
      finalePartLosers: this.finalePartLosers,
      finaleAwaitingStep: this.finaleAwaitingStep,
      finaleQAIndex: this.finaleQAIndex,
      finaleQAQuestionOrder: this.finaleQAQuestionOrder,
      juryQAAdjustments: this.juryQAAdjustments
    };
  }

  static fromJSON(data) {
    resetIdCounter(1000);
    const state = Object.create(GameState.prototype);
    state.difficulty = data.difficulty;
    state.config = DIFFICULTY_CONFIG[data.difficulty];
    state.castPreset = data.castPreset ?? 'standard';
    state.doubleEvictionEnabled = data.doubleEvictionEnabled ?? true;
    state.battleBackEnabled = data.battleBackEnabled ?? false;
    state.mvpTwistEnabled = data.mvpTwistEnabled ?? false;
    state.battleBackSeasonUsed = data.battleBackSeasonUsed ?? false;
    state.battleBackWeekActive = data.battleBackWeekActive ?? false;
    state.battleBackScheduledWeek = data.battleBackScheduledWeek ?? null;
    state.battleBackResolvedTonight = data.battleBackResolvedTonight ?? false;
    state.firstEvictedId = data.firstEvictedId ?? null;
    state.mvpTwistSeasonUsed = data.mvpTwistSeasonUsed ?? false;
    state.mvpTwistWeekActive = data.mvpTwistWeekActive ?? false;
    state.mvpTwistScheduledWeek = data.mvpTwistScheduledWeek ?? null;
    state.mvpHolderId = data.mvpHolderId ?? null;
    state.mvpPowerAvailable = data.mvpPowerAvailable ?? false;
    state.mvpRaceOpen = data.mvpRaceOpen ?? false;
    state.mvpCampaignPoints = data.mvpCampaignPoints ?? {};
    state.mvpCampaignedToday = data.mvpCampaignedToday ?? false;
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
    state.playerThreatWeekStart = data.playerThreatWeekStart ?? null;
    state.playerThreatWeekSnapshotWeek = data.playerThreatWeekSnapshotWeek ?? null;
    state.lastPawnShieldWeek = data.lastPawnShieldWeek ?? null;
    state.lastPawnShieldNomineeNames = data.lastPawnShieldNomineeNames ?? [];
    state.lastPawnShieldNomineeIds = data.lastPawnShieldNomineeIds ?? [];
    state.playerThrowCompetition = data.playerThrowCompetition ?? false;
    state.backdoorTargetId = data.backdoorTargetId ?? null;
    state.backdoorPawnsLocked = data.backdoorPawnsLocked ?? false;
    state.currentHOH = data.currentHOH
      ? state.contestants.find((c) => c.id === data.currentHOH) || data.currentHOH
      : null;
    state.nominees = data.nominees;
    state.vetoUsed = data.vetoUsed;
    state.vetoSavedNomineeId = data.vetoSavedNomineeId ?? null;
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
    state.houseEventComplete = data.houseEventComplete ?? false;
    state.doubleEvictionSeasonUsed = data.doubleEvictionSeasonUsed ?? false;
    state.doubleEvictionWeekActive = data.doubleEvictionWeekActive ?? false;
    state.doubleEvictionRound = data.doubleEvictionRound ?? 1;
    state.doubleEvictionAwaitingRound2 = data.doubleEvictionAwaitingRound2 ?? false;
    state.doubleEvictionRound2Cycle = data.doubleEvictionRound2Cycle ?? false;
    state.doubleEvictionPendingNextPhase = data.doubleEvictionPendingNextPhase ?? null;
    state.inFinale = data.inFinale ?? false;
    state.finalePhase = data.finalePhase ?? null;
    state.finaleR1WinnerId = data.finaleR1WinnerId ?? null;
    state.finaleR2WinnerId = data.finaleR2WinnerId ?? null;
    state.finaleR3WinnerId = data.finaleR3WinnerId ?? null;
    state.finalePartLosers = data.finalePartLosers ?? [];
    state.finaleAwaitingStep = data.finaleAwaitingStep ?? null;
    state.finaleQAIndex = data.finaleQAIndex ?? 0;
    state.finaleQAQuestionOrder = data.finaleQAQuestionOrder ?? [];
    state.juryQAAdjustments = data.juryQAAdjustments ?? {};
    state.repairInvalidEvictionSchedule();
    return state;
  }
}

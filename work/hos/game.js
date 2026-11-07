/**
 * House of Strategy — Main game controller.
 * Orchestrates the weekly loop: social → competition → nominations → veto → eviction.
 */

import { FinaleManager } from './modules/Finale.js';
import { FINALE_PHASES, GameState, PHASES, PHASE_LABELS } from './modules/GameState.js';
import { AIController } from './modules/AI.js';
import { COMPETITION_TYPES, CompetitionManager } from './modules/Competition.js';
import { NarrativeEngine } from './modules/Events.js';
import { EvictionSystem } from './modules/Eviction.js';
import { PlayerActions } from './modules/PlayerActions.js';
import { UIManager, setStorageRef } from './modules/UI.js';
import { StorageManager } from './modules/Storage.js';
import {
  fetchNarrativeBeat,
  initNarrativeApiUrl,
  isNarrativeApiEnabled
} from './modules/NarrativeApi.js';
import { buildDealIntel } from './modules/dealIntel.js';
import { getEvictionVoteDealWarning } from './modules/voteConsequences.js';
import { buildThreatBandOutlook, getThreatNominationAlert } from './modules/threatBands.js';
import { countCastFloaters } from './modules/floaterShields.js';
import { buildJuryOutlook } from './modules/juryOutlook.js';
import {
  computeBattleBackScores,
  finalizeMvpRace,
  getTwistRulesBanner,
  getTwistWeekAnnouncements,
  prepareBattleBack,
  resolveBattleBack,
  runBattleBack,
  tickMvpCampaignAI
} from './modules/SeasonTwists.js';
import {
  buildPlayerHohLens,
  formatHohNomIntelLine,
  getHohWatchBanner,
  getLocalNominationHostBeat,
  getNomTargetLensLabel,
  getPlayerHohPickerIntro
} from './modules/hohNomPersonas.js';
import { aiCountForCast, escapeHtml, randomInt, totalCastSize } from './modules/utils.js';

class Game {
  constructor() {
    this.state = null;
    this.ui = new UIManager();
    this.ai = null;
    this.competition = null;
    this.narrative = null;
    this.eviction = null;
    this.finale = null;
    this.playerActions = null;
    this.pendingAction = null;
    this.pendingChallenge = null;
    this._finaleQAPending = null;
    this._narrativeWarned = false;
    this._battleBackPrep = null;

    setStorageRef(StorageManager);
    this._bindSetupEvents();
  }

  _bindSetupEvents() {
    const { ui } = this;

    ui.elements.btnNewGame.addEventListener('click', () => {
      const name = ui.elements.playerNameInput.value.trim() || 'You';
      const difficulty = ui.elements.difficultySelect.value;
      const castPreset = ui.elements.castSelect?.value || 'standard';
      const doubleEvictionEnabled = ui.elements.doubleEvictionToggle?.checked ?? true;
      const battleBackEnabled = ui.elements.battleBackToggle?.checked ?? false;
      const mvpTwistEnabled = ui.elements.mvpTwistToggle?.checked ?? false;
      void this.startNewGame(
        name,
        difficulty,
        castPreset,
        doubleEvictionEnabled,
        battleBackEnabled,
        mvpTwistEnabled
      );
    });

    ui.elements.btnLoadGame.addEventListener('click', () => this.loadGame());
    ui.elements.btnSave.addEventListener('click', () => this.saveGame());
    ui.elements.btnMenu.addEventListener('click', () => this.returnToMenu());
    ui.elements.btnPlayAgain.addEventListener('click', () => {
      this._resetGame();
      ui.showSetup();
    });

    const refreshTwistCheat = () => {
      const map = [
        ['double-eviction', ui.elements.doubleEvictionToggle],
        ['twist-battle-back', ui.elements.battleBackToggle],
        ['twist-mvp', ui.elements.mvpTwistToggle]
      ];
      for (const [ruleId, input] of map) {
        const row = document.querySelector(`[data-twist-rule="${ruleId}"]`);
        if (row && input) {
          row.setAttribute('aria-disabled', input.checked ? 'false' : 'true');
        }
      }
    };
    for (const input of [
      ui.elements.doubleEvictionToggle,
      ui.elements.battleBackToggle,
      ui.elements.mvpTwistToggle
    ]) {
      input?.addEventListener('change', refreshTwistCheat);
    }
    refreshTwistCheat();

    ui.showSetup();
  }

  _resetGame() {
    this.state = null;
    this.ai = null;
    this.competition = null;
    this.narrative = null;
    this.eviction = null;
    this.finale = null;
    this.playerActions = null;
    this.pendingAction = null;
    this.pendingChallenge = null;
    this._finaleQAPending = null;
    window.__gameContestants = null;
    window.__gamePlayer = null;
  }

  async startNewGame(
    playerName,
    difficulty,
    castPreset = 'standard',
    doubleEvictionEnabled = true,
    battleBackEnabled = false,
    mvpTwistEnabled = false
  ) {
    this._resetGame();
    await initNarrativeApiUrl();

    const aiCount = aiCountForCast(castPreset);
    this.state = new GameState({
      playerName,
      difficulty,
      aiCount,
      castPreset,
      doubleEvictionEnabled,
      battleBackEnabled,
      mvpTwistEnabled
    });
    this._initSystems();
    this._exposeGlobals();

    const safeName = escapeHtml(playerName);
    const castSize = totalCastSize(aiCount);
    this.state.addStory({
      text: `Welcome to the House, <strong>${safeName}</strong>! ${castSize} houseguests are competing. Only one will win.`,
      type: 'success'
    });
    this.state.addStory({
      text: 'Week 1 begins <strong>Friday</strong>. Move-in mingling first — then the first Head of Household competition goes live tonight.',
      type: 'system'
    });
    this.state.addStory({
      text: 'Calendar: <strong>Fri</strong> HOH · <strong>Sat</strong> Nominations · <strong>Sun</strong> POV comp · <strong>Mon</strong> Veto meeting · <strong>Tue–Wed</strong> Strategy · <strong>Thu</strong> Eviction.',
      type: 'system'
    });
    if (difficulty === 'easy') {
      const floaters = countCastFloaters(this.state);
      if (floaters >= 2) {
        this.state.addStory({
          text: `Easy season: <strong>${floaters} Floaters</strong> in the house — AI HOHs may nominate pawn pairs to shield bigger threats.`,
          type: 'system'
        });
      }
    }
    if (isNarrativeApiEnabled()) {
      this.state.addStory({
        text: 'Enhanced host narration is <strong>on</strong> for this session.',
        type: 'system'
      });
      void this._appendAiNarrative('host_line');
    }

    this.ui.showGame();
    this.render();
    this.runPhase();
  }

  loadGame() {
    const data = StorageManager.loadRaw();
    if (!data) {
      this.ui.showToast('No save found.');
      return;
    }

    this._resetGame();
    this.state = GameState.fromJSON(data);
    this._initSystems();
    this.competition.restoreCompetition(data.currentCompetition, data.challengeData);
    this._exposeGlobals();
    this.ui.showGame();
    this.render();

    if (this.state.gameOver) {
      this.endGame();
      return;
    }

    if (this.state._scheduleRepaired) {
      this.logAndRender([
        {
          type: 'warning',
          text: 'Your save was stuck on eviction night without nominees. The calendar was adjusted so you can keep playing.'
        }
      ]);
    }

    this.runPhase();
    this.ui.showToast('Game loaded!');
  }

  saveGame() {
    if (!this.state) return;
    if (this.competition) {
      this.state.currentCompetition = this.competition.currentCompetition;
      this.state.challengeData = this.competition.challengeData;
    }
    if (StorageManager.save(this.state)) {
      this.ui.showToast('Game saved!');
    } else {
      this.ui.showToast('Save failed.');
    }
  }

  returnToMenu() {
    if (confirm('Return to menu? Unsaved progress will be lost.')) {
      this._resetGame();
      this.ui.showSetup();
    }
  }

  /** Final 3 triggers BB-style finale (3 comps + Q&A + jury vote). */
  _maybeTriggerFinale() {
    const n = this.state.getActiveContestants().length;
    if (n === 3 && !this.state.inFinale) {
      this._beginFinale();
      return true;
    }
    if (n <= 1) {
      this.state.checkWinCondition();
      if (this.state.gameOver) {
        this.endGame();
        return true;
      }
    }
    return false;
  }

  _initSystems() {
    this.ai = new AIController(this.state);
    this.competition = new CompetitionManager(this.state);
    this.narrative = new NarrativeEngine(this.state);
    this.eviction = new EvictionSystem(this.state, this.ai);
    this.finale = new FinaleManager(this.state, this.ai);
    this.playerActions = new PlayerActions(this.state);
  }

  _exposeGlobals() {
    window.__gameContestants = new Map(this.state.contestants.map((c) => [c.id, c]));
    window.__gamePlayer = this.state.getPlayer();
  }

  render() {
    const { state, ui } = this;
    ui.updateWeekDay(state.week, state.weekdayIndex, state.phase, state.getPhaseDisplayLabel());
    const twistParts = [getTwistRulesBanner(state)];
    const previewLeans = (hoh, limit) => this.ai.previewNominationLeans(hoh, limit);
    const hohWatch = getHohWatchBanner(state, previewLeans);
    if (hohWatch) twistParts.push(hohWatch);
    const threatAlert = getThreatNominationAlert(state, previewLeans);
    if (threatAlert) twistParts.push(threatAlert);
    ui.updateTwistBanner(twistParts.join(' · '));
    ui.renderStoryLog(state.storyLog);
    state.updateThreatLevels();
    ui.renderPlayer(state.getPlayer());
    ui.renderThreatBand(buildThreatBandOutlook(state, previewLeans));
    ui.renderHouseguests(state.contestants, state.getPlayer());
    ui.renderAlliances(state.alliances, state.getPlayer());
    const juryTwistNote = state.doubleEvictionWeekActive
      ? 'Double eviction this week — up to two new jurors may be seated after tonight.'
      : '';
    ui.renderDealIntelPanel(buildDealIntel(state));
    ui.renderJuryPanel(buildJuryOutlook(state), state.getPlayer(), juryTwistNote);
  }

  async _appendAiNarrative(kind) {
    const beat = await fetchNarrativeBeat(kind, this.state);
    if (beat) {
      this.logAndRender([{
        ...beat,
        type: 'ai-host',
        text: `<strong>Host:</strong> ${beat.text}`
      }]);
      return;
    }
    if (isNarrativeApiEnabled() && !this._narrativeWarned) {
      this._narrativeWarned = true;
      this.logAndRender([{
        type: 'warning',
        text: 'Host narration could not load (network or blocker). Local story continues.'
      }]);
    }
  }

  async _beginScheduledHouseDay() {
    if (isNarrativeApiEnabled()) {
      await this._appendAiNarrative('host_line');
    }
    this._runScheduledHouseEvent();
  }

  _runScheduledHouseEvent() {
    switch (this.state.phase) {
      case PHASES.COMPETITION:
        this.runCompetitionPhase();
        break;
      case PHASES.NOMINATION:
        void this.runNominationPhase();
        break;
      case PHASES.VETO_COMP:
        this.runVetoCompPhase();
        break;
      case PHASES.VETO_CEREMONY:
      case PHASES.VETO:
        this.runVetoCeremonyPhase();
        break;
      case PHASES.EVICTION:
        this.runEvictionPhase();
        break;
      default:
        this.runPhase();
        break;
    }
  }

  logAndRender(entries) {
    for (const entry of entries) {
      this.state.storyLog.push({
        ...entry,
        week: this.state.week,
        day: this.state.day,
        phase: this.state.phase
      });
    }
    this.ui.addStoryEntries(entries);
    this.render();
  }

  runPhase() {
    if (this.state.gameOver) {
      this.endGame();
      return;
    }

    const player = this.state.getPlayer();
    if (player.evicted && !this.state.gameOver) {
      this._spectateRemaining();
      return;
    }

    if (this.state.inFinale) {
      if (this._finaleQAPending) {
        this._showFinaleQAPicker();
        return;
      }
      if (this.state.finaleAwaitingStep) {
        this._showFinaleContinuePrompt(this.state.finaleAwaitingStep);
        return;
      }
    }

    if (this.state.doubleEvictionAwaitingRound2) {
      this._showDoubleEvictionBridgePrompt();
      return;
    }

    if (
      this.state.doubleEvictionRound2Cycle
      && this.state.doubleEvictionPendingNextPhase
      && this.state.houseEventComplete
    ) {
      this._showDoubleEvictionPhaseContinuePrompt(this.state.doubleEvictionPendingNextPhase);
      return;
    }

    if (this.state.isScheduledHouseEventDay() && !this.state.houseEventComplete) {
      this.runEventDaySocialPhase();
      return;
    }

    if (
      this.state.phase === PHASES.SOCIAL
      || (this.state.isScheduledHouseEventDay() && this.state.houseEventComplete)
    ) {
      this.runSocialPhase();
      return;
    }

    switch (this.state.phase) {
      case PHASES.SOCIAL:
        this.runSocialPhase();
        break;
      case PHASES.COMPETITION:
        this.runCompetitionPhase();
        break;
      case PHASES.NOMINATION:
        void this.runNominationPhase();
        break;
      case PHASES.VETO_COMP:
        this.runVetoCompPhase();
        break;
      case PHASES.VETO_CEREMONY:
      case PHASES.VETO:
        this.runVetoCeremonyPhase();
        break;
      case PHASES.EVICTION:
        this.runEvictionPhase();
        break;
      case PHASES.WEEK_END:
        void this.runWeekEnd();
        break;
      default:
        break;
    }
  }

  runSocialPhase() {
    const dayName = this.state.getWeekdayName();
    const phaseHint = this.state.isScheduledHouseEventDay() && this.state.houseEventComplete
      ? ` After ${dayName}'s ceremony, the house is still awake.`
      : '';
    this.ui.setActionPrompt(
      this.state.actionsRemaining > 0
        ? `What will you do? (${this.state.actionsRemaining} action${this.state.actionsRemaining > 1 ? 's' : ''} left today)${phaseHint}`
        : 'End the day to continue.'
    );

    const actions = this.playerActions.getAvailableActions();
    this.ui.renderActions(actions, (action) => this.handlePlayerAction(action));
  }

  runEventDaySocialPhase() {
    const dayName = this.state.getWeekdayName();
    const eventLabel = PHASE_LABELS[this.state.phase] || 'House event';
    const isMoveInHoh =
      this.state.week === 1
      && this.state.weekdayIndex === 0
      && this.state.phase === PHASES.COMPETITION;
    const deRound2 = this.state.doubleEvictionRound2Cycle && this.state.doubleEvictionRound === 2;
    const mingleLine = isMoveInHoh
      ? 'Move-in day — tour the house, meet the cast, and use your actions. When you\'re ready, start the first Head of Household competition.'
      : deRound2
        ? `Double Eviction Round 2 — ${eventLabel}. Read the latest in the feed, then start this live event when you're ready.`
        : `${dayName} — ${eventLabel}. Mingle in the house, then begin the live event when you're ready.`;
    this.ui.setActionPrompt(mingleLine);
    const liveEventLabel = isMoveInHoh
      ? 'Begin first HOH competition'
      : deRound2
        ? `Begin Round 2 — ${eventLabel.replace(' — live', '')}`
        : `Begin ${dayName} live event`;
    const actions = [
      {
        id: 'begin_house_event',
        label: liveEventLabel,
        description: isMoveInHoh ? 'Head of Household — live' : eventLabel
      }
    ];
    if (!deRound2) {
      actions.push(...this.playerActions.getAvailableActions());
    }
    this.ui.renderActions(actions, (action) => this.handlePlayerAction(action));
  }

  handlePlayerAction(action) {
    if (action.id === 'finale_continue') {
      void this._runFinaleStep(this.state.finaleAwaitingStep);
      return;
    }

    if (action.id.startsWith('finale_qa_')) {
      const choiceId = action.id.replace('finale_qa_', '');
      this._resolveFinalePlayerQAAnswer(choiceId);
      return;
    }

    if (action.id === 'de_round2_continue') {
      this.state.startDoubleEvictionRound2();
      this.logAndRender([
        {
          type: 'drama',
          text: '<strong>Double Eviction — Round 2</strong> begins. A new Head of Household will be crowned.'
        }
      ]);
      this.render();
      this.runEventDaySocialPhase();
      return;
    }

    if (action.id === 'de_round2_next_phase') {
      const next = this.state.doubleEvictionPendingNextPhase;
      if (!next) return;
      this.state.phase = next;
      this.state.doubleEvictionPendingNextPhase = null;
      this.state.houseEventComplete = false;
      this.render();
      this.runEventDaySocialPhase();
      return;
    }

    if (action.id === 'continue_day' || action.id === 'begin_house_event') {
      void this._beginScheduledHouseDay();
      return;
    }

    if (action.id === 'end_day') {
      this.advanceDay();
      return;
    }

    if (action.id === 'read_hoh') {
      this._runReadHohAction();
      return;
    }

    if (action.id === 'promise') {
      this._showPromiseTypePicker(action);
      return;
    }

    const needsTarget = [
      'talk',
      'befriend',
      'alliance',
      'expand_alliance',
      'spy',
      'break_promise',
      'campaign',
      'influence',
      'scheme_nom',
      'pregame',
      'comfort_nominee'
    ].includes(action.id);

    if (needsTarget) {
      this.pendingAction = action;
      let html;

      if (action.id === 'break_promise') {
        const promiseTargets = this.state.getPlayer().promises
          .filter((p) => p.kept === null)
          .map((p) => this.state.getContestant(p.targetId))
          .filter(Boolean);
        html = '<p>Choose whose promise to break:</p><div class="target-grid">';
        for (const t of promiseTargets) {
          html += `<button class="btn target-btn" data-target="${t.id}">${escapeHtml(t.name)}</button>`;
        }
        html += '</div>';
      } else if (action.id === 'expand_alliance') {
        const player = this.state.getPlayer();
        const mine = this.state.alliances.filter((a) => a.members.includes(player.id));
        html = '<p>Which alliance?</p><div class="target-grid">';
        for (const a of mine) {
          html += `<button class="btn target-btn" data-alliance="${a.id}">${escapeHtml(a.name)} (${a.members.length})</button>`;
        }
        html += '</div><button class="btn btn-ghost" data-cancel>Cancel</button>';
        this.ui.showActionDetail(html, null);
        this.ui.elements.actionDetail.querySelectorAll('[data-alliance]').forEach((btn) => {
          btn.addEventListener('click', () => {
            this.pendingAction = { ...action, allianceId: btn.dataset.alliance };
            const picker = this.ui.buildTargetPicker(
              this.state.contestants,
              `Invite someone into ${btn.textContent}`
            );
            this.ui.showActionDetail(
              picker.html + '<button class="btn btn-ghost" data-cancel>Cancel</button>',
              null
            );
            this.ui.elements.actionDetail.querySelectorAll('[data-target]').forEach((tbtn) => {
              tbtn.addEventListener('click', () => {
                this.pendingAction = null;
                this.executePlayerAction(action.id, tbtn.dataset.target, {
                  allianceId: btn.dataset.alliance
                });
              });
            });
          });
        });
        const cancel = this.ui.elements.actionDetail.querySelector('[data-cancel]');
        if (cancel) {
          cancel.addEventListener('click', () => {
            this.pendingAction = null;
            this.ui.hideActionDetail();
          });
        }
        return;
      } else {
        const picker = this.ui.buildTargetPicker(
          this.state.contestants,
          `Choose a target for: ${action.label}`
        );
        html = picker.html;
      }

      this.ui.showActionDetail(
        html + '<button class="btn btn-ghost" data-cancel>Cancel</button>',
        null
      );

      this.ui.elements.actionDetail.querySelectorAll('[data-target]').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.pendingAction = null;
          this.executePlayerAction(action.id, btn.dataset.target);
        });
      });

      const cancel = this.ui.elements.actionDetail.querySelector('[data-cancel]');
      if (cancel) {
        cancel.addEventListener('click', () => {
          this.pendingAction = null;
          this.ui.hideActionDetail();
        });
      }
      return;
    }

    this.executePlayerAction(action.id);
  }

  _showPromiseTypePicker(action) {
    const types = [
      { id: 'vote', label: 'Vote deal', desc: 'Pledge your eviction vote with them this week.' },
      { id: 'safety', label: 'Safety', desc: 'Promise not to nominate or vote against them while it stands.' },
      { id: 'loyalty', label: 'Loyalty', desc: 'Long-haul loyalty — harder to break without fallout.' }
    ];

    let html = '<p>What kind of deal?</p><div class="target-grid promise-type-grid">';
    for (const t of types) {
      html += `<button class="btn target-btn" data-promise-type="${t.id}" title="${escapeHtml(t.desc)}">${escapeHtml(t.label)}</button>`;
    }
    html += '</div><button class="btn btn-ghost" data-cancel>Cancel</button>';

    this.ui.showActionDetail(html);
    this.ui.setActionPrompt('Make a Promise — choose the deal type.');

    this.ui.elements.actionDetail.querySelectorAll('[data-promise-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const promiseType = btn.dataset.promiseType;
        const picker = this.ui.buildTargetPicker(
          this.state.contestants,
          'Who are you making this promise to?'
        );
        this.ui.showActionDetail(
          picker.html + '<button class="btn btn-ghost" data-cancel>Cancel</button>',
          null
        );
        this.ui.elements.actionDetail.querySelectorAll('[data-target]').forEach((tbtn) => {
          tbtn.addEventListener('click', () => {
            this.executePlayerAction(action.id, tbtn.dataset.target, { promiseType });
          });
        });
        const cancelInner = this.ui.elements.actionDetail.querySelector('[data-cancel]');
        cancelInner?.addEventListener('click', () => this.ui.hideActionDetail());
      });
    });

    const cancel = this.ui.elements.actionDetail.querySelector('[data-cancel]');
    if (cancel) {
      cancel.addEventListener('click', () => this.ui.hideActionDetail());
    }
  }

  executePlayerAction(actionId, targetId = null, extra = {}) {
    const result = this.playerActions.execute(actionId, targetId, {
      promiseType: extra.promiseType,
      allianceId: extra.allianceId
    });

    if (!result.success && result.text) {
      this.logAndRender([{ text: result.text, type: result.type || 'warning' }]);
      this.runSocialPhase();
      return;
    }

    this.ui.hideActionDetail();

    if (result.endDay) {
      this.advanceDay();
      return;
    }

    if (result.text) {
      this.logAndRender([{ text: result.text, type: result.type || 'narrative' }]);
    }

    this._exposeGlobals();

    if (this.state.actionsRemaining <= 0) {
      this.ui.setActionPrompt('No actions remaining. End the day.');
      this.ui.renderActions(
        [{ id: 'end_day', label: 'End Day', description: 'Proceed to next day.' }],
        (a) => this.handlePlayerAction(a)
      );
    } else {
      this.runSocialPhase();
    }
  }

  advanceDay() {
    if (this.state.inFinale) {
      this.ui.showToast('Finish the finale sequence before ending the day.');
      if (this.state.finaleAwaitingStep) {
        this._showFinaleContinuePrompt(this.state.finaleAwaitingStep);
      }
      return;
    }

    if (
      this.state.doubleEvictionAwaitingRound2
      || this.state.doubleEvictionRound2Cycle
    ) {
      this.ui.showToast('Finish Double Eviction night — use Continue between each live event.');
      if (this.state.doubleEvictionAwaitingRound2) {
        this._showDoubleEvictionBridgePrompt();
      }
      return;
    }

    if (this.state.isScheduledHouseEventDay() && !this.state.houseEventComplete) {
      this.ui.showToast('Begin today’s live house event before ending the day.');
      this.runEventDaySocialPhase();
      return;
    }

    this.ui.hideActionDetail();

    const aiEvents = this.ai.runSocialPhase();
    if (aiEvents.length > 0) {
      this.logAndRender(aiEvents);
    }

    if (this.state.mvpRaceOpen) {
      const mvpTicks = tickMvpCampaignAI(this.state);
      if (mvpTicks.length > 0) {
        this.logAndRender(mvpTicks);
      }
    }
    this.state.mvpCampaignedToday = false;

    const event = this.narrative.generateDailyEvent();
    if (event) {
      this.logAndRender([event]);
    }
    void this._appendAiNarrative('daily_beat');

    this.state.advanceWeekday();
    this.state.actionsRemaining = this.state.config.actionsPerDay;

    this.logAndRender([
      {
        type: 'system',
        text: `— ${this.state.getWeekdayName()} — ${PHASE_LABELS[this.state.phase] || ''}`
      }
    ]);
    this.render();
    this.runPhase();
  }

  _onHouseEventComplete() {
    this.state.houseEventComplete = true;
    this.state.actionsRemaining = this.state.config.actionsPerDay;

    const deNext = this.state.getDoubleEvictionRound2NextPhase();
    if (this.state.doubleEvictionRound2Cycle && deNext) {
      this.state.doubleEvictionPendingNextPhase = deNext;
      this.logAndRender([
        {
          type: 'system',
          text: `Double Eviction Round 2 — <strong>${PHASE_LABELS[this.state.phase]}</strong> is over. Review the feed, then continue when ready.`
        }
      ]);
      this.render();
      this._showDoubleEvictionPhaseContinuePrompt(deNext);
      return;
    }

    this.logAndRender([
      {
        type: 'system',
        text: 'The live event is over — the house is still buzzing. Use your actions before the day ends.'
      }
    ]);
    this.render();
    this.runSocialPhase();
  }

  _showDoubleEvictionBridgePrompt() {
    this.ui.hideActionDetail();
    this.ui.setActionPrompt(
      'Double Eviction Night — Round 1 is complete. Continue when you have read the vote breakdown above.'
    );
    this.ui.renderActions(
      [
        {
          id: 'de_round2_continue',
          label: 'Continue — Round 2 HOH competition',
          description: 'Round 2 runs as separate steps: HOH, nominations, POV, then a second eviction vote.'
        }
      ],
      (action) => this.handlePlayerAction(action)
    );
  }

  _showDoubleEvictionPhaseContinuePrompt(nextPhase) {
    this.ui.hideActionDetail();
    const label = PHASE_LABELS[nextPhase] || nextPhase;
    this.ui.setActionPrompt(`Double Eviction Round 2 paused — next: ${label}`);
    this.ui.renderActions(
      [
        {
          id: 'de_round2_next_phase',
          label: `Continue — ${label}`,
          description: 'Opens the next live event; nothing runs until you confirm.'
        }
      ],
      (action) => this.handlePlayerAction(action)
    );
  }

  // ─── Competition ─────────────────────────────────────────────────

  runCompetitionPhase() {
    const comp = this.competition.startCompetition();
    this.ui.setActionPrompt(`${comp.name} — Get ready!`);

    this.logAndRender([{
      type: 'competition',
      text: `<strong>${comp.name}</strong>: ${comp.description}`
    }]);

    const player = this.state.getPlayer();
    if (player.evicted) {
      this._resolveCompetitionAI();
      return;
    }

    if (['trivia', 'memory', 'logic', 'endurance'].includes(comp.id)) {
      this.pendingChallenge = this.competition.challengeData
        || this.competition.createChallengeData(comp);
      this.competition.challengeData = this.pendingChallenge;
      this._startPlayerCompetition(comp, this.pendingChallenge);
    } else {
      this._resolveCompetitionAI();
    }
  }

  _startPlayerCompetition(comp, challenge) {
    const challengeData = this.competition.getPlayerChallengeData(challenge.type, challenge.data);
    if (!challengeData) {
      this._resolveCompetitionAI();
      return;
    }

    let html = `<p>${escapeHtml(challengeData.prompt)}</p><div class="competition-choices">`;
    for (const choice of challengeData.choices) {
      const value = typeof choice.value === 'string' ? choice.value : String(choice.value);
      html += `<button class="btn btn-action competition-choice" data-value="${escapeHtml(value)}">${escapeHtml(choice.label)}</button>`;
    }
    html += '</div>';

    this.ui.showActionDetail(html);
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('.competition-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const raw = btn.dataset.value;
        let value = raw;
        if (raw === 'true') value = true;
        else if (raw === 'false') value = false;
        else if (/^\d+$/.test(raw)) value = parseInt(raw, 10);
        this._resolveCompetitionWithPlayerChoice(value);
      });
    });
  }

  _resolveCompetitionWithPlayerChoice(playerChoice) {
    this.ui.hideActionDetail();
    const challenge = this.pendingChallenge || this.competition.challengeData;
    const { winner, results } = this.competition.runCompetition(challenge, playerChoice, true);
    this.pendingChallenge = null;
    this.logAndRender(results);
    this._afterCompetition(winner);
  }

  _resolveCompetitionAI() {
    const { winner, results } = this.competition.runCompetition(null, null, true);
    this.pendingChallenge = null;
    this.logAndRender(results);
    this._afterCompetition(winner);
  }

  _afterCompetition(winner) {
    if (this._maybeTriggerFinale()) return;
    this._onHouseEventComplete();
  }

  // ─── Nominations ───────────────────────────────────────────────────

  async runNominationPhase() {
    if (this._maybeTriggerFinale()) return;

    const hoh = this.state.getActiveContestants().find((c) => c.isHOH);

    if (hoh?.isPlayer) {
      this.ui.setActionPrompt('You are HOH! Nominate two houseguests.');
      this._showNominationPicker();
      return;
    }

    const { results, nominees } = this.eviction.runNominations();
    this.logAndRender(results);
    await this._appendNominationHostBeat(hoh, nominees);
    this._onHouseEventComplete();
  }

  async _appendNominationHostBeat(hoh, nominees) {
    if (!hoh || !nominees?.length) return;
    this.state.nominationLeanNames = nominees.map((n) => n.name);
    const beat = await fetchNarrativeBeat('nomination_ceremony', this.state);
    this.state.nominationLeanNames = [];
    if (beat) {
      this.logAndRender([{
        ...beat,
        type: 'ai-host',
        text: `<strong>Host:</strong> ${beat.text}`
      }]);
      return;
    }
    const local = getLocalNominationHostBeat(hoh, nominees);
    if (local) this.logAndRender([local]);
  }

  _runReadHohAction() {
    const hoh = this.state.getActiveContestants().find((c) => c.isHOH && !c.isPlayer);
    const player = this.state.getPlayer();
    if (!hoh || player.evicted) return;

    if (this.state.actionsRemaining <= 0) {
      this.ui.showToast('No actions remaining today.');
      return;
    }

    const success = player.intelligence + randomInt(2, 10) > 10;
    this.state.actionsRemaining = Math.max(0, this.state.actionsRemaining - 1);

    if (!success) {
      this.logAndRender([{
        type: 'warning',
        text: `You read ${hoh.name} wrong — their poker face wins today.`
      }]);
      this.render();
      return;
    }

    const leans = this.ai.previewNominationLeans(hoh, 3);
    const lines = [
      { type: 'narrative', text: formatHohNomIntelLine(hoh) },
      ...leans.map((row, i) => ({
        type: i === 0 ? 'warning' : 'narrative',
        text: `#${i + 1} lean: <strong>${row.target.name}</strong> — ${row.reason}.`
      }))
    ];
    this.logAndRender(lines);
    this.state.playerIntel.push({
      week: this.state.week,
      about: hoh.id,
      text: `HOH lean: ${leans.map((r) => r.target.name).join(', ')}.`
    });
    this.render();
  }

  _showNominationPicker() {
    const player = this.state.getPlayer();
    const hohLens = buildPlayerHohLens(player);
    const targets = this.state.getOthers(player);
    let selected = [];

    const renderPicker = () => {
      let html = `<p class="hoh-nom-hint">${getPlayerHohPickerIntro(player)}</p>`;
      html += `<p>Select 2 nominees (${selected.length}/2):</p><div class="target-grid nomination-target-grid">`;
      for (const t of targets) {
        const isSelected = selected.includes(t.id);
        const lens = getNomTargetLensLabel(hohLens, t);
        const lensHtml = lens ? `<span class="nom-lens">${escapeHtml(lens)}</span>` : '';
        html += `<button class="btn target-btn ${isSelected ? 'selected' : ''}" data-target="${t.id}">${escapeHtml(t.name)}${lensHtml}</button>`;
      }
      html += `</div>`;
      if (selected.length === 2) {
        html += '<button class="btn btn-confirm" data-confirm>Confirm Nominations</button>';
      }
      this.ui.showActionDetail(html);

      this.ui.elements.actionDetail.querySelectorAll('[data-target]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.target;
          if (selected.includes(id)) {
            selected = selected.filter((s) => s !== id);
          } else if (selected.length < 2) {
            selected.push(id);
          }
          renderPicker();
        });
      });

      const confirm = this.ui.elements.actionDetail.querySelector('[data-confirm]');
      if (confirm) {
        confirm.addEventListener('click', () => {
          const picks = selected.map((id) => this.state.getContestant(id));
          const { results, nominees } = this.eviction.runNominations(picks);
          this.ui.hideActionDetail();
          this.logAndRender(results);
          void (async () => {
            await this._appendNominationHostBeat(hohLens, nominees);
            this._onHouseEventComplete();
          })();
        });
      }
    };

    renderPicker();
    this.ui.renderActions([], () => {});
  }

  // ─── Veto ──────────────────────────────────────────────────────────

  runVetoCompPhase() {
    const { playerInComp } = this.eviction.getVetoSetup();

    if (playerInComp && !this.state.getPlayer().evicted) {
      this._showVetoCompetition();
      return;
    }

    this._finishVetoComp(false);
  }

  runVetoCeremonyPhase() {
    const vetoWinner = this.state.vetoHolderId
      ? this.state.getContestant(this.state.vetoHolderId)
      : null;
    this._finishVetoCeremony(vetoWinner);
  }

  _showVetoCompetition() {
    this.ui.setActionPrompt('Power of Veto — compete to save a nominee!');
    const html = `<p>The veto competition is intense. Can you outlast the distractions?</p>
      <div class="competition-choices">
        <button class="btn btn-action competition-choice" data-value="true">Push through and win!</button>
        <button class="btn btn-action competition-choice" data-value="false">Play it safe</button>
      </div>`;
    this.ui.showActionDetail(html);
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('.competition-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const heldStrong = btn.dataset.value === 'true';
        const won = this.competition.resolveVetoCompetition(heldStrong);
        this.ui.hideActionDetail();
        this._finishVetoComp(won);
      });
    });
  }

  _finishVetoComp(playerWonVeto) {
    const result = this.eviction.runVetoCompetition(playerWonVeto);
    this.logAndRender(result.results);
    this._onHouseEventComplete();
  }

  _finishVetoCeremony(vetoWinner) {
    const result = this.eviction.runVetoCeremony(vetoWinner);
    this.logAndRender(result.results);

    if (result.needsPlayerInput && result.vetoWinner?.isPlayer) {
      this._showVetoChoice(result.vetoWinner);
      return;
    }

    if (result.needsReplacementPick) {
      this._showReplacementPicker();
      return;
    }

    this._onHouseEventComplete();
  }

  _showVetoChoice(vetoWinner) {
    const nominees = this.state.nominees.map((id) => this.state.getContestant(id)).filter(Boolean);
    let html = '<p>You won the Veto! Use it?</p><div class="target-grid">';
    for (const n of nominees) {
      html += `<button class="btn target-btn" data-veto-target="${n.id}">Save ${escapeHtml(n.name)}</button>`;
    }
    html += '<button class="btn btn-action" data-veto-skip">Don\'t use the Veto</button></div>';
    this.ui.showActionDetail(html);

    this.ui.elements.actionDetail.querySelectorAll('[data-veto-target]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const vetoResult = this.eviction.playerUseVeto(vetoWinner, btn.dataset.vetoTarget, true);
        this.ui.hideActionDetail();
        this.logAndRender(vetoResult.results);
        if (vetoResult.needsReplacementPick) {
          this._showReplacementPicker();
        } else {
          this._onHouseEventComplete();
        }
      });
    });

    const skip = this.ui.elements.actionDetail.querySelector('[data-veto-skip]');
    if (skip) {
      skip.addEventListener('click', () => {
        const vetoResult = this.eviction.playerUseVeto(vetoWinner, null, false);
        this.ui.hideActionDetail();
        this.logAndRender(vetoResult.results);
        this._onHouseEventComplete();
      });
    }
  }

  _showReplacementPicker() {
    const player = this.state.getPlayer();
    const hohLens = buildPlayerHohLens(player);
    const nominees = new Set(this.state.nominees);
    const targets = this.state.getOthers(player).filter((c) => !nominees.has(c.id));

    let html = `<p class="hoh-nom-hint">${getPlayerHohPickerIntro(player)}</p>`;
    html += '<p>Pick a replacement nominee:</p><div class="target-grid nomination-target-grid">';
    for (const t of targets) {
      const lens = getNomTargetLensLabel(hohLens, t);
      const lensHtml = lens ? `<span class="nom-lens">${escapeHtml(lens)}</span>` : '';
      html += `<button class="btn target-btn" data-replacement="${t.id}">${escapeHtml(t.name)}${lensHtml}</button>`;
    }
    html += '</div>';
    this.ui.showActionDetail(html);

    this.ui.elements.actionDetail.querySelectorAll('[data-replacement]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const results = this.eviction.playerPickReplacement(btn.dataset.replacement);
        this.ui.hideActionDetail();
        this.logAndRender(results);
        this._onHouseEventComplete();
      });
    });
  }

  // ─── Eviction ──────────────────────────────────────────────────────

  _startBattleBackComp() {
    this.competition.currentCompetition = COMPETITION_TYPES.find((c) => c.id === 'endurance');
    const challenge = this.competition.createChallengeData(this.competition.currentCompetition);
    const challengeData = this.competition.getPlayerChallengeData(challenge.type, challenge.data);
    if (!challengeData) {
      this._finishBattleBack(10);
      return;
    }

    let html = `<p><strong>Battle Back — Endurance segment.</strong> ${escapeHtml(challengeData.prompt)}</p><div class="competition-choices">`;
    for (const choice of challengeData.choices) {
      const value = typeof choice.value === 'string' ? choice.value : String(choice.value);
      html += `<button class="btn btn-action competition-choice" data-value="${escapeHtml(value)}">${escapeHtml(choice.label)}</button>`;
    }
    html += '</div>';

    this.ui.showActionDetail(html);
    this.ui.setActionPrompt('Battle Back competition — make your move.');
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('.competition-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const heldStrong = btn.dataset.value === 'true';
        this._finishBattleBack(heldStrong);
      });
    });
  }

  _finishBattleBack(heldStrong) {
    const prep = this._battleBackPrep;
    if (!prep) return;

    const player = this.state.getPlayer();
    let bonus = heldStrong ? 22 + randomInt(0, 8) : 6 + randomInt(0, 6);
    bonus += Math.floor(player.competition * 1.8);

    const scores = computeBattleBackScores(this.state, prep.competitors, bonus);
    const resolved = resolveBattleBack(this.state, prep.competitors, scores, true);
    this.state.battleBackResolvedTonight = true;
    this.ui.hideActionDetail();
    this.logAndRender([
      {
        type: 'competition',
        text: heldStrong
          ? 'You grit through every round — the house feels your comeback energy.'
          : 'You slip once, but you still post a respectable Battle Back score.'
      },
      ...resolved.results
    ]);
    this._battleBackPrep = null;
    this._afterBattleBack(resolved.reentered);
  }

  _afterBattleBack(reentered) {
    this.render();
    if (this.state.getActiveContestants().length <= 2) {
      this._onHouseEventComplete();
      return;
    }
    if (reentered?.isPlayer) {
      this.logAndRender([
        {
          type: 'success',
          text: 'You are back in the house. Eviction night continues — you can vote if you are not on the block.'
        }
      ]);
      this.render();
    }
    this.runEvictionPhase();
  }

  runEvictionPhase() {
    if (this._maybeTriggerFinale()) return;

    if (this._recoverFromInvalidEviction()) return;

    if (this.state.battleBackWeekActive && !this.state.battleBackResolvedTonight) {
      if (!this._battleBackPrep) {
        const prep = prepareBattleBack(this.state);
        this.logAndRender(prep.results);
        if (prep.skip) {
          this.state.battleBackResolvedTonight = true;
          this.state.battleBackSeasonUsed = true;
          this.state.battleBackWeekActive = false;
          this.render();
        } else if (prep.playerCompeting) {
          this._battleBackPrep = prep;
          this._startBattleBackComp();
          return;
        } else {
          const scores = computeBattleBackScores(this.state, prep.competitors);
          const resolved = resolveBattleBack(this.state, prep.competitors, scores, true);
          this.state.battleBackResolvedTonight = true;
          this.logAndRender(resolved.results);
          this._afterBattleBack(resolved.reentered);
          return;
        }
      }
      return;
    }

    if (this.state.mvpTwistWeekActive && this.state.mvpRaceOpen) {
      const mvpResults = finalizeMvpRace(this.state);
      if (mvpResults.length > 0) {
        this.logAndRender(mvpResults);
        this.render();
      }
    }

    if (this.state.doubleEvictionWeekActive && !this.state.houseEventComplete) {
      this.logAndRender([
        {
          type: 'warning',
          text: this.state.doubleEvictionRound === 2
            ? '<strong>Double Eviction — Vote 2</strong> A second houseguest leaves tonight.'
            : '<strong>Double Eviction — Vote 1</strong> The first houseguest leaves tonight; Round 2 follows after a pause.'
        }
      ]);
    }

    const player = this.state.getPlayer();

    if (!player.isNominated && !player.isHOH && !player.evicted) {
      this._showEvictionVote();
      return;
    }

    const { results, evicted } = this.eviction.runEvictionVote(null);
    this.logAndRender(results);
    this._afterEviction(evicted);
  }

  _recoverFromInvalidEviction() {
    if (this.state.getActiveNominees().length >= 2) return false;

    const hadHoh =
      this.state.currentHOH ||
      this.state.getActiveContestants().some((c) => c.isHOH);

    this.logAndRender([
      {
        type: 'warning',
        text: hadHoh
          ? 'Eviction night arrived without two nominees on the block. The schedule jumps to Saturday’s nomination ceremony.'
          : 'Eviction night arrived before a Head of Household was crowned. The week rewinds to Friday’s HOH competition.'
      }
    ]);

    this.state.repairInvalidEvictionSchedule();
    this.render();
    if (this.state.phase === PHASES.NOMINATION) {
      void this.runNominationPhase();
    } else {
      this.runPhase();
    }
    return true;
  }

  _showEvictionVote() {
    const nominees = this.state.getActiveNominees();
    if (nominees.length < 2) {
      this._recoverFromInvalidEviction();
      return;
    }
    const player = this.state.getPlayer();
    const mvpNote =
      this.state.mvpPowerAvailable && player.id === this.state.mvpHolderId
        ? '<p class="mvp-vote-hint"><strong>MVP power</strong> is active — your vote counts twice tonight.</p>'
        : '';
    let html = `${mvpNote}<p>Cast your vote to evict:</p><div class="target-grid nomination-target-grid">`;
    for (const n of nominees) {
      const warn = getEvictionVoteDealWarning(player, n);
      const warnHtml = warn
        ? `<span class="nom-lens deal-vote-warn">${escapeHtml(warn)}</span>`
        : '';
      html += `<button class="btn target-btn btn-danger" data-evict="${n.id}">${escapeHtml(n.name)}${warnHtml}</button>`;
    }
    html += '</div>';
    this.ui.showActionDetail(html);
    this.ui.setActionPrompt('Eviction Night — cast your vote!');
    this.ui.renderActions([], () => {});

    this.ui.elements.actionDetail.querySelectorAll('[data-evict]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const { results, evicted } = this.eviction.runEvictionVote(btn.dataset.evict);
        this.ui.hideActionDetail();
        this.logAndRender(results);
        this._afterEviction(evicted);
      });
    });
  }

  _afterEviction(evicted) {
    if (!evicted) {
      if (this._recoverFromInvalidEviction()) return;
      this._onHouseEventComplete();
      return;
    }

    if (this.state.getPlayer().evicted) {
      const remaining = this.state.getActiveContestants().length;
      if (remaining > 1) {
        this.logAndRender([{
          type: 'system',
          text: 'You may continue watching the house as a spectator...'
        }]);
        setTimeout(() => this._spectateRemaining(), 1500);
      } else {
        this.state.checkWinCondition();
        this.endGame();
      }
      return;
    }

    if (this.state.shouldRunDoubleEvictionRound2()) {
      this.state.doubleEvictionAwaitingRound2 = true;
      this.state.houseEventComplete = true;
      this.logAndRender([
        {
          type: 'drama',
          text: `<strong>${evicted.name}</strong> has left the house. Double Eviction Night continues — Round 2 (HOH, nominations, POV, eviction) is next.`
        },
        {
          type: 'system',
          text: 'Take a moment to read the vote results. Press <strong>Continue — Round 2 HOH competition</strong> when ready — each step runs separately.'
        }
      ]);
      this.render();
      this._showDoubleEvictionBridgePrompt();
      return;
    }

    if (this.state.doubleEvictionRound2Cycle || this.state.doubleEvictionWeekActive) {
      this.state.finalizeDoubleEvictionWeek();
    }

    if (this._maybeTriggerFinale()) {
      return;
    }

    this.state.phase = PHASES.WEEK_END;
    this.render();
    this.runPhase();
  }

  // ─── Week end ──────────────────────────────────────────────────────

  async runWeekEnd() {
    const active = this.state.getActiveContestants().length;

    this.logAndRender([{
      type: 'system',
      text: `Week ${this.state.week} is over. ${active} houseguests remain.`
    }]);

    if (isNarrativeApiEnabled()) {
      await this._appendAiNarrative('week_recap');
    }

    if (this.state.checkWinCondition()) {
      this.endGame();
      return;
    }

    this.state.startNewWeek();
    this.competition.currentCompetition = null;
    this.logAndRender([{
      type: 'success',
      text: `<strong>Week ${this.state.week}</strong> begins. The game is heating up.`
    }]);

    for (const entry of getTwistWeekAnnouncements(this.state)) {
      this.logAndRender([entry]);
    }

    this.render();
    this.runPhase();
  }

  _pushSpectateEntries(entries, phase) {
    this.state.storyLog.push(
      ...entries.map((r) => ({
        ...r,
        week: this.state.week,
        day: this.state.day,
        phase
      }))
    );
  }

  /** Spectator: run Round 2 as labeled steps (no single blur of all phases). */
  _spectateDoubleEvictionRound2() {
    this.state.startDoubleEvictionRound2();
    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Double Eviction Round 2: Head of Household ---' }],
      PHASES.COMPETITION
    );

    const comp = this.competition.runCompetition();
    this._pushSpectateEntries(comp.results, PHASES.COMPETITION);

    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Double Eviction Round 2: Nominations ---' }],
      PHASES.NOMINATION
    );
    const nomResults = this.eviction.runNominations();
    this._pushSpectateEntries(nomResults.results, PHASES.NOMINATION);

    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Double Eviction Round 2: Power of Veto ---' }],
      PHASES.VETO_COMP
    );
    const vetoComp = this.eviction.runVetoCompetition(false);
    this._pushSpectateEntries(vetoComp.results, PHASES.VETO_COMP);

    const vetoMeet = this.eviction.runVetoCeremony(vetoComp.vetoWinner);
    this._pushSpectateEntries(vetoMeet.results, PHASES.VETO_CEREMONY);

    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Double Eviction Round 2: Eviction vote ---' }],
      PHASES.EVICTION
    );
    const evictResults = this.eviction.runEvictionVote(null);
    this._pushSpectateEntries(evictResults.results, PHASES.EVICTION);

    this.state.finalizeDoubleEvictionWeek();
  }

  // ─── Spectator mode (player evicted) ───────────────────────────────

  _spectateRemaining() {
    while (!this.state.gameOver) {
      const activeCount = this.state.getActiveContestants().length;
      if (activeCount === 3) {
        this._spectateFinale();
        break;
      }
      if (activeCount <= 1) {
        this.state.checkWinCondition();
        break;
      }

      this.state.startNewWeek();
      this.competition.currentCompetition = null;

      const { results } = this.competition.runCompetition();
      this.state.storyLog.push(
        ...results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.COMPETITION
        }))
      );

      const nomResults = this.eviction.runNominations();
      this.state.storyLog.push(
        ...nomResults.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.NOMINATION
        }))
      );

      const vetoComp = this.eviction.runVetoCompetition(false);
      this.state.storyLog.push(
        ...vetoComp.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.VETO_COMP
        }))
      );

      const vetoMeet = this.eviction.runVetoCeremony(vetoComp.vetoWinner);
      this.state.storyLog.push(
        ...vetoMeet.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.VETO_CEREMONY
        }))
      );

      const evictResults = this.eviction.runEvictionVote(null);
      this.state.storyLog.push(
        ...evictResults.results.map((r) => ({
          ...r,
          week: this.state.week,
          day: this.state.day,
          phase: PHASES.EVICTION
        }))
      );

      if (this.state.shouldRunDoubleEvictionRound2()) {
        this._spectateDoubleEvictionRound2();
      }

      if (this.state.getActiveContestants().length === 3) {
        this._spectateFinale();
        break;
      }
    }

    this.render();
    if (!this.state.gameOver) {
      this.state.checkWinCondition();
    }
    this.endGame();
  }

  // ─── Finale (Final 3 → 3 HOH comps → pick → Jury Q&A → vote) ───

  _beginFinale() {
    this.state.inFinale = true;
    this.state.finalePhase = FINALE_PHASES.INTRO;
    this.state.juryQAAdjustments = {};
    this.state.finaleAwaitingStep = 'r1';
    this.logAndRender([
      {
        type: 'success',
        text: '<strong>Final 3!</strong> The last three houseguests fight for the last Head of Household.'
      },
      {
        type: 'system',
        text: 'Finale keeps all <strong>three</strong> HOH competitions, then Final HOH picks who to take to the Final 2, followed by <strong>Jury Q&A</strong> and the jury vote. Continue between each step.'
      }
    ]);
    this.render();
    this._showFinaleContinuePrompt('r1');
  }

  _showFinaleContinuePrompt(step) {
    const labels = {
      r1: 'Begin Final HOH — Part 1 (all three compete)',
      r2: 'Begin Final HOH — Part 2 (Round 1 losers)',
      r3: 'Begin Final HOH — Part 3 (Round 1 winner vs Round 2 winner)',
      final_pick: 'Begin Final HOH eviction decision',
      jury_qa: 'Begin Jury Q&A',
      jury_vote: 'Begin jury vote'
    };
    this.state.finaleAwaitingStep = step;
    this.ui.hideActionDetail();
    this.ui.setActionPrompt(`Finale paused — ${labels[step] || step}`);
    this.ui.renderActions(
      [
        {
          id: 'finale_continue',
          label: labels[step] || 'Continue finale',
          description: 'Runs the next live finale beat; nothing auto-skips.'
        }
      ],
      (action) => this.handlePlayerAction(action)
    );
  }

  async _runFinaleStep(step) {
    if (step === 'jury_qa_continue') {
      this.state.finaleAwaitingStep = null;
      this._runFinaleJuryQARound();
      return;
    }
    this.state.finaleAwaitingStep = null;
    switch (step) {
      case 'r1': {
        const { results, losers } = this.finale.runPart1();
        this.logAndRender(results);
        this.state.finalePartLosers = (losers || []).map((c) => c.id);
        this.state.finalePhase = FINALE_PHASES.R1;
        this._showFinaleContinuePrompt('r2');
        break;
      }
      case 'r2': {
        const losers = this.state.finalePartLosers
          .map((id) => this.state.getContestant(id))
          .filter((c) => c && !c.evicted);
        const { results } = this.finale.runPart2(losers);
        this.logAndRender(results);
        this.state.finalePhase = FINALE_PHASES.R2;
        this._showFinaleContinuePrompt('r3');
        break;
      }
      case 'r3': {
        const r1 = this.state.getContestant(this.state.finaleR1WinnerId);
        const r2 = this.state.getContestant(this.state.finaleR2WinnerId);
        const { results, finalHOH } = this.finale.runPart3(r1, r2);
        this.logAndRender(results);
        this.state.finalePhase = FINALE_PHASES.R3;
        if (finalHOH) {
          this._showFinaleContinuePrompt('final_pick');
        }
        break;
      }
      case 'final_pick':
        this._runFinaleFinalPick();
        break;
      case 'jury_qa':
        this._startFinaleJuryQA();
        break;
      case 'jury_vote':
        this._runFinaleJuryVote();
        break;
      default:
        break;
    }
    this.render();
  }

  _runFinaleFinalPick() {
    const finalHOH = this.state.getContestant(this.state.finaleR3WinnerId)
      || this.state.getActiveContestants().find((c) => c.isHOH);
    const candidates = this.state.getActiveContestants().filter((c) => c.id !== finalHOH?.id);
    if (!finalHOH || candidates.length !== 2) {
      this.logAndRender([{ type: 'warning', text: 'Final HOH decision could not run.' }]);
      return;
    }
    if (finalHOH.isPlayer) {
      this.ui.setActionPrompt('You won Final HOH! Evict one houseguest — the other sits next to you in the Final 2.');
      let html = '<p>Who do you evict?</p><div class="target-grid">';
      for (const t of candidates) {
        html += `<button class="btn target-btn btn-danger" data-final-evict="${t.id}">Evict ${escapeHtml(t.name)}</button>`;
      }
      html += '</div>';
      this.ui.showActionDetail(html);
      this.ui.renderActions([], () => {});
      this.ui.elements.actionDetail.querySelectorAll('[data-final-evict]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const { results } = this.finale.applyFinalPick(finalHOH, btn.dataset.finalEvict);
          this.ui.hideActionDetail();
          this.logAndRender(results);
          this.state.finalePhase = FINALE_PHASES.FINAL_PICK;
          this._showFinaleContinuePrompt('jury_qa');
          this.render();
        });
      });
      return;
    }
    const evict = this.finale.aiChooseEvictee(finalHOH, candidates);
    const { results } = this.finale.applyFinalPick(finalHOH, evict.id);
    this.logAndRender(results);
    this._showFinaleContinuePrompt('jury_qa');
  }

  _startFinaleJuryQA() {
    const begin = this.finale.beginJuryQA();
    this.logAndRender(begin.results);
    if (begin.skipQA) {
      this._showFinaleContinuePrompt('jury_vote');
      return;
    }
    if (!begin.ok) return;
    this._runFinaleJuryQARound();
  }

  _runFinaleJuryQARound() {
    const total = this.finale.getJuryQARoundCount();
    if (this.state.finaleQAIndex >= total) {
      this.logAndRender(this.finale.finishJuryQA());
      this.state.finalePhase = FINALE_PHASES.JURY_VOTE;
      this._showFinaleContinuePrompt('jury_vote');
      return;
    }
    const round = this.finale.runJuryQARound(this.state.finaleQAIndex);
    this.logAndRender(round.results);
    this._finaleQAPending = round;
    const playerFinalist = round.finalists?.find((f) => f.isPlayer);
    if (playerFinalist) {
      this._showFinaleQAPicker();
      return;
    }
    for (const finalist of round.finalists || []) {
      const choice = this.finale.aiPickQAResponse(finalist, round.template);
      this.logAndRender([
        this.finale.applyFinalistQAAnswer(round.juror, finalist, choice)
      ]);
    }
    this.state.finaleQAIndex += 1;
    this._finaleQAPending = null;
    this.state.finaleAwaitingStep = 'jury_qa_continue';
    this.ui.setActionPrompt(`Jury Q&A — question ${this.state.finaleQAIndex} of ${total} done. Continue to the next question.`);
    this.ui.renderActions(
      [{ id: 'finale_continue', label: 'Continue Jury Q&A', description: 'Next jury question.' }],
      (action) => this.handlePlayerAction(action)
    );
  }

  _showFinaleQAPicker() {
    const round = this._finaleQAPending;
    if (!round?.template) return;
    const player = this.state.getPlayer();
    let html = `<p><strong>Your answer:</strong> “${escapeHtml(round.template.prompt)}”</p><div class="target-grid">`;
    for (const choice of round.template.choices) {
      html += `<button class="btn target-btn" data-qa-choice="${choice.id}">${escapeHtml(choice.label)}</button>`;
    }
    html += '</div>';
    this.ui.showActionDetail(html);
    this.ui.renderActions([], () => {});
    this.ui.elements.actionDetail.querySelectorAll('[data-qa-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._resolveFinalePlayerQAAnswer(btn.dataset.qaChoice);
      });
    });
  }

  _resolveFinalePlayerQAAnswer(choiceId) {
    const round = this._finaleQAPending;
    if (!round) return;
    const player = this.state.getPlayer();
    const choice = round.template.choices.find((c) => c.id === choiceId) || round.template.choices[0];
    this.ui.hideActionDetail();
    this.logAndRender([
      this.finale.applyFinalistQAAnswer(round.juror, player, choice)
    ]);
    for (const finalist of round.finalists) {
      if (finalist.isPlayer) continue;
      const aiChoice = this.finale.aiPickQAResponse(finalist, round.template);
      this.logAndRender([
        this.finale.applyFinalistQAAnswer(round.juror, finalist, aiChoice)
      ]);
    }
    this.state.finaleQAIndex += 1;
    this._finaleQAPending = null;
    const total = this.finale.getJuryQARoundCount();
    if (this.state.finaleQAIndex >= total) {
      this.logAndRender(this.finale.finishJuryQA());
      this._showFinaleContinuePrompt('jury_vote');
    } else {
      this.state.finaleAwaitingStep = 'jury_qa_continue';
      this.ui.setActionPrompt(`Jury Q&A — continue to question ${this.state.finaleQAIndex + 1} of ${total}.`);
      this.ui.renderActions(
        [{ id: 'finale_continue', label: 'Continue Jury Q&A', description: 'Next jury question.' }],
        (action) => this.handlePlayerAction(action)
      );
    }
    this.render();
  }

  _runFinaleJuryVote() {
    const player = this.state.getPlayer();
    const finalists = this.state.getActiveContestants();
    if (player.evicted && player.isJuror && finalists.length === 2) {
      let html = '<p>You are on the jury — vote for the winner:</p><div class="target-grid">';
      for (const f of finalists) {
        html += `<button class="btn target-btn" data-jury-vote="${f.id}">Vote for ${escapeHtml(f.name)}</button>`;
      }
      html += '</div>';
      this.ui.showActionDetail(html);
      this.ui.renderActions([], () => {});
      this.ui.elements.actionDetail.querySelectorAll('[data-jury-vote]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const { results } = this.finale.runJuryVote({ playerVoteForId: btn.dataset.juryVote });
          this.ui.hideActionDetail();
          this.logAndRender(results);
          this.state.finaleAwaitingStep = null;
          this.endGame();
        });
      });
      return;
    }
    const { results } = this.finale.runJuryVote({});
    this.logAndRender(results);
    this.state.finaleAwaitingStep = null;
    this.endGame();
  }

  _spectateFinale() {
    this.state.inFinale = true;
    this.state.juryQAAdjustments = {};
    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Finale: HOH Part 1 ---' }],
      PHASES.WEEK_END
    );
    const p1 = this.finale.runPart1();
    this._pushSpectateEntries(p1.results, PHASES.WEEK_END);
    this.state.finalePartLosers = (p1.losers || []).map((c) => c.id);
    const losers = this.state.finalePartLosers.map((id) => this.state.getContestant(id)).filter(Boolean);
    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Finale: HOH Part 2 ---' }],
      PHASES.WEEK_END
    );
    const p2 = this.finale.runPart2(losers);
    this._pushSpectateEntries(p2.results, PHASES.WEEK_END);
    const r1 = this.state.getContestant(this.state.finaleR1WinnerId);
    const r2 = this.state.getContestant(this.state.finaleR2WinnerId);
    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Finale: HOH Part 3 ---' }],
      PHASES.WEEK_END
    );
    const p3 = this.finale.runPart3(r1, r2);
    this._pushSpectateEntries(p3.results, PHASES.WEEK_END);
    const finalHOH = p3.finalHOH;
    const candidates = this.state.getActiveContestants().filter((c) => c.id !== finalHOH?.id);
    const evict = this.finale.aiChooseEvictee(finalHOH, candidates);
    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Finale: Final HOH decision ---' }],
      PHASES.WEEK_END
    );
    const pick = this.finale.applyFinalPick(finalHOH, evict.id);
    this._pushSpectateEntries(pick.results, PHASES.WEEK_END);
    this.finale.beginJuryQA();
    const qaRounds = this.finale.getJuryQARoundCount();
    for (let i = 0; i < qaRounds; i += 1) {
      const round = this.finale.runJuryQARound(i);
      this._pushSpectateEntries(round.results, PHASES.WEEK_END);
      for (const finalist of round.finalists || []) {
        const choice = this.finale.aiPickQAResponse(finalist, round.template);
        this._pushSpectateEntries(
          [this.finale.applyFinalistQAAnswer(round.juror, finalist, choice)],
          PHASES.WEEK_END
        );
      }
      this.state.finaleQAIndex = i + 1;
    }
    this._pushSpectateEntries(this.finale.finishJuryQA(), PHASES.WEEK_END);
    this._pushSpectateEntries(
      [{ type: 'system', text: '--- Finale: Jury vote ---' }],
      PHASES.WEEK_END
    );
    const vote = this.finale.runJuryVote({});
    this._pushSpectateEntries(vote.results, PHASES.WEEK_END);
  }

  // ─── End game ──────────────────────────────────────────────────────

  endGame() {
    const summary = this.narrative.generateEndgameSummary();
    const won = this.state.winner?.isPlayer;
    this.ui.renderEndSummary(summary);
    this.ui.showEnd(won);
    StorageManager.clear();
  }
}

const game = new Game();

export default game;

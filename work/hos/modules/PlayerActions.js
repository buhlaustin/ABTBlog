import { randomInt, clamp } from './utils.js';
import { PHASES } from './GameState.js';
import {
  getAllianceIds,
  getContestantAlliances,
  sharesAllianceWith
} from './allianceUtils.js';

/**
 * Player-initiated actions during the social phase.
 */
export class PlayerActions {
  constructor(gameState) {
    this.state = gameState;
  }

  /** Get available actions for the current state. */
  getAvailableActions() {
    const player = this.state.getPlayer();
    if (!player || player.evicted) return [];

    const phase = this.state.phase;
    const nominees = this.state.nominees
      .map((id) => this.state.getContestant(id))
      .filter(Boolean);

    const actions = [
      { id: 'talk', label: 'Talk to Houseguest', description: 'Have a conversation to build rapport.' },
      { id: 'befriend', label: 'Build Friendship', description: 'Invest time strengthening a bond.' },
      { id: 'alliance', label: 'Propose New Alliance', description: 'Start a separate secret deal with someone.' },
      { id: 'spy', label: 'Spy / Gather Intel', description: 'Eavesdrop and learn house secrets.' },
      { id: 'promise', label: 'Make a Promise', description: 'Pledge your vote or loyalty.' },
      { id: 'campaign', label: 'Campaign Against Target', description: 'Turn the house against someone.' },
      { id: 'reputation', label: 'Improve Reputation', description: 'Do something to look good to the house.' },
      { id: 'rest', label: 'Rest & Observe', description: 'Skip action, lower threat slightly.' }
    ];

    const playerAlliances = getContestantAlliances(this.state, player.id);
    if (playerAlliances.length > 0) {
      actions.splice(3, 0, {
        id: 'expand_alliance',
        label: 'Invite to Existing Alliance',
        description: 'Add someone to one of your current alliances.'
      });
    }

    if (phase === PHASES.EVICTION || this.state.isScheduledHouseEventDay()) {
      actions.splice(6, 0, {
        id: 'influence',
        label: 'Lobby Before the Vote',
        description: 'Push houseguests while tension is high.'
      });
    } else {
      actions.splice(6, 0, {
        id: 'influence',
        label: 'Influence Votes',
        description: 'Lobby houseguests before eviction night.'
      });
    }

    if (phase === PHASES.NOMINATION || phase === PHASES.VETO_CEREMONY || phase === PHASES.VETO) {
      actions.unshift({
        id: 'scheme_nom',
        label: 'Scheme About Nominees',
        description: 'Float names and test reactions before the ceremony.'
      });
    }

    if (phase === PHASES.COMPETITION) {
      actions.unshift({
        id: 'pregame',
        label: 'Pre-Competition Pep Talk',
        description: 'Rally allies before the HOH competition.'
      });
    }

    if (nominees.length > 0 && (phase === PHASES.VETO_COMP || phase === PHASES.EVICTION)) {
      actions.unshift({
        id: 'comfort_nominee',
        label: 'Comfort a Nominee',
        description: 'Show support (or fake it) on the block.'
      });
    }

    const hasActivePromises = player.promises.some((p) => p.kept === null);
    if (hasActivePromises) {
      actions.splice(8, 0, {
        id: 'break_promise',
        label: 'Break a Promise',
        description: 'Go back on your word (risky).'
      });
    }

    if (this.state.actionsRemaining <= 0) {
      return [{ id: 'end_day', label: 'End Day', description: 'Move on to the next day.' }];
    }

    return actions;
  }

  /** Execute a player action. Returns { success, text, type, effects }. */
  execute(actionId, targetId = null, extra = {}) {
    const player = this.state.getPlayer();
    const target = targetId ? this.state.getContestant(targetId) : null;

    switch (actionId) {
      case 'talk':
        return this._talk(player, target);
      case 'befriend':
        return this._befriend(player, target);
      case 'alliance':
        return this._proposeAlliance(player, target);
      case 'expand_alliance':
        return this._expandAlliance(player, target, extra.allianceId);
      case 'spy':
        return this._spy(player, target);
      case 'promise':
        return this._makePromise(player, target, extra.promiseType);
      case 'break_promise':
        return this._breakPromise(player, target);
      case 'campaign':
        return this._campaign(player, target);
      case 'influence':
        return this._influenceVotes(player, target);
      case 'reputation':
        return this._improveReputation(player);
      case 'rest':
        return this._rest(player);
      case 'scheme_nom':
        return this._schemeNominees(player, target);
      case 'pregame':
        return this._pregameComp(player, target);
      case 'comfort_nominee':
        return this._comfortNominee(player, target);
      case 'end_day':
        return { success: true, text: 'You chose to end the day.', type: 'system', endDay: true };
      default:
        return { success: false, text: 'Unknown action.', type: 'system' };
    }
  }

  _phaseFlavor() {
    const phase = this.state.phase;
    if (phase === PHASES.EVICTION) return 'with eviction looming';
    if (phase === PHASES.NOMINATION) return 'as nomination talk swirls';
    if (phase === PHASES.VETO_COMP || phase === PHASES.VETO_CEREMONY) return 'with veto drama in the air';
    if (phase === PHASES.COMPETITION) return 'before the HOH comp';
    return 'around the house';
  }

  _talk(player, target) {
    if (!target) return { success: false, text: 'Choose someone to talk to.', type: 'system' };

    const delta = randomInt(2, 6) + Math.floor(player.social / 3);
    player.modifyRelationship(target.id, delta);
    target.modifyRelationship(player.id, delta - randomInt(0, 2));

    const flavor = this._phaseFlavor();
    const dialogues = [
      `You had a raw conversation with ${target.name} ${flavor} about who is really running the house.`,
      `You and ${target.name} traded strategy ${flavor} — both of you lied a little, both of you listened.`,
      `A tense sidebar with ${target.name} ${flavor} ended with a handshake that might actually mean something.`,
      `${target.name} vented to you ${flavor}; you filed every word away for later.`,
      `You and ${target.name} laughed too loud on purpose ${flavor}, just so the house would wonder what you said.`
    ];

    this._consumeAction();
    return {
      success: true,
      text: dialogues[randomInt(0, dialogues.length - 1)],
      type: 'narrative',
      relationshipChange: delta
    };
  }

  _befriend(player, target) {
    if (!target) return { success: false, text: 'Choose someone to befriend.', type: 'system' };

    const success = player.social + randomInt(1, 8) > target.social + randomInt(1, 5);
    const delta = success ? randomInt(8, 15) : randomInt(2, 5);

    player.modifyRelationship(target.id, delta);
    target.modifyRelationship(player.id, success ? delta - 2 : randomInt(1, 4));

    this._consumeAction();
    return {
      success: true,
      text: success
        ? `Your bond with ${target.name} deepened ${this._phaseFlavor()}. They might actually ride for you.`
        : `${target.name} smiled ${this._phaseFlavor()}, but their eyes stayed on the exits.`,
      type: success ? 'success' : 'narrative'
    };
  }

  _proposeAlliance(player, target) {
    if (!target) return { success: false, text: 'Choose an alliance partner.', type: 'system' };

    if (sharesAllianceWith(player, target)) {
      this._consumeAction();
      return {
        success: true,
        text: `You and ${target.name} already share a secret deal. You tighten the pact instead of starting over.`,
        type: 'narrative'
      };
    }

    const acceptChance = (player.getRelationship(target.id) + player.social * 5 + target.loyalty * 3) / 100;
    const accepted = Math.random() < acceptChance;

    if (accepted) {
      const created = this.state.createAlliance(
        player.id,
        [target.id],
        `${player.name} ↔ ${target.name}`
      );
      if (!created) {
        this._consumeAction();
        return {
          success: false,
          text: 'That alliance could not be formed.',
          type: 'warning'
        };
      }

      player.modifyRelationship(target.id, 20);
      target.modifyRelationship(player.id, 15);
      player.trust = clamp(player.trust + 5, 0, 100);

      this._consumeAction();
      return {
        success: true,
        text: `${target.name} shook on a new secret alliance with you — separate from any other deals in the house.`,
        type: 'success'
      };
    }

    target.modifyRelationship(player.id, -5);
    this._consumeAction();
    return {
      success: false,
      text: `${target.name} dodged your offer ${this._phaseFlavor()}. The room got quiet fast.`,
      type: 'warning'
    };
  }

  _expandAlliance(player, target, allianceId) {
    if (!allianceId) {
      return { success: false, text: 'Pick which alliance to expand.', type: 'system', needsAlliancePick: true };
    }
    if (!target) return { success: false, text: 'Choose who to invite.', type: 'system' };

    const alliance = this.state.alliances.find((a) => a.id === allianceId);
    if (!alliance || !alliance.members.includes(player.id)) {
      return { success: false, text: 'That alliance is not yours.', type: 'system' };
    }
    if (alliance.members.includes(target.id)) {
      this._consumeAction();
      return { success: true, text: `${target.name} is already in that alliance.`, type: 'narrative' };
    }

    const acceptChance = (player.getRelationship(target.id) + target.loyalty * 4) / 120;
    if (Math.random() >= acceptChance) {
      target.modifyRelationship(player.id, -4);
      this._consumeAction();
      return {
        success: false,
        text: `${target.name} refused to join "${alliance.name}".`,
        type: 'warning'
      };
    }

    const added = this.state.addAllianceMember(alliance.id, target.id);
    if (!added.ok) {
      this._consumeAction();
      return { success: false, text: added.reason || 'Could not add member.', type: 'warning' };
    }

    player.modifyRelationship(target.id, 10);
    target.modifyRelationship(player.id, 8);
    this._consumeAction();
    return {
      success: true,
      text: `${target.name} joined your alliance "${alliance.name}".`,
      type: 'success'
    };
  }

  _spy(player, target) {
    const success = player.intelligence + randomInt(1, 10) > 8;
    this._consumeAction();

    if (!success) {
      return {
        success: false,
        text: 'You lingered too long by the door. Someone definitely noticed.',
        type: 'warning'
      };
    }

    const subject = target || this._pickSpySubject();
    const subjectAlliances = getContestantAlliances(this.state, subject.id).filter(
      (a) => !a.members.includes(player.id)
    );
    for (const alliance of subjectAlliances) {
      if (Math.random() < 0.35) alliance.exposed = true;
    }

    const allyName = this._randomAllyName(subject);
    const intelTypes = [
      `${subject.name} was heard planning to target you next week.`,
      `${subject.name} is running a side deal with ${allyName} — not their only alliance.`,
      `${subject.name} lied about their vote last week.`,
      `${subject.name} has been spreading rumors about you ${this._phaseFlavor()}.`,
      `You caught ${subject.name} rehearsing what to say if they win HOH.`
    ];

    const intel = intelTypes[randomInt(0, intelTypes.length - 1)];
    this.state.playerIntel.push({
      week: this.state.week,
      about: subject.id,
      text: intel
    });

    return { success: true, text: intel, type: 'warning' };
  }

  _pickSpySubject() {
    const others = this.state.getOthers(this.state.getPlayer());
    return others[randomInt(0, others.length - 1)];
  }

  _randomAllyName(subject) {
    const others = this.state.getOthers(subject);
    return others.length > 0 ? others[randomInt(0, others.length - 1)].name : 'someone';
  }

  _makePromise(player, target, promiseType = 'vote') {
    if (!target) return { success: false, text: 'Choose who to make a promise to.', type: 'system' };

    player.makePromise(target.id, promiseType, this.state.week);
    target.modifyRelationship(player.id, randomInt(8, 14));
    player.trust = clamp(player.trust + 3, 0, 100);

    const promises = {
      vote: `You promised ${target.name} your vote this week — the house will hold you to it.`,
      safety: `You promised ${target.name} safety ${this._phaseFlavor()}.`,
      loyalty: `You swore loyalty to ${target.name} for the rest of the game.`
    };

    this._consumeAction();
    return {
      success: true,
      text: promises[promiseType] || promises.vote,
      type: 'narrative'
    };
  }

  _breakPromise(player, target) {
    if (!target) return { success: false, text: 'Choose whose promise to break.', type: 'system' };

    const activePromise = player.promises.find((p) => p.targetId === target.id && p.kept === null);
    if (!activePromise) {
      return { success: false, text: `You have no active promise to ${target.name}.`, type: 'system' };
    }

    player.breakPromise(target.id);
    target.recordBetrayal(player.id, this.state.week);
    target.modifyRelationship(player.id, -25);
    player.reputation = clamp(player.reputation - 10, 0, 100);
    player.trust = clamp(player.trust - 10, 0, 100);

    this._consumeAction();
    return {
      success: true,
      text: `You broke your promise to ${target.name}. They will not forget this betrayal.`,
      type: 'drama'
    };
  }

  _campaign(player, target) {
    if (!target) return { success: false, text: 'Choose a campaign target.', type: 'system' };

    const effectiveness = player.social + player.aggression - target.social;
    const others = this.state.getOthers(player).filter((c) => c.id !== target.id);
    let influenced = 0;

    for (const other of others) {
      if (Math.random() < effectiveness / 20) {
        other.modifyRelationship(target.id, -randomInt(5, 12));
        influenced += 1;
      }
    }

    target.reputation = clamp(target.reputation - randomInt(3, 8), 0, 100);
    player.threat = clamp(player.threat + 5, 0, 100);
    target.addGrudge(player.id, 'campaign', 15);

    this._consumeAction();
    return {
      success: true,
      text: influenced > 0
        ? `Your whisper campaign against ${target.name} landed with ${influenced} houseguest(s) ${this._phaseFlavor()}.`
        : `Your shots at ${target.name} bounced off — for now.`,
      type: 'drama'
    };
  }

  _influenceVotes(player, target) {
    if (!target) return { success: false, text: 'Choose who to lobby for.', type: 'system' };

    const others = this.state.getOthers(player).filter((c) => c.id !== target.id);
    let influenced = 0;

    for (const other of others) {
      const bonus = sharesAllianceWith(player, other) ? 0.15 : 0;
      const chance = (player.social + player.getRelationship(other.id)) / 150 + bonus;
      if (Math.random() < chance) {
        other.modifyRelationship(target.id, -randomInt(3, 8));
        influenced += 1;
      }
    }

    this._consumeAction();
    return {
      success: true,
      text: influenced > 0
        ? `You moved ${influenced} vote(s) against ${target.name} ${this._phaseFlavor()}.`
        : `Nobody budged — the block might stay predictable.`,
      type: 'narrative'
    };
  }

  _improveReputation(player) {
    player.reputation = clamp(player.reputation + randomInt(5, 12), 0, 100);
    const others = this.state.getOthers(player);
    for (const other of others) {
      if (Math.random() < 0.4) {
        other.modifyRelationship(player.id, randomInt(2, 5));
      }
    }

    this._consumeAction();
    return {
      success: true,
      text: `You pulled a gracious house move ${this._phaseFlavor()}. Even rivals nodded.`,
      type: 'success'
    };
  }

  _rest(player) {
    player.threat = clamp(player.threat - randomInt(3, 6), 0, 100);
    this._consumeAction();
    return {
      success: true,
      text: `You watched from the corners ${this._phaseFlavor()}, letting everyone else talk first.`,
      type: 'system'
    };
  }

  _schemeNominees(player, target) {
    if (!target) return { success: false, text: 'Choose who to test as a nominee name.', type: 'system' };
    const reactions = this.state.getOthers(player).filter((c) => c.id !== target.id);
    let stirred = 0;
    for (const c of reactions) {
      if (Math.random() < (player.social + 5) / 25) {
        c.modifyRelationship(target.id, -randomInt(2, 6));
        stirred += 1;
      }
    }
    target.threat = clamp(target.threat + randomInt(2, 5), 0, 100);
    this._consumeAction();
    return {
      success: true,
      text: stirred
        ? `You floated ${target.name}'s name ${this._phaseFlavor()}; ${stirred} people visibly flinched.`
        : `You casually dropped ${target.name}'s name — the house played poker faces.`,
      type: 'drama'
    };
  }

  _pregameComp(player, target) {
    if (!target) return { success: false, text: 'Choose who to rally.', type: 'system' };
    const boost = randomInt(3, 8);
    player.modifyRelationship(target.id, boost);
    target.modifyRelationship(player.id, boost - 1);
    if (sharesAllianceWith(player, target)) {
      target.competition = clamp(target.competition + 1, 1, 10);
    }
    this._consumeAction();
    return {
      success: true,
      text: `You hyped ${target.name} before the comp — whether they win or not, they remember.`,
      type: 'narrative'
    };
  }

  _comfortNominee(player, target) {
    if (!target) return { success: false, text: 'Choose a nominee to approach.', type: 'system' };
    if (!this.state.nominees.includes(target.id)) {
      return { success: false, text: `${target.name} is not on the block right now.`, type: 'system' };
    }
    const genuine = Math.random() < (player.loyalty + player.getRelationship(target.id)) / 120;
    player.modifyRelationship(target.id, genuine ? randomInt(6, 12) : randomInt(2, 5));
    target.modifyRelationship(player.id, genuine ? randomInt(5, 10) : randomInt(1, 4));
    this._consumeAction();
    return {
      success: true,
      text: genuine
        ? `You sat with ${target.name} on the block — real comfort in a cruel week.`
        : `You performed sympathy for ${target.name}. The cameras might buy it; they might not.`,
      type: genuine ? 'success' : 'narrative'
    };
  }

  _consumeAction() {
    this.state.actionsRemaining = Math.max(0, this.state.actionsRemaining - 1);
  }
}

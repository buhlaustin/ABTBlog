import { randomInt, pickRandom } from './utils.js';
import { FINALE_PHASES } from './GameState.js';

const JURY_QA_TEMPLATES = [
  {
    prompt: 'What was the move you are most proud of this season?',
    choices: [
      { id: 'honest', label: 'Explain it clearly and own the blood on your hands', delta: 10 },
      { id: 'humble', label: 'Downplay it and credit the house', delta: 4 },
      { id: 'evasive', label: 'Dodge the question', delta: -8 }
    ]
  },
  {
    prompt: 'Why should this jury vote for you over your opponent?',
    choices: [
      { id: 'respect', label: 'Respect the jury and make a concise case', delta: 12 },
      { id: 'shade', label: 'Trash your opponent\'s game', delta: 5 },
      { id: 'plead', label: 'Beg without substance', delta: -10 }
    ]
  },
  {
    prompt: 'Did you stay true to who you are in this house?',
    choices: [
      { id: 'authentic', label: 'Yes — admit flaws and growth', delta: 9 },
      { id: 'game', label: 'I played a character for the game', delta: 2 },
      { id: 'deny', label: 'Deny ever lying', delta: -6 }
    ]
  },
  {
    prompt: 'If you lose, what will you regret most?',
    choices: [
      { id: 'human', label: 'A specific relationship you burned', delta: 8 },
      { id: 'comp', label: 'A competition you should have won', delta: 5 },
      { id: 'nothing', label: 'Nothing — you played perfectly', delta: -7 }
    ]
  }
];

/**
 * Big Brother Final 3: R1 (3-way) → R2 (R1 losers) → R3 (R1 winner vs R2 winner) → Final HOH pick → jury vote.
 */
export class FinaleManager {
  constructor(gameState, aiController) {
    this.state = gameState;
    this.ai = aiController;
  }

  /** Score a head-to-head or free-for-all comp among contestants. */
  _compWinner(contestants, label) {
    const results = [];
    results.push({
      type: 'competition',
      text: `<strong>${label}</strong>`
    });

    let best = contestants[0];
    let bestScore = -Infinity;
    const scores = new Map();

    for (const c of contestants) {
      const score =
        c.competition * 10 +
        c.intelligence * 3 +
        randomInt(-8, 8) +
        (c.isPlayer ? this.state.config.competitionPlayerBonus * 5 : 0);
      scores.set(c.id, score);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }

    for (const c of contestants) {
      results.push({
        type: 'narrative',
        text: `${c.name} scores ${scores.get(c.id)} in the comp.`
      });
    }

    results.push({
      type: 'success',
      text: `<strong>${best.name}</strong> wins ${label}!`
    });

    return { winner: best, results };
  }

  runPart1() {
    const three = this.state.getActiveContestants();
    if (three.length !== 3) {
      return { results: [{ type: 'system', text: 'Final 3 requires exactly three houseguests.' }] };
    }
    const { winner, results } = this._compWinner(
      three,
      'Final Head of Household — Part 1 (all three compete)'
    );
    this.state.finaleR1WinnerId = winner.id;
    this.state.finalePhase = FINALE_PHASES.R2;
    return { results, r1Winner: winner, losers: three.filter((c) => c.id !== winner.id) };
  }

  runPart2(losers) {
    if (losers.length !== 2) {
      return { results: [{ type: 'system', text: 'Part 2 requires two players.' }] };
    }
    const { winner, results } = this._compWinner(
      losers,
      'Final Head of Household — Part 2 (Round 1 losers)'
    );
    this.state.finaleR2WinnerId = winner.id;
    this.state.finalePhase = FINALE_PHASES.R3;
    return { results, r2Winner: winner };
  }

  runPart3(r1Winner, r2Winner) {
    if (!r1Winner || !r2Winner) {
      return {
        results: [{ type: 'system', text: 'Final HOH Part 3 could not run — missing round winners.' }],
        finalHOH: null
      };
    }
    const { winner, results } = this._compWinner(
      [r1Winner, r2Winner],
      'Final Head of Household — Part 3 (Round 1 winner vs Round 2 winner)'
    );
    this.state.finaleR3WinnerId = winner.id;
    winner.isHOH = true;
    this.state.currentHOH = winner;
    this.state.finalePhase = FINALE_PHASES.FINAL_PICK;
    return { results, finalHOH: winner };
  }

  /** Final HOH evicts one; the other is Final 2 with jury. */
  applyFinalPick(finalHOH, evictedId) {
    const results = [];
    const evicted = this.state.getContestant(evictedId);
    const finalist = this.state
      .getActiveContestants()
      .find((c) => c.id !== finalHOH.id && c.id !== evictedId);

    if (!evicted || !finalist) {
      return { results: [{ type: 'system', text: 'Invalid final eviction choice.' }] };
    }

    results.push({
      type: 'drama',
      text: `Final Head of Household <strong>${finalHOH.name}</strong> chooses to take <strong>${finalist.name}</strong> to the Final 2.`
    });

    this.state.processEviction(evicted);
    this.state.finalePhase = FINALE_PHASES.JURY_QA;
    return { results, finalist, evicted };
  }

  /** Who Final HOH should evict (take the other houseguest to Final 2). */
  aiChooseEvictee(finalHOH, candidates) {
    if (!candidates?.length) return null;
    if (candidates.length === 1) return candidates[0];

    let evict = candidates[0];
    let bestScore = -Infinity;
    for (const c of candidates) {
      const score =
        c.competition * 2 +
        c.threat * 0.4 -
        finalHOH.getRelationship(c.id) * 0.5 +
        randomInt(-4, 4);
      if (score > bestScore) {
        bestScore = score;
        evict = c;
      }
    }
    return evict;
  }

  runJuryVote({ playerVoteForId = null } = {}) {
    const results = [];
    const finalists = this.state.getActiveContestants();
    if (finalists.length !== 2) {
      return {
        results: [{ type: 'system', text: 'Jury vote requires two finalists.' }],
        winner: null
      };
    }

    const jury = this.state.getJurors();
    results.push({
      type: 'drama',
      text: `<strong>The jury speaks.</strong> ${jury.length} juror${jury.length === 1 ? '' : 's'} cast their votes for the winner.`
    });

    const votes = new Map();
    for (const f of finalists) votes.set(f.id, 0);

    if (jury.length === 0) {
      results.push({
        type: 'warning',
        text: 'No jurors were seated — the higher reputation finalist wins by default.'
      });
      const winner =
        finalists[0].reputation >= finalists[1].reputation ? finalists[0] : finalists[1];
      this.state.gameOver = true;
      this.state.winner = winner;
      this.state.finalePhase = FINALE_PHASES.COMPLETE;
      results.push({
        type: 'success',
        text: `<strong>${winner.name} wins Big Brother!</strong>`
      });
      return { results, winner, voteCounts: votes };
    }

    for (const juror of jury) {
      let pick;
      if (juror.isPlayer && playerVoteForId) {
        pick = finalists.find((f) => f.id === playerVoteForId) || finalists[0];
      } else {
        pick = this._jurorVote(juror, finalists);
      }
      votes.set(pick.id, (votes.get(pick.id) || 0) + 1);
      results.push({
        type: 'narrative',
        text: `Juror <strong>${juror.name}</strong> votes for ${pick.name}.`
      });
    }

    let winner = finalists[0];
    for (const f of finalists) {
      if ((votes.get(f.id) || 0) > (votes.get(winner.id) || 0)) winner = f;
    }

    const tied = finalists.filter((f) => votes.get(f.id) === votes.get(winner.id));
    if (tied.length > 1) {
      winner = tied[randomInt(0, tied.length - 1)];
      results.push({ type: 'warning', text: 'The jury tied — a random vote breaks the deadlock.' });
    }

    const a = votes.get(finalists[0].id) || 0;
    const b = votes.get(finalists[1].id) || 0;
    results.push({
      type: 'success',
      text: `By a vote of ${Math.max(a, b)} to ${Math.min(a, b)}, <strong>${winner.name} wins Big Brother!</strong>`
    });

    this.state.gameOver = true;
    this.state.winner = winner;
    this.state.finalePhase = FINALE_PHASES.COMPLETE;
    return { results, winner, voteCounts: votes };
  }

  _jurorVote(juror, finalists) {
    if (this.ai?.decideJuryVote) {
      return this.ai.decideJuryVote(juror, finalists, this.state.juryQAAdjustments);
    }
    let best = finalists[0];
    let bestScore = -Infinity;
    for (const f of finalists) {
      const rel = juror.getRelationship(f.id);
      const grudge = juror.grudges.find((g) => g.againstId === f.id);
      const qa = this.state.juryQAAdjustments[juror.id]?.[f.id] || 0;
      const score = rel - (grudge ? grudge.intensity / 2 : 0) + qa + randomInt(-5, 5);
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }
    return best;
  }

  /** How many jury Q&A rounds to run (capped by jury size). */
  getJuryQARoundCount() {
    const jury = this.state.getJurors();
    return Math.min(JURY_QA_TEMPLATES.length, Math.max(1, jury.length));
  }

  getJuryQAQuestion(index) {
    const jury = this.state.getJurors();
    if (jury.length === 0) return null;
    const template = JURY_QA_TEMPLATES[index % JURY_QA_TEMPLATES.length];
    const juror = jury[index % jury.length];
    return { juror, template };
  }

  /** AI finalist picks an answer style. */
  aiPickQAResponse(finalist, template) {
    const strategy = finalist.personality?.strategy;
    let choice = template.choices[0];
    if (strategy === 'manipulate' || strategy === 'attack') {
      choice = template.choices.find((c) => c.id === 'shade') || pickRandom(template.choices);
    } else if (strategy === 'befriend' || strategy === 'ally') {
      choice = template.choices.find((c) => c.id === 'respect' || c.id === 'honest')
        || pickRandom(template.choices);
    } else {
      choice = pickRandom(template.choices);
    }
    return choice;
  }

  applyFinalistQAAnswer(juror, finalist, choice) {
    this.state.addJuryQAAdjustment(juror.id, finalist.id, choice.delta);
    return {
      type: 'narrative',
      text: `<strong>${finalist.name}</strong> to ${juror.name}: “${choice.label}.”`
    };
  }

  beginJuryQA() {
    const results = [];
    const finalists = this.state.getActiveContestants();
    const jury = this.state.getJurors();
    results.push({
      type: 'drama',
      text: '<strong>Jury Q&A</strong> — Finalists face the jury live before the vote. Each answer can sway votes.'
    });
    if (finalists.length !== 2) {
      results.push({ type: 'warning', text: 'Jury Q&A requires two finalists.' });
      return { results, ok: false };
    }
    if (jury.length === 0) {
      results.push({
        type: 'system',
        text: 'No jurors are seated — Q&A is skipped; the jury vote follows.'
      });
      this.state.finalePhase = FINALE_PHASES.JURY_VOTE;
      return { results, ok: false, skipQA: true };
    }
    this.state.finalePhase = FINALE_PHASES.JURY_QA;
    this.state.finaleQAIndex = 0;
    return { results, ok: true };
  }

  runJuryQARound(index) {
    const results = [];
    const qa = this.getJuryQAQuestion(index);
    if (!qa) {
      return { results: [{ type: 'system', text: 'No more jury questions.' }], done: true };
    }
    const { juror, template } = qa;
    const finalists = this.state.getActiveContestants();
    results.push({
      type: 'drama',
      text: `Juror <strong>${juror.name}</strong> asks: “${template.prompt}”`
    });
    return {
      results,
      juror,
      template,
      finalists,
      done: false,
      needsPlayerAnswer: finalists.some((f) => f.isPlayer)
    };
  }

  finishJuryQA() {
    this.state.finalePhase = FINALE_PHASES.JURY_VOTE;
    return [{
      type: 'system',
      text: 'Jury Q&A is over. The jurors are ready to cast their votes for the winner.'
    }];
  }
}

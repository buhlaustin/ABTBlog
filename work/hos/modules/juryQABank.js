/**
 * Jury Q&A question bank for finale night. Each template: prompt + answer choices
 * with vote sway (delta) applied to the asking juror toward that finalist.
 */
export const JURY_QA_TEMPLATES = [
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
  },
  {
    prompt: 'What was your biggest mistake in the game?',
    choices: [
      { id: 'accountable', label: 'Name it and explain what you learned', delta: 11 },
      { id: 'minimize', label: 'Call it a necessary risk', delta: 3 },
      { id: 'blame', label: 'Blame the house or production', delta: -9 }
    ]
  },
  {
    prompt: 'Did you make any promises you did not keep?',
    choices: [
      { id: 'own_game', label: 'Own a broken deal and justify it as gameplay', delta: 6 },
      { id: 'loyal', label: 'Say you honored your word when it mattered most', delta: 8 },
      { id: 'dismiss', label: 'Say deals are meaningless in Big Brother', delta: -8 }
    ]
  },
  {
    prompt: 'How much of your game was social versus competition?',
    choices: [
      { id: 'balanced', label: 'Balance both and give examples', delta: 10 },
      { id: 'social', label: 'I rode relationships all the way', delta: 7 },
      { id: 'comp_brag', label: 'I carried the house in every comp', delta: 2 }
    ]
  },
  {
    prompt: 'Who sitting on this jury did you respect the most?',
    choices: [
      { id: 'gratitude', label: 'Name someone with genuine gratitude', delta: 12 },
      { id: 'strategic', label: 'Praise whoever helps your case most', delta: 4 },
      { id: 'shade_jury', label: 'Refuse to answer or throw shade', delta: -6 }
    ]
  },
  {
    prompt: 'Did you ever throw a competition on purpose?',
    choices: [
      { id: 'strategic_throw', label: 'Admit it when it advanced your plan', delta: 7 },
      { id: 'deny_throw', label: 'Say you always played to win', delta: -3 },
      { id: 'humble_throw', label: 'Explain laying low without arrogance', delta: 9 }
    ]
  },
  {
    prompt: 'What will you do with the prize money if you win?',
    choices: [
      { id: 'personal', label: 'Share something real about family or future', delta: 10 },
      { id: 'generic', label: 'Give a vague inspirational answer', delta: 4 },
      { id: 'flippant', label: 'Joke about it or dodge', delta: -5 }
    ]
  },
  {
    prompt: 'Why did you deserve to make the Final 2 over other jurors\' friends?',
    choices: [
      { id: 'merit', label: 'Argue merit without insulting the jury', delta: 11 },
      { id: 'compare', label: 'Compare yourself directly to your opponent', delta: 5 },
      { id: 'entitled', label: 'Say you were destined to be here', delta: -7 }
    ]
  },
  {
    prompt: 'Is there anything you want to say to your opponent right now?',
    choices: [
      { id: 'class', label: 'Congratulate them and stay classy', delta: 8 },
      { id: 'last_pitch', label: 'Use it as a final pitch to the jury', delta: 6 },
      { id: 'petty', label: 'Get personal or petty', delta: -10 }
    ]
  }
];

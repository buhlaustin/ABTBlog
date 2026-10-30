import { pickRandom, randomInt, shuffle } from './utils.js';

/** Local fallback inbox — always playable offline. */
const TEMPLATES = [
  {
    subject: 'RE: All-hands brawl (video attached)',
    from: 'Priya N. · Chief People Officer',
    body: 'HR cannot un-see the Slack thread you liked. The board wants a statement in 20 minutes.',
    choices: [
      { label: 'Fire them publicly on LinkedIn', effects: { stock: 8, board: 6, morale: -14, cash: 2 } },
      { label: 'Pay the NDA and pizza', effects: { stock: -2, board: -4, morale: 10, cash: -12 } }
    ]
  },
  {
    subject: 'Hostile note from activist fund Greylock',
    from: 'Elliot V. · Managing Partner',
    body: 'We own 9% and think your “AI pivot” is cosplay. Resign or we launch a proxy fight.',
    choices: [
      { label: 'Tweet through it', effects: { stock: -10, board: -8, morale: 6, cash: 0 } },
      { label: 'Offer them a board seat', effects: { stock: 4, board: -12, morale: -4, cash: -6 } }
    ]
  },
  {
    subject: 'Founder wants the logo back on the jet',
    from: 'Zander K. · “Visionary Emeritus”',
    body: 'I invented weekends. The jet needs my face on the tail again or I live-tweet your cap table.',
    choices: [
      { label: 'Paint the jet', effects: { stock: -6, board: -10, morale: -6, cash: -14 } },
      { label: 'Revoke his badge', effects: { stock: 3, board: 8, morale: 4, cash: 0 } }
    ]
  },
  {
    subject: 'Customer database “accidentally” on GitHub',
    from: 'Morgan Lee · Interim CISO',
    body: 'An intern pushed prod to public. TechCrunch is already writing the headline.',
    choices: [
      { label: 'Blame supply chain', effects: { stock: -4, board: 5, morale: -8, cash: -6 } },
      { label: 'Disclose + breach coach', effects: { stock: -8, board: 6, morale: 2, cash: -10 } }
    ]
  },
  {
    subject: 'Union vote moved up to Friday',
    from: 'Shop Steward · Warehouse 4',
    body: 'Morale is a metric; rent is real. We need a counteroffer before the press call.',
    choices: [
      { label: 'Match Amazon wages', effects: { stock: -5, board: -6, morale: 14, cash: -12 } },
      { label: 'Schedule “listening sessions”', effects: { stock: 2, board: 4, morale: -10, cash: 0 } }
    ]
  },
  {
    subject: 'Your CFO is on CNBC in 12 minutes',
    from: 'IR Team · Auto-alert',
    body: 'They asked about “accounting irregularities.” We can pull them or let them freestyle.',
    choices: [
      { label: 'Pull the interview', effects: { stock: -6, board: 8, morale: -2, cash: 0 } },
      { label: 'Let them cook', effects: { stock: 10, board: -14, morale: 0, cash: 4 } }
    ]
  },
  {
    subject: 'Acquisition offer (expiring midnight)',
    from: 'M&A · MegaCorp',
    body: 'Cash-heavy offer at a 40% premium. Board wants your recommendation on the all-hands.',
    choices: [
      { label: 'Recommend yes', effects: { stock: 12, board: 10, morale: -8, cash: 8 } },
      { label: 'Fight for independence', effects: { stock: -8, board: -6, morale: 6, cash: -4 } }
    ]
  },
  {
    subject: 'Glassdoor post: “CEO eats meetings”',
    from: 'Comms · Monitoring',
    body: 'It’s trending. Legal says truth is not a defense on the internet.',
    choices: [
      { label: 'Respond with memes', effects: { stock: 4, board: -8, morale: 8, cash: 0 } },
      { label: 'Mandatory joy workshop', effects: { stock: -2, board: 4, morale: -12, cash: -3 } }
    ]
  },
  {
    subject: 'Regulator wants your “AI safety” deck',
    from: 'Gov Affairs · DC',
    body: 'The EU thinks your model is “vibes-based.” Fines are trending on their side.',
    choices: [
      { label: 'Ship the real evals', effects: { stock: -4, board: 10, morale: -2, cash: -8 } },
      { label: 'Rename product to “Assistant”', effects: { stock: 6, board: -10, morale: 0, cash: 2 } }
    ]
  },
  {
    subject: 'Engineering wants to delete the monolith',
    from: 'CTO · #platform',
    body: 'Rewrite will take 18 months and pause features. Sales will scream.',
    choices: [
      { label: 'Approve the rewrite', effects: { stock: -6, board: 4, morale: 10, cash: -10 } },
      { label: 'Ship another AI wrapper', effects: { stock: 10, board: -6, morale: -8, cash: 6 } }
    ]
  },
  {
    subject: 'Whistleblower hotline (priority 1)',
    from: 'Anonymous · Ethics Line',
    body: 'Finance says revenue was pulled forward. Auditors are circling the building.',
    choices: [
      { label: 'Launch internal probe', effects: { stock: -10, board: 12, morale: -4, cash: -6 } },
      { label: 'Reclassify as “growth hack”', effects: { stock: 8, board: -16, morale: -6, cash: 4 } }
    ]
  },
  {
    subject: 'Office snake escaped again',
    from: 'Facilities · Building 2',
    body: 'It’s in the board room. Two directors refuse to enter until it’s handled.',
    choices: [
      { label: 'Catch it yourself for PR', effects: { stock: 2, board: 6, morale: 8, cash: 0 } },
      { label: 'Declare remote-first forever', effects: { stock: -2, board: -4, morale: 6, cash: -5 } }
    ]
  }
];

const REACTIONS = [
  'Legal adds your reply to the “never again” wiki.',
  'An analyst upgrades you to “chaotic neutral.”',
  'Three VPs schedule “alignment” that is really surveillance.',
  'The founder texts a single skull emoji.',
  'Your assistant quietly updates your resignation template.',
  'Board members pretend they didn’t read the thread.',
  'Employee #4278 makes a TikTok about your leadership style.',
  'Cash runway spreadsheet gains a new red column.'
];

export function pickLocalInbox(day, recentSubjects = []) {
  const pool = TEMPLATES.filter((t) => !recentSubjects.includes(t.subject));
  const source = pool.length >= 5 ? pool : TEMPLATES;
  const picked = shuffle(source).slice(0, 5).map((t) => ({
    ...t,
    choices: t.choices.map((c) => ({
      label: c.label,
      effects: { ...c.effects }
    }))
  }));

  if (day > 3) {
    for (const email of picked) {
      for (const c of email.choices) {
        for (const k of Object.keys(c.effects)) {
          const bump = randomInt(-2, 3);
          c.effects[k] += k === 'cash' && bump > 0 ? -bump : bump;
        }
      }
    }
  }

  return picked;
}

export function pickReaction() {
  return pickRandom(REACTIONS);
}

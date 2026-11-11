import { formatMoney } from './constants.js';
import { payFromPersonalBank, assertCeoNetWorthGate, creditCeoPersonalBank } from './CeoEconomics.js';
import { accrueCeoTaxableIncome } from './CeoPersonalTax.js';
import { calendarTurn } from './GameCalendar.js';
import { isPublicCompany } from './IPO.js';
import bundledAlmaMaterCatalog from '../data/ceo-alma-maters.json' with { type: 'json' };

function resolveCompanyAlmaMater(state) {
  const id = state.company?.almaMaterId;
  if (!id) return null;
  const list = Array.isArray(bundledAlmaMaterCatalog) ? bundledAlmaMaterCatalog : [];
  return list.find((s) => s.id === id) ?? null;
}

/** Capital deployed back through the alma mater — distinct from one-time gifts. */
export const ALUMNI_INVESTMENT_VEHICLES = [
  {
    id: 'university-daf',
    label: 'Donor-advised fund (DAF)',
    blurb: 'Campus-managed pool — grant out to any fund, modest growth, withdrawable after 6 months.',
    chips: [10_000, 50_000, 250_000],
    minCommit: 5_000,
    lockTurns: 6,
    withdrawable: true,
    baseReturnRate: 0.004,
    givingCreditPct: 1,
    minNetWorth: 100_000
  },
  {
    id: 'alumni-venture-fund',
    label: 'Alumni venture fund (LP)',
    blurb: 'Friends-and-batchmates’ startups — illiquid, spiky marks, great reunion slides.',
    chips: [25_000, 100_000, 500_000, 2_000_000],
    minCommit: 25_000,
    lockTurns: 24,
    withdrawable: true,
    baseReturnRate: 0.006,
    volatility: 0.035,
    givingCreditPct: 0.5,
    minNetWorth: 400_000,
    publicBoost: 0.002
  },
  {
    id: 'endowed-scholarship',
    label: 'Endowed scholarship pool',
    blurb: 'Permanent principal — locked forever, steady endowment-style returns.',
    chips: [100_000, 500_000, 2_000_000, 10_000_000],
    minCommit: 50_000,
    lockTurns: null,
    withdrawable: false,
    baseReturnRate: 0.0035,
    givingCreditPct: 1,
    minNetWorth: 250_000
  },
  {
    id: 'entrepreneurship-fund',
    label: 'Campus entrepreneurship fund',
    blurb: 'Student founders and lab spinouts — aligned with your day job.',
    chips: [50_000, 250_000, 1_000_000],
    minCommit: 25_000,
    lockTurns: 18,
    withdrawable: false,
    baseReturnRate: 0.005,
    volatility: 0.02,
    givingCreditPct: 0.75,
    minNetWorth: 350_000,
    buzzOnCommit: 1
  },
  {
    id: 'real-estate-endowment',
    label: 'Campus real estate endowment',
    blurb: 'Dorms and lab buildings — boring coupon, naming on the deed optional.',
    chips: [250_000, 1_500_000, 8_000_000],
    minCommit: 100_000,
    lockTurns: 36,
    withdrawable: false,
    baseReturnRate: 0.0045,
    givingCreditPct: 0.85,
    minNetWorth: 1_000_000,
    sentimentOnCommit: 1
  },
  {
    id: 'alumni-private-credit',
    label: 'Alumni private credit sleeve',
    blurb: 'Bridge loans to university spinouts — lower volatility than venture LP.',
    chips: [100_000, 500_000, 3_000_000],
    minCommit: 50_000,
    lockTurns: 12,
    withdrawable: true,
    baseReturnRate: 0.0055,
    volatility: 0.012,
    givingCreditPct: 0.6,
    minNetWorth: 600_000
  }
];

export const ALUMNI_INVESTOR_TIERS = [
  { minLifetime: 50_000_000, label: 'Endowment partner' },
  { minLifetime: 15_000_000, label: 'Investment committee chair' },
  { minLifetime: 5_000_000, label: 'Lead alumni investor' },
  { minLifetime: 1_000_000, label: 'Venture circle' },
  { minLifetime: 250_000, label: 'DAF contributor' },
  { minLifetime: 25_000, label: 'Fund supporter' },
  { minLifetime: 0, label: 'Prospective LP' }
];

export function alumniInvestorRecognitionLabel(lifetime) {
  const n = Math.max(0, Number(lifetime) || 0);
  return (
    ALUMNI_INVESTOR_TIERS.find((t) => n >= t.minLifetime)?.label ??
    ALUMNI_INVESTOR_TIERS[ALUMNI_INVESTOR_TIERS.length - 1].label
  );
}

export function ensureAlumniInvesting(state) {
  if (!state.ceo) return null;
  if (!state.ceo.alumniInvestPositions) state.ceo.alumniInvestPositions = {};
  if (state.ceo.alumniInvestLifetime == null) state.ceo.alumniInvestLifetime = 0;
  if (state.ceo.alumniInvestReturns == null) state.ceo.alumniInvestReturns = 0;
  return state.ceo;
}

export function alumniInvestingBalance(state) {
  const positions = state.ceo?.alumniInvestPositions ?? {};
  return Object.values(positions).reduce((sum, p) => sum + Math.max(0, Math.round(p.balance ?? 0)), 0);
}

function getVehicle(vehicleId) {
  return ALUMNI_INVESTMENT_VEHICLES.find((v) => v.id === vehicleId) ?? null;
}

function monthReturnRate(state, vehicle) {
  let rate = vehicle.baseReturnRate ?? 0.003;
  if (vehicle.publicBoost && isPublicCompany(state)) rate += vehicle.publicBoost;
  if (vehicle.volatility) {
    const jitter = ((calendarTurn(state) % 11) - 5) * (vehicle.volatility / 100);
    rate += jitter;
  }
  return Math.max(-0.025, Math.min(0.03, rate));
}

function ensurePosition(state, vehicleId) {
  const ceo = ensureAlumniInvesting(state);
  if (!ceo) return null;
  if (!ceo.alumniInvestPositions[vehicleId]) {
    ceo.alumniInvestPositions[vehicleId] = { balance: 0, investedLifetime: 0, lockUntilTurn: 0 };
  }
  return ceo.alumniInvestPositions[vehicleId];
}

export function canCommitAlumniInvestment(state, amountRaw, vehicleId) {
  if (state.flags?.gameOver) return { ok: false, reason: 'Run ended.' };
  const school = resolveCompanyAlmaMater(state);
  if (!school) return { ok: false, reason: 'Set your alma mater when founding the company.' };
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return { ok: false, reason: 'Unknown investment vehicle.' };
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < vehicle.minCommit) {
    return { ok: false, reason: `Minimum ${formatMoney(vehicle.minCommit)} for ${vehicle.label}.` };
  }
  const bal = state.ceo?.bankBalance ?? 0;
  if (bal < amount) {
    return { ok: false, reason: `Personal bank is ${formatMoney(bal)} — need ${formatMoney(amount)}.` };
  }
  if (vehicle.minNetWorth) {
    const nw = assertCeoNetWorthGate(state, vehicle.minNetWorth);
    if (!nw.ok) return nw;
  }
  return { ok: true, amount, school, vehicle };
}

function applyInvestCommitEffects(state, vehicle, amount) {
  const lines = [];
  if (vehicle.buzzOnCommit && state.product) {
    state.product.buzz = (state.product.buzz ?? 0) + vehicle.buzzOnCommit;
    lines.push(`Campus venture demo day — product buzz +${vehicle.buzzOnCommit}.`);
  }
  if (vehicle.sentimentOnCommit) {
    state.sentiment = state.sentiment ?? { score: 68 };
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + vehicle.sentimentOnCommit);
    lines.push(`Groundbreaking photo — sentiment +${vehicle.sentimentOnCommit}.`);
  }
  if (amount >= 500_000) {
    state.sentiment = state.sentiment ?? { score: 68 };
    const bump = amount >= 5_000_000 ? 2 : 1;
    state.sentiment.score = Math.min(100, (state.sentiment.score ?? 68) + bump);
    lines.push(`Investment committee invite — sentiment +${bump}.`);
  }
  return lines;
}

export function commitAlumniInvestment(state, amountRaw, vehicleId) {
  const gate = canCommitAlumniInvestment(state, amountRaw, vehicleId);
  if (!gate.ok) return gate;
  const { amount, school, vehicle } = gate;
  const label = `${school.shortLabel ?? school.label} — ${vehicle.label}`;
  const paid = payFromPersonalBank(state, amount, label, 'alumni_invest');
  if (paid <= 0) return { ok: false, reason: 'Personal bank is empty.' };

  const pos = ensurePosition(state, vehicle.id);
  pos.balance = (pos.balance ?? 0) + paid;
  pos.investedLifetime = (pos.investedLifetime ?? 0) + paid;
  if (vehicle.lockTurns != null) {
    pos.lockUntilTurn = calendarTurn(state) + vehicle.lockTurns;
  } else if (!vehicle.withdrawable) {
    pos.lockUntilTurn = Number.MAX_SAFE_INTEGER;
  }

  const ceo = ensureAlumniInvesting(state);
  ceo.alumniInvestLifetime = (ceo.alumniInvestLifetime ?? 0) + paid;

  const credit = Math.round(paid * (vehicle.givingCreditPct ?? 0));
  if (credit > 0) {
    ceo.alumniGivingLifetime = (ceo.alumniGivingLifetime ?? 0) + credit;
  }

  const effectLines = applyInvestCommitEffects(state, vehicle, paid);
  return {
    ok: true,
    amount: paid,
    vehicle,
    balance: pos.balance,
    investLifetime: ceo.alumniInvestLifetime,
    investorRecognition: alumniInvestorRecognitionLabel(ceo.alumniInvestLifetime),
    effectLines,
    summary: `Committed ${formatMoney(paid)} to ${school.label} — ${vehicle.label} (balance ${formatMoney(pos.balance)}). Investor status: ${alumniInvestorRecognitionLabel(ceo.alumniInvestLifetime)}.${effectLines.length ? ` ${effectLines.join(' ')}` : ''}`
  };
}

export function canWithdrawAlumniInvestment(state, amountRaw, vehicleId) {
  const vehicle = getVehicle(vehicleId);
  if (!vehicle?.withdrawable) return { ok: false, reason: 'This vehicle is locked or permanent.' };
  const pos = state.ceo?.alumniInvestPositions?.[vehicleId];
  if (!pos || (pos.balance ?? 0) <= 0) return { ok: false, reason: 'No balance in this vehicle.' };
  const turn = calendarTurn(state);
  if ((pos.lockUntilTurn ?? 0) > turn) {
    return { ok: false, reason: 'Commitment still in lock-up — check again later.' };
  }
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < 1_000) return { ok: false, reason: 'Minimum withdrawal $1,000.' };
  if (amount > (pos.balance ?? 0)) {
    return { ok: false, reason: `Vehicle holds ${formatMoney(pos.balance)}.` };
  }
  return { ok: true, amount, vehicle, position: pos };
}

export function withdrawAlumniInvestment(state, amountRaw, vehicleId) {
  const gate = canWithdrawAlumniInvestment(state, amountRaw, vehicleId);
  if (!gate.ok) return gate;
  const { amount, position: pos } = gate;
  pos.balance -= amount;
  creditCeoPersonalBank(state, amount, 'Alumni investment withdrawal', 'alumni_invest_withdraw');
  return {
    ok: true,
    amount,
    balance: pos.balance,
    summary: `Withdrew ${formatMoney(amount)} from alumni investment sleeve (remaining ${formatMoney(pos.balance)}).`
  };
}

/** Mark alumni sleeves monthly — gains are taxable personal income. */
export function settleAlumniInvestmentsAtMonthEnd(state) {
  const positions = state.ceo?.alumniInvestPositions ?? {};
  const lines = [];
  const ceo = ensureAlumniInvesting(state);
  if (!ceo) return lines;

  for (const vehicle of ALUMNI_INVESTMENT_VEHICLES) {
    const pos = positions[vehicle.id];
    const bal = Math.max(0, Math.round(pos?.balance ?? 0));
    if (bal <= 0) continue;
    const rate = monthReturnRate(state, vehicle);
    const gain = Math.round(bal * rate);
    if (gain === 0) continue;
    pos.balance = bal + gain;
    ceo.alumniInvestReturns = (ceo.alumniInvestReturns ?? 0) + gain;
    const pct = `${(rate * 100).toFixed(2)}%`;
    if (gain > 0) accrueCeoTaxableIncome(state, gain);
    lines.push(
      gain > 0
        ? `${vehicle.label} +${formatMoney(gain)} (${pct}; ${formatMoney(pos.balance)}).`
        : `${vehicle.label} ${formatMoney(gain)} (${pct}; ${formatMoney(pos.balance)}).`
    );
  }
  return lines;
}

import { formatMoney } from './constants.js';
import { calendarTurn } from './XC.js';

export const HOUSING_MODE = {
  RENT: 'rent',
  OWNED: 'owned',
  MORTGAGE: 'mortgage'
};

/** Purchasable homes — cashPrice is list; mortgage uses downPct of price. */
export const CEO_HOME_TIERS = [
  {
    id: 'starter-condo',
    label: 'Starter condo',
    cashPrice: 485_000,
    downPct: 0.2,
    mortgageApr: 0.0675,
    maintenanceMo: 720,
    blurb: 'One-bed downtown — elevator, HOA, no yard.'
  },
  {
    id: 'suburban-home',
    label: 'Suburban home',
    cashPrice: 1_350_000,
    downPct: 0.2,
    mortgageApr: 0.065,
    maintenanceMo: 1_450,
    blurb: 'Good schools, two-car garage, lawn you never use.'
  },
  {
    id: 'luxury-home',
    label: 'Luxury home',
    cashPrice: 4_200_000,
    downPct: 0.25,
    mortgageApr: 0.0625,
    maintenanceMo: 3_800,
    blurb: 'Pool, wine room, guest house — property tax hurts.'
  },
  {
    id: 'mansion',
    label: 'Estate / mansion',
    cashPrice: 14_500_000,
    downPct: 0.3,
    mortgageApr: 0.06,
    maintenanceMo: 12_500,
    blurb: 'Gated drive, staff wing, charity gala hosting mandatory.'
  }
];

export const CEO_LIFESTYLE_PURCHASES = [
  {
    id: 'sports-car',
    label: 'Sports car',
    cost: 185_000,
    blurb: 'Garage trophy — depreciation is a lifestyle choice.'
  },
  {
    id: 'classic-car',
    label: 'Classic collector car',
    cost: 420_000,
    blurb: 'Auction win — insured like a small company.'
  },
  {
    id: 'country-club',
    label: 'Country club initiation',
    cost: 75_000,
    monthlyDebitBump: 2_200,
    blurb: 'Initiation fee — monthly dues stack on discretionary debits.'
  },
  {
    id: 'yacht-slip',
    label: 'Yacht (48 ft)',
    cost: 2_800_000,
    monthlyDebitBump: 18_000,
    blurb: 'Dock fees, crew, and fuel — discretionary line never recovers.'
  },
  {
    id: 'art-collection',
    label: 'Contemporary art fund',
    cost: 650_000,
    blurb: 'Blue-chip pieces — appraisal fictionally tracks your net worth.'
  },
  {
    id: 'jet-card',
    label: 'Private jet card (25 hr)',
    cost: 385_000,
    monthlyDebitBump: 4_800,
    blurb: 'Charter hours — every board meeting is “client visit”.'
  },
  {
    id: 'wine-cellar',
    label: 'Wine cellar build-out',
    cost: 220_000,
    monthlyDebitBump: 900,
    blurb: 'Climate-controlled — entertainment budget finds a home.'
  }
];

const MORTGAGE_TERM_MONTHS = 360;

function ensureHousing(state) {
  if (!state.ceo) return null;
  if (!state.ceo.housing) {
    state.ceo.housing = {
      mode: HOUSING_MODE.RENT,
      tierId: 'rent',
      purchasePrice: 0,
      mortgageBalance: 0,
      mortgagePaymentMonthly: 0,
      maintenanceMonthly: 0,
      purchasedTurn: null
    };
  }
  if (!state.ceo.lifestyleOwned) state.ceo.lifestyleOwned = [];
  if (state.ceo.lifestyleDebitBump == null) state.ceo.lifestyleDebitBump = 0;
  return state.ceo.housing;
}

export function getCeoHomeTier(tierId) {
  return CEO_HOME_TIERS.find((t) => t.id === tierId) ?? null;
}

export function standardMortgagePayment(principal, aprAnnual, months = MORTGAGE_TERM_MONTHS) {
  const p = Math.max(0, Math.round(Number(principal) || 0));
  if (p <= 0) return 0;
  const r = (Number(aprAnnual) || 0) / 12;
  if (r <= 0) return Math.round(p / months);
  const factor = (1 + r) ** months;
  return Math.round((p * r * factor) / (factor - 1));
}

export function ceoHousingSummary(state) {
  const housing = ensureHousing(state);
  if (!housing) {
    return { mode: HOUSING_MODE.RENT, label: 'Renting', monthlyHousingDebit: null, equity: 0 };
  }
  if (housing.mode === HOUSING_MODE.RENT) {
    return {
      mode: HOUSING_MODE.RENT,
      label: 'Renting (rolled into Housing debit)',
      tierId: 'rent',
      monthlyHousingDebit: null,
      equity: 0,
      purchasePrice: 0
    };
  }
  const tier = getCeoHomeTier(housing.tierId);
  const price = housing.purchasePrice ?? tier?.cashPrice ?? 0;
  const equity = Math.max(0, price - (housing.mortgageBalance ?? 0));
  const monthly =
    housing.mode === HOUSING_MODE.MORTGAGE
      ? housing.mortgagePaymentMonthly ?? 0
      : housing.maintenanceMonthly ?? tier?.maintenanceMo ?? 0;
  return {
    mode: housing.mode,
    label: tier?.label ?? 'Owned home',
    tierId: housing.tierId,
    monthlyHousingDebit: monthly,
    equity,
    purchasePrice: price,
    mortgageBalance: housing.mortgageBalance ?? 0,
    maintenanceMonthly: housing.maintenanceMonthly ?? 0
  };
}

export function ceoHomeEquity(state) {
  return ceoHousingSummary(state).equity;
}

/** Replace rolled Housing line with mortgage / owned carrying costs; apply lifestyle bumps. */
export function applyHousingToPersonalExpenses(state, breakdown, total) {
  const parts = breakdown.map((p) => ({ ...p }));
  const housingIdx = parts.findIndex((p) => p.label === 'Housing');
  if (housingIdx < 0) return { breakdown: parts, total };

  const summary = ceoHousingSummary(state);
  const bump = state.ceo?.lifestyleDebitBump ?? 0;
  let newTotal = total;

  if (summary.mode === HOUSING_MODE.RENT) {
    if (bump > 0) {
      const discIdx = parts.findIndex((p) => p.label === 'Discretionary');
      if (discIdx >= 0) {
        parts[discIdx].amount += bump;
        newTotal += bump;
      }
    }
    return { breakdown: parts, total: newTotal };
  }

  const priorHousing = parts[housingIdx].amount;
  const carrying = summary.monthlyHousingDebit ?? priorHousing;
  parts[housingIdx].label =
    summary.mode === HOUSING_MODE.MORTGAGE ? 'Mortgage & housing' : 'Home (taxes & upkeep)';
  parts[housingIdx].amount = carrying;
  newTotal = total - priorHousing + carrying;

  if (bump > 0) {
    const discIdx = parts.findIndex((p) => p.label === 'Discretionary');
    if (discIdx >= 0) {
      parts[discIdx].amount += bump;
      newTotal += bump;
    }
  }

  return { breakdown: parts, total: newTotal };
}

function payFromPersonalBank(state, amount, label, kind) {
  const pay = Math.round(Number(amount) || 0);
  if (pay <= 0) return { ok: false, reason: 'Invalid amount.' };
  const bal = state.ceo?.bankBalance ?? 0;
  if (bal < pay) {
    return { ok: false, reason: `Need ${formatMoney(pay)} in your personal bank (have ${formatMoney(bal)}).` };
  }
  state.ceo.bankBalance = bal - pay;
  if (!state.ceo.bankLog) state.ceo.bankLog = [];
  state.ceo.bankLog.unshift({
    kind,
    amount: pay,
    delta: -pay,
    balanceAfter: state.ceo.bankBalance,
    label,
    turn: calendarTurn(state),
    month: state.calendar?.monthIndex,
    year: state.calendar?.year
  });
  if (state.ceo.bankLog.length > 12) state.ceo.bankLog.length = 12;
  return { ok: true, paid: pay };
}

export function sellCeoHome(state) {
  const housing = ensureHousing(state);
  if (!housing || housing.mode === HOUSING_MODE.RENT) {
    return { ok: false, reason: 'You are renting — no home to sell.' };
  }
  const summary = ceoHousingSummary(state);
  const tier = getCeoHomeTier(housing.tierId);
  const friction = 0.06;
  const proceeds = Math.max(0, Math.round(summary.equity * (1 - friction)));
  if (proceeds > 0) {
    state.ceo.bankBalance = (state.ceo.bankBalance ?? 0) + proceeds;
    if (!state.ceo.bankLog) state.ceo.bankLog = [];
    state.ceo.bankLog.unshift({
      kind: 'home_sale',
      amount: proceeds,
      delta: proceeds,
      balanceAfter: state.ceo.bankBalance,
      label: `Sold ${tier?.label ?? 'home'} (net of fees)`,
      turn: calendarTurn(state),
      month: state.calendar?.monthIndex,
      year: state.calendar?.year
    });
    if (state.ceo.bankLog.length > 12) state.ceo.bankLog.length = 12;
  }
  housing.mode = HOUSING_MODE.RENT;
  housing.tierId = 'rent';
  housing.purchasePrice = 0;
  housing.mortgageBalance = 0;
  housing.mortgagePaymentMonthly = 0;
  housing.maintenanceMonthly = 0;
  housing.purchasedTurn = null;
  return {
    ok: true,
    proceeds,
    summary:
      proceeds > 0
        ? `Sold ${tier?.label ?? 'home'} — ${formatMoney(proceeds)} to personal bank after ~6% sale costs. Housing debits return to the rent band.`
        : 'Listed the home — debits return to the rent band.'
  };
}

export function purchaseCeoHomeCash(state, tierId) {
  const tier = getCeoHomeTier(tierId);
  if (!tier) return { ok: false, reason: 'Unknown home tier.' };
  const housing = ensureHousing(state);
  if (housing.mode !== HOUSING_MODE.RENT) {
    return { ok: false, reason: 'Sell your current home on the Lifestyle tab before buying another.' };
  }
  const paid = payFromPersonalBank(state, tier.cashPrice, `Bought ${tier.label} (cash)`, 'home_cash');
  if (!paid.ok) return paid;

  housing.mode = HOUSING_MODE.OWNED;
  housing.tierId = tier.id;
  housing.purchasePrice = tier.cashPrice;
  housing.mortgageBalance = 0;
  housing.mortgagePaymentMonthly = 0;
  housing.maintenanceMonthly = tier.maintenanceMo;
  housing.purchasedTurn = calendarTurn(state);

  return {
    ok: true,
    summary: `Paid ${formatMoney(tier.cashPrice)} cash for ${tier.label} — Housing debit becomes ~${formatMoney(tier.maintenanceMo)}/mo upkeep.`
  };
}

export function purchaseCeoHomeMortgage(state, tierId) {
  const tier = getCeoHomeTier(tierId);
  if (!tier) return { ok: false, reason: 'Unknown home tier.' };
  const housing = ensureHousing(state);
  if (housing.mode !== HOUSING_MODE.RENT) {
    return { ok: false, reason: 'Sell your current home before taking a new mortgage.' };
  }
  const down = Math.round(tier.cashPrice * (tier.downPct ?? 0.2));
  const paid = payFromPersonalBank(state, down, `${tier.label} down payment`, 'home_down');
  if (!paid.ok) return paid;

  const principal = tier.cashPrice - down;
  const payment = standardMortgagePayment(principal, tier.mortgageApr);

  housing.mode = HOUSING_MODE.MORTGAGE;
  housing.tierId = tier.id;
  housing.purchasePrice = tier.cashPrice;
  housing.mortgageBalance = principal;
  housing.mortgagePaymentMonthly = payment;
  housing.maintenanceMonthly = Math.round(tier.maintenanceMo * 0.35);
  housing.purchasedTurn = calendarTurn(state);

  return {
    ok: true,
    summary: `Mortgage on ${tier.label} — ${formatMoney(down)} down, ~${formatMoney(payment)}/mo replaces Housing in personal debits.`
  };
}

export function purchaseCeoLifestyle(state, purchaseId) {
  const def = CEO_LIFESTYLE_PURCHASES.find((p) => p.id === purchaseId);
  if (!def) return { ok: false, reason: 'Unknown purchase.' };
  if ((state.ceo?.lifestyleOwned ?? []).includes(def.id)) {
    return { ok: false, reason: 'Already purchased this run.' };
  }
  const paid = payFromPersonalBank(state, def.cost, def.label, 'lifestyle');
  if (!paid.ok) return paid;

  state.ceo.lifestyleOwned.push(def.id);
  if (def.monthlyDebitBump) {
    state.ceo.lifestyleDebitBump = (state.ceo.lifestyleDebitBump ?? 0) + def.monthlyDebitBump;
  }

  const bumpNote = def.monthlyDebitBump
    ? ` Discretionary debits +${formatMoney(def.monthlyDebitBump)}/mo.`
    : '';
  return {
    ok: true,
    summary: `Paid ${formatMoney(def.cost)} — ${def.label}.${bumpNote}`
  };
}

/** Amortize mortgage slightly each month when personal debits settle. */
export function serviceCeoMortgageAtMonthEnd(state) {
  const housing = state.ceo?.housing;
  if (!housing || housing.mode !== HOUSING_MODE.MORTGAGE) return [];
  const balance = housing.mortgageBalance ?? 0;
  if (balance <= 0) return [];
  const payment = housing.mortgagePaymentMonthly ?? 0;
  const apr = getCeoHomeTier(housing.tierId)?.mortgageApr ?? 0.065;
  const interest = Math.round(balance * (apr / 12));
  const principal = Math.max(0, payment - interest);
  housing.mortgageBalance = Math.max(0, balance - principal);
  if (housing.mortgageBalance <= 0) {
    housing.mode = HOUSING_MODE.OWNED;
    housing.mortgagePaymentMonthly = 0;
    const tier = getCeoHomeTier(housing.tierId);
    housing.maintenanceMonthly = tier?.maintenanceMo ?? housing.maintenanceMonthly;
    return ['Mortgage paid off — home is owned outright; debits shift to upkeep only.'];
  }
  return [];
}

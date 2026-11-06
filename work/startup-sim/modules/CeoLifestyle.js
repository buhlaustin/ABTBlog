import { formatMoney } from './constants.js';
import { calendarTurn } from './XC.js';
import { isPublicCompany } from './IPO.js';

export const CEO_LIFESTYLE_CATEGORIES = [
  { id: 'mobility', label: 'Wheels & toys' },
  { id: 'wellness', label: 'Wellness & clubs' },
  { id: 'travel', label: 'Travel & experiences' },
  { id: 'collectibles', label: 'Collectibles & taste' },
  { id: 'staff', label: 'Personal staff & security' }
];

export const HOUSING_MODE = {
  RENT: 'rent',
  OWNED: 'owned',
  MORTGAGE: 'mortgage'
};

/** Purchasable homes — cashPrice is list; mortgage uses downPct of price. */
export const CEO_HOME_TIERS = [
  {
    id: 'tech-loft',
    label: 'Tech loft',
    cashPrice: 335_000,
    downPct: 0.15,
    mortgageApr: 0.069,
    maintenanceMo: 580,
    blurb: 'Open plan, one parking spot, building gym you never use.'
  },
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
    blurb: 'Gated drive, staff wing, charity gala hosting mandatory.',
    minNetWorth: 8_000_000
  },
  {
    id: 'waterfront-penthouse',
    label: 'Waterfront penthouse',
    cashPrice: 8_750_000,
    downPct: 0.25,
    mortgageApr: 0.061,
    maintenanceMo: 7_200,
    blurb: 'Corner unit, concierge, helicopter pad optional.',
    minNetWorth: 4_000_000
  }
];

export const CEO_LIFESTYLE_PURCHASES = [
  {
    id: 'ebike-pack',
    category: 'mobility',
    label: 'E-bike & gear pack',
    cost: 12_500,
    blurb: 'Commute without parking — still expense it as “wellness”.'
  },
  {
    id: 'sports-car',
    category: 'mobility',
    label: 'Sports car',
    cost: 185_000,
    blurb: 'Garage trophy — depreciation is a lifestyle choice.'
  },
  {
    id: 'supercar',
    category: 'mobility',
    label: 'Supercar allocation',
    cost: 325_000,
    monthlyDebitBump: 1_850,
    blurb: 'Track days, storage, and insurance that dwarfs the car note.',
    minNetWorth: 2_000_000
  },
  {
    id: 'classic-car',
    category: 'collectibles',
    label: 'Classic collector car',
    cost: 420_000,
    blurb: 'Auction win — insured like a small company.'
  },
  {
    id: 'premium-gym',
    category: 'wellness',
    label: 'Premium gym membership',
    cost: 4_200,
    monthlyDebitBump: 380,
    blurb: 'Annual prepay — smoothies and recovery room access included.'
  },
  {
    id: 'country-club',
    category: 'wellness',
    label: 'Country club initiation',
    cost: 75_000,
    monthlyDebitBump: 2_200,
    blurb: 'Initiation fee — monthly dues stack on discretionary debits.'
  },
  {
    id: 'ski-club',
    category: 'wellness',
    label: 'Ski club deposit',
    cost: 65_000,
    monthlyDebitBump: 1_100,
    blurb: 'Season locker, guest passes, and après you cannot expense.',
    minNetWorth: 500_000
  },
  {
    id: 'designer-watch',
    category: 'collectibles',
    label: 'Designer watch',
    cost: 38_000,
    blurb: 'Handshake accessory — resell value is someone else’s problem.'
  },
  {
    id: 'wine-cellar',
    category: 'collectibles',
    label: 'Wine cellar build-out',
    cost: 220_000,
    monthlyDebitBump: 900,
    blurb: 'Climate-controlled — entertainment budget finds a home.'
  },
  {
    id: 'art-collection',
    category: 'collectibles',
    label: 'Contemporary art fund',
    cost: 650_000,
    blurb: 'Blue-chip pieces — appraisal fictionally tracks your net worth.'
  },
  {
    id: 'jet-card',
    category: 'travel',
    label: 'Private jet card (25 hr)',
    cost: 385_000,
    monthlyDebitBump: 4_800,
    blurb: 'Charter hours — every board meeting is “client visit”.'
  },
  {
    id: 'fractional-vacation',
    category: 'travel',
    label: 'Fractional vacation home',
    cost: 890_000,
    monthlyDebitBump: 2_400,
    blurb: 'Two weeks a year in Aspen — maintenance fee forever.',
    minNetWorth: 1_500_000
  },
  {
    id: 'yacht-slip',
    category: 'travel',
    label: 'Yacht (48 ft)',
    cost: 2_800_000,
    monthlyDebitBump: 18_000,
    blurb: 'Dock fees, crew, and fuel — discretionary line never recovers.',
    minNetWorth: 3_000_000
  },
  {
    id: 'philanthropy-gala',
    category: 'travel',
    label: 'Charity gala table',
    cost: 125_000,
    blurb: 'Ten seats, open bar, photo op — donation receipt maybe.',
    minNetWorth: 1_000_000
  },
  {
    id: 'personal-chef',
    category: 'staff',
    label: 'Personal chef retainer',
    cost: 95_000,
    monthlyDebitBump: 6_500,
    blurb: 'Meal prep and dinner parties — payroll not included.',
    minNetWorth: 2_500_000
  },
  {
    id: 'executive-security',
    category: 'staff',
    label: 'Executive security detail',
    cost: 180_000,
    monthlyDebitBump: 3_200,
    blurb: 'Discreet driver and close protection — board asked nicely.',
    minNetWorth: 5_000_000,
    requiresPublic: true
  }
];

export function getCeoLifestylePurchase(purchaseId) {
  return CEO_LIFESTYLE_PURCHASES.find((p) => p.id === purchaseId) ?? null;
}

export function ceoLifestyleMonthlyDebit(state) {
  return Math.max(0, state.ceo?.lifestyleDebitBump ?? 0);
}

export function ceoLifestyleOwnedDetails(state) {
  const owned = new Set(state.ceo?.lifestyleOwned ?? []);
  return CEO_LIFESTYLE_PURCHASES.filter((p) => owned.has(p.id));
}

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
      mortgageOriginalPrincipal: 0,
      purchasedTurn: null
    };
  }
  const housing = state.ceo.housing;
  if (housing.mortgageOriginalPrincipal == null) housing.mortgageOriginalPrincipal = 0;
  if (
    housing.mode === HOUSING_MODE.MORTGAGE &&
    housing.mortgageOriginalPrincipal <= 0 &&
    (housing.mortgageBalance ?? 0) > 0
  ) {
    housing.mortgageOriginalPrincipal = housing.mortgageBalance;
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
  const original = housing.mortgageOriginalPrincipal ?? 0;
  const balance = housing.mortgageBalance ?? 0;
  const mortgageProgress =
    housing.mode === HOUSING_MODE.MORTGAGE && original > 0
      ? Math.round((1 - balance / original) * 1000) / 10
      : housing.mode === HOUSING_MODE.OWNED
        ? 100
        : 0;
  return {
    mode: housing.mode,
    label: tier?.label ?? 'Owned home',
    tierId: housing.tierId,
    monthlyHousingDebit: monthly,
    equity,
    purchasePrice: price,
    mortgageBalance: balance,
    mortgageOriginalPrincipal: original,
    mortgageProgress,
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
  housing.mortgageOriginalPrincipal = 0;
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

export function purchaseCeoHomeCash(state, tierId, netWorthGate = null) {
  const tier = getCeoHomeTier(tierId);
  if (!tier) return { ok: false, reason: 'Unknown home tier.' };
  if (tier.minNetWorth && netWorthGate && !netWorthGate.ok) {
    return { ok: false, reason: netWorthGate.reason ?? 'Net worth gate.' };
  }
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

export function purchaseCeoHomeMortgage(state, tierId, netWorthGate = null) {
  const tier = getCeoHomeTier(tierId);
  if (!tier) return { ok: false, reason: 'Unknown home tier.' };
  if (tier.minNetWorth && netWorthGate && !netWorthGate.ok) {
    return { ok: false, reason: netWorthGate.reason ?? 'Net worth gate.' };
  }
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
  housing.mortgageOriginalPrincipal = principal;
  housing.mortgagePaymentMonthly = payment;
  housing.maintenanceMonthly = Math.round(tier.maintenanceMo * 0.35);
  housing.purchasedTurn = calendarTurn(state);

  return {
    ok: true,
    summary: `Mortgage on ${tier.label} — ${formatMoney(down)} down, ~${formatMoney(payment)}/mo replaces Housing in personal debits.`
  };
}

export function prepayCeoMortgage(state, amountRaw) {
  const housing = ensureHousing(state);
  if (!housing || housing.mode !== HOUSING_MODE.MORTGAGE) {
    return { ok: false, reason: 'No active mortgage.' };
  }
  const balance = housing.mortgageBalance ?? 0;
  if (balance <= 0) return { ok: false, reason: 'Mortgage is already paid off.' };
  const amount = Math.round(Number(amountRaw) || 0);
  if (amount < 500) return { ok: false, reason: 'Minimum prepayment is $500.' };
  const pay = Math.min(amount, balance);
  const paid = payFromPersonalBank(state, pay, 'Mortgage prepayment', 'mortgage_prepay');
  if (!paid.ok) return paid;
  housing.mortgageBalance = balance - pay;
  const lines = [`Mortgage prepayment ${formatMoney(pay)} — balance ${formatMoney(housing.mortgageBalance)}.`];
  if (housing.mortgageBalance <= 0) {
    housing.mode = HOUSING_MODE.OWNED;
    housing.mortgagePaymentMonthly = 0;
    const tier = getCeoHomeTier(housing.tierId);
    housing.maintenanceMonthly = tier?.maintenanceMo ?? housing.maintenanceMonthly;
    housing.mortgageOriginalPrincipal = 0;
    lines.push('Mortgage paid off — debits shift to upkeep only.');
  }
  return { ok: true, summary: lines.join(' ') };
}

export function payOffCeoMortgage(state) {
  const housing = ensureHousing(state);
  if (!housing || housing.mode !== HOUSING_MODE.MORTGAGE) {
    return { ok: false, reason: 'No active mortgage.' };
  }
  const balance = housing.mortgageBalance ?? 0;
  if (balance <= 0) return { ok: false, reason: 'Nothing left to pay.' };
  return prepayCeoMortgage(state, balance);
}

export function purchaseCeoLifestyle(state, purchaseId, netWorthGate = null) {
  const def = getCeoLifestylePurchase(purchaseId);
  if (!def) return { ok: false, reason: 'Unknown purchase.' };
  if ((state.ceo?.lifestyleOwned ?? []).includes(def.id)) {
    return { ok: false, reason: 'Already purchased this run.' };
  }
  if (def.requiresPublic && !isPublicCompany(state)) {
    return { ok: false, reason: 'Unlocks after your company is public.' };
  }
  if (def.minNetWorth && netWorthGate && !netWorthGate.ok) {
    return { ok: false, reason: netWorthGate.reason ?? 'Net worth gate.' };
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

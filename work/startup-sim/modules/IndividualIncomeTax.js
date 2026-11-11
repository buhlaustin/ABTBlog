/** Federal individual brackets (single filer fiction) — ceilings are cumulative taxable income caps. */
export const INDIVIDUAL_BRACKETS_ANCHOR = [
  { rate: 0.1, upTo: 11_925 },
  { rate: 0.12, upTo: 48_475 },
  { rate: 0.22, upTo: 103_350 },
  { rate: 0.24, upTo: 197_300 },
  { rate: 0.32, upTo: 250_525 },
  { rate: 0.35, upTo: 626_350 },
  { rate: 0.37, upTo: Infinity }
];

/** Annual threshold inflation for bracket ceilings (game calendar years after start). */
export const INDIVIDUAL_BRACKET_INFLATION = 0.032;

export function individualBracketIndexYear(taxYear, calendarStartYear) {
  const start = calendarStartYear ?? taxYear;
  return Math.max(0, (taxYear ?? start) - start);
}

export function indexedIndividualBrackets(taxYear, calendarStartYear) {
  const years = individualBracketIndexYear(taxYear, calendarStartYear);
  const mult = (1 + INDIVIDUAL_BRACKET_INFLATION) ** years;
  return INDIVIDUAL_BRACKETS_ANCHOR.map((b) => ({
    rate: b.rate,
    upTo: b.upTo === Infinity ? Infinity : Math.round(b.upTo * mult)
  }));
}

/** Marginal slices: tax each band between prior ceiling and next ceiling. */
export function computeIndividualIncomeTax(taxableIncome, brackets = INDIVIDUAL_BRACKETS_ANCHOR) {
  const income = Math.max(0, Math.round(Number(taxableIncome) || 0));
  if (income <= 0) return 0;
  let tax = 0;
  let prevCeiling = 0;
  for (const band of brackets) {
    const ceiling = band.upTo;
    const top = ceiling === Infinity ? income : Math.min(income, ceiling);
    const slice = top - prevCeiling;
    if (slice > 0) tax += slice * band.rate;
    if (income <= ceiling || ceiling === Infinity) break;
    prevCeiling = ceiling;
  }
  return Math.round(tax);
}

export function topMarginalRate(taxableIncome, brackets = INDIVIDUAL_BRACKETS_ANCHOR) {
  const income = Math.max(0, Math.round(Number(taxableIncome) || 0));
  if (income <= 0) return 0;
  let prevCeiling = 0;
  let rate = brackets[0]?.rate ?? 0;
  for (const band of brackets) {
    if (income > prevCeiling) rate = band.rate;
    if (income <= band.upTo || band.upTo === Infinity) break;
    prevCeiling = band.upTo;
  }
  return rate;
}

import { formatMoney } from './constants.js';

/** Satellite city market + small/medium/large/xlarge footprint sizing. */

export const SATELLITE_SIZE_IDS = ['small', 'medium', 'large', 'xlarge'];

export const SATELLITE_SIZES = {
  small: { label: 'Small', seatMult: 0.55, rentMult: 0.66 },
  medium: { label: 'Medium', seatMult: 1, rentMult: 1 },
  large: { label: 'Large', seatMult: 1.95, rentMult: 1.58 },
  xlarge: { label: 'Extra-large', seatMult: 3.05, rentMult: 2.12 }
};

/** Tier-5 alpha city medium footprint targets ~19 seats (old “large” scale). */
const BASE_SEATS = 13;
const BASE_RENT = 10_500;

function clampTier(n) {
  return Math.min(5, Math.max(1, Math.round(Number(n) || 3)));
}

/** Rent multiplier from local cost of space (1 = low-cost market). */
export function satelliteCostMult(costTier) {
  const t = clampTier(costTier);
  return 0.68 + t * 0.19;
}

/** Seat multiplier from talent density / real-estate quality (1 = sparse, 5 = alpha city). */
export function satelliteCapacityMult(capacityTier) {
  const t = clampTier(capacityTier);
  return 0.76 + t * 0.14;
}

export function resolveSatelliteMarket(template) {
  if (!template) return { costTier: 3, capacityTier: 3 };
  if (template.costTier != null || template.capacityTier != null) {
    const fallback = template.marketTier ?? 3;
    return {
      costTier: clampTier(template.costTier ?? fallback),
      capacityTier: clampTier(template.capacityTier ?? fallback)
    };
  }
  const seats = template.seats ?? 8;
  const rent = template.rentMonthly ?? BASE_RENT;
  return {
    costTier: clampTier(Math.round(rent / 3200)),
    capacityTier: clampTier(Math.round((seats - 4) / 1.8))
  };
}

export function computeSatelliteOffice(template, sizeId = 'medium') {
  const size = SATELLITE_SIZES[sizeId] ?? SATELLITE_SIZES.medium;
  const market = resolveSatelliteMarket(template);
  const seats = Math.max(
    4,
    Math.round(BASE_SEATS * size.seatMult * satelliteCapacityMult(market.capacityTier))
  );
  const rentMonthly = Math.max(
    3500,
    Math.round(BASE_RENT * size.rentMult * satelliteCostMult(market.costTier))
  );
  return {
    seats,
    rentMonthly,
    size: sizeId,
    sizeLabel: size.label,
    costTier: market.costTier,
    capacityTier: market.capacityTier
  };
}

export function satelliteSizeLabel(sizeId) {
  return SATELLITE_SIZES[sizeId]?.label ?? 'Medium';
}

/** One-line preview for Finance UI (city + size). */
export function formatSatellitePreview(template, sizeId = 'medium') {
  if (!template) return '';
  const stats = computeSatelliteOffice(template, sizeId);
  return `${stats.seats} seats · ${formatMoney(stats.rentMonthly)}/mo`;
}

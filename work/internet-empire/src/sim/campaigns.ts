import type { GameState } from "./types";

export interface CampaignTypeDef {
  label: string;
  months: number;
  onStart: (s: GameState) => void;
  onTick: (s: GameState) => void;
  onComplete: (s: GameState) => void;
}

export const CAMPAIGN_TYPES: Record<string, CampaignTypeDef> = {
  series_b_roadshow: {
    label: "Series B roadshow",
    months: 3,
    onStart: (s) => {
      s.investorConfidence += 4;
      s.log.push("Roadshow booked — slides say hockey stick.");
    },
    onTick: (s) => {
      s.investorConfidence += 3;
      s.brand += 2;
    },
    onComplete: (s) => {
      const raised = Math.round(s.valuation * 0.1 * s.macro.fundingMultiplier);
      s.cash += raised;
      s.macro.fundingMultiplier *= 1.05;
      s.log.push(`Series B closed — $${raised.toLocaleString()} landed.`);
    },
  },
  pmf_push: {
    label: "PMF discovery sprint",
    months: 2,
    onStart: (s) => s.log.push("PMF sprint: interviews, not features."),
    onTick: (s) => {
      for (const p of s.products) {
        if (p.stage === "building") p.quality += 15;
        if (p.stage === "live" && p.kind === "product") p.revenueMonthly = Math.round(p.revenueMonthly * 1.05);
      }
      s.brand += 3;
    },
    onComplete: (s) => {
      s.monetization.productRevenueMult *= 1.1;
      s.log.push("PMF narrative locked — pricing finally clicks.");
    },
  },
  hypergrowth_hire: {
    label: "Hypergrowth hiring wave",
    months: 2,
    onStart: (s) => {
      s.headcount.developers += 1;
      s.headcount.sales += 1;
      s.log.push("Two-plane recruiting chart: builders + closers.");
    },
    onTick: (s) => {
      s.visitors += 120;
      s.techDebt += 4;
    },
    onComplete: (s) => {
      s.monetization.productRevenueMult *= 1.08;
      s.log.push("Org chart expanded — payroll will remember.");
    },
  },
  soc2_certification: {
    label: "SOC 2 certification",
    months: 4,
    onStart: (s) => {
      s.cash -= 3000;
      s.log.push("Auditors requested screenshots of screenshots.");
    },
    onTick: (s) => {
      s.techDebt = Math.max(0, s.techDebt - 3);
    },
    onComplete: (s) => {
      s.monetization.enterpriseMrr += 12_000;
      s.investorConfidence += 6;
      s.log.push("SOC 2 badge live — enterprise pipeline thawed.");
    },
  },
  category_blitz: {
    label: "Category marketing blitz",
    months: 2,
    onStart: (s) => s.log.push("PR firm promises a think-piece in every outlet."),
    onTick: (s) => {
      s.brand += 5;
      s.visitors += 200;
    },
    onComplete: (s) => {
      s.monetization.adArpuMult *= 1.12;
      s.valuation = Math.round(s.valuation * 1.08);
      s.log.push("Category leader narrative shipped — competitors quoted you.");
    },
  },
};

export function startCampaign(state: GameState, type: string): boolean {
  const def = CAMPAIGN_TYPES[type];
  if (!def) return false;
  if (state.activeCampaigns.some((c) => c.type === type)) return false;
  state.activeCampaigns.push({
    id: `${type}-${state.calendar.index}`,
    type,
    label: def.label,
    monthsLeft: def.months,
  });
  def.onStart(state);
  return true;
}

export function tickCampaigns(state: GameState): void {
  const finished: string[] = [];
  for (const c of state.activeCampaigns) {
    const def = CAMPAIGN_TYPES[c.type];
    if (!def) continue;
    def.onTick(state);
    c.monthsLeft -= 1;
    if (c.monthsLeft <= 0) {
      def.onComplete(state);
      finished.push(c.id);
    }
  }
  state.activeCampaigns = state.activeCampaigns.filter((c) => !finished.includes(c.id));
}
import {
  ACTION_BANK,
  applyBankAction,
  bankActionByKey,
  bankActionEligible,
  bankCashCost,
  pickProductNameFromBank,
} from "./actionBank";
import { deriveUiEra } from "./eras";
import { laneDef } from "./lanes";
import { initialProductMrr } from "./monetization";
import type { ActionDef, GameState } from "./types";

const ERA_ORDER = ["early", "dotcom", "web2", "mobile", "platform", "ai", "enterprise"] as const;

function eraRank(id: string): number {
  const i = ERA_ORDER.indexOf(id as (typeof ERA_ORDER)[number]);
  return i >= 0 ? i : 0;
}

function eraMeets(state: GameState, min: string): boolean {
  return eraRank(deriveUiEra(state)) >= eraRank(min === "enterprise" ? "ai" : min);
}

export function actionLabel(def: ActionDef, state: GameState): string {
  return typeof def.label === "function" ? def.label(state) : def.label;
}

function bankToDef(a: (typeof ACTION_BANK)[number]): ActionDef {
  return {
    key: a.key,
    label: a.label,
    ap: a.ap,
    cashCost: a.cashCost,
    eraMin: a.eraMin,
    requires: a.requires,
    effect: a.effect,
  };
}

function productBuilding(state: GameState): boolean {
  return state.products.some((p) => p.kind === "product" && p.stage === "building");
}

export function resolveActionDef(state: GameState, key: string): ActionDef | undefined {
  const core = ACTION_CATALOG.find((a) => a.key === key);
  if (core) return core;
  if (!state.monthlyDeck.includes(key)) return undefined;
  const bank = bankActionByKey(key);
  if (bank && bankActionEligible(state, bank)) return bankToDef(bank);
  return undefined;
}

export const ACTION_CATALOG: ActionDef[] = [
  {
    key: "build_website",
    label: "Build your first website",
    ap: 1,
    cashCost: 400,
    eraMin: "early",
    requires: (s) => (s.flags.hasWebsite ? "Website already live." : null),
    effect: "Launches a basic site; unlocks traffic growth.",
  },
  {
    key: "purchase_domain",
    label: "Purchase a domain",
    ap: 1,
    cashCost: 120,
    eraMin: "early",
    requires: (s) => (s.flags.hasDomain ? "Domain already owned." : null),
    effect: "+brand, required for serious ad buys.",
  },
  {
    key: "advertise",
    label: "Invest in advertising",
    ap: 1,
    cashCost: 600,
    eraMin: "early",
    requires: (s) => (!s.flags.hasWebsite ? "Build a website first." : null),
    effect: "Paid visitor burst.",
  },
  {
    key: "hire_developer",
    label: "Hire developer",
    ap: 1,
    cashCost: 2500,
    eraMin: "early",
    effect: "Speeds product builds.",
  },
  {
    key: "hire_designer",
    label: "Hire designer",
    ap: 1,
    cashCost: 2000,
    eraMin: "early",
    effect: "Improves site quality.",
  },
  {
    key: "hire_sales",
    label: "Hire salesperson",
    ap: 1,
    cashCost: 2200,
    eraMin: "dotcom",
    effect: "Boosts revenue conversion.",
  },
  {
    key: "develop_product",
    label: (s) => (s.flags.hasFirstProduct ? "Launch next product line" : "Develop your first product"),
    ap: 2,
    cashCost: 1200,
    eraMin: "early",
    requires: (s) => {
      if (!s.flags.hasWebsite) return "Build a website first.";
      if (productBuilding(s)) return "Finish the product currently in build.";
      return null;
    },
    effect: "Starts a product line that earns MRR when live.",
  },
  {
    key: "upgrade_infra",
    label: "Upgrade infrastructure",
    ap: 1,
    cashCost: (s) => 800 + s.infraTier * 1400,
    eraMin: "early",
    effect: "Supports more traffic.",
  },
  {
    key: "seo",
    label: "SEO & directories",
    ap: 1,
    cashCost: 350,
    eraMin: "early",
    effect: "Slow compounding visitors.",
  },
  {
    key: "partnership",
    label: "Portal partnership",
    ap: 1,
    cashCost: 900,
    eraMin: "early",
    effect: "Traffic + brand.",
  },
  {
    key: "fundraise",
    label: "Raise funding round",
    ap: 2,
    cashCost: 0,
    eraMin: "dotcom",
    requires: (s) => (s.investorConfidence < 25 ? "Investors are cold." : null),
    effect: "Cash in exchange for dilution (valuation bump).",
  },
  {
    key: "ipo",
    label: "IPO roadshow",
    ap: 3,
    cashCost: 5000,
    eraMin: "web2",
    requires: (s) =>
      s.flags.ipoCompleted ? "Already public." : s.valuation < 5_000_000 ? "Need $5M valuation." : null,
    effect: "Go public; volatile valuation.",
  },
  {
    key: "mobile_app",
    label: "Ship mobile app",
    ap: 2,
    cashCost: 8000,
    eraMin: "mobile",
    effect: "Mobile channel unlock.",
  },
  {
    key: "ai_product",
    label: "Launch AI product",
    ap: 2,
    cashCost: 12000,
    eraMin: "ai",
    effect: "AI revenue + compute burn.",
  },
  {
    key: "acquire",
    label: "Acquire competitor",
    ap: 2,
    cashCost: 0,
    eraMin: "web2",
    requires: (s) => (s.acquisitions.length === 0 ? "No acquisition targets left." : null),
    effect: "Buy a target from acquisitions list (queue on Rivals tab).",
  },
  {
    key: "research_tick",
    label: "Advance research",
    ap: 1,
    cashCost: 500,
    eraMin: "early",
    effect: "Progress active research node.",
  },
];

export function availableActions(state: GameState): ActionDef[] {
  const core = ACTION_CATALOG.filter((a) => {
    if (!eraMeets(state, a.eraMin)) return false;
    if (a.requires) {
      const reason = a.requires(state);
      if (reason) return false;
    }
    return true;
  }).filter((a) => {
    if (a.key === "hire_sales" && !eraMeets(state, "dotcom")) return false;
    if (a.key === "acquire") return false;
    return true;
  });

  const deck = state.monthlyDeck
    .map((key) => {
      const bank = bankActionByKey(key);
      if (!bank || !bankActionEligible(state, bank)) return null;
      return bankToDef(bank);
    })
    .filter((a): a is ActionDef => a != null);

  return [...core, ...deck];
}

export function cashForAction(state: GameState, def: ActionDef): number {
  return typeof def.cashCost === "function" ? def.cashCost(state) : def.cashCost;
}

function plannedCash(state: GameState): number {
  return state.plannedActions.reduce((sum, p) => sum + p.cashCost, 0);
}

export function canQueueAction(
  state: GameState,
  def: ActionDef,
  key = def.key
): { ok: boolean; reason?: string } {
  if (state.flags.gameOver || state.flags.ended) return { ok: false, reason: "Run ended." };
  if (state.apLeft < def.ap) return { ok: false, reason: "Not enough action points." };
  const cash =
    bankActionByKey(key) && state.monthlyDeck.includes(key)
      ? bankCashCost(state, bankActionByKey(key)!)
      : cashForAction(state, def);
  if (state.cash < plannedCash(state) + cash) return { ok: false, reason: "Not enough cash." };
  if (def.requires) {
    const r = def.requires(state);
    if (r) return { ok: false, reason: r };
  }
  return { ok: true };
}

export function applyQueuedActions(state: GameState): void {
  for (const plan of [...state.plannedActions]) {
    if (bankActionByKey(plan.actionKey) && state.monthlyDeck.includes(plan.actionKey)) {
      state.cash -= plan.cashCost;
      applyBankAction(state, plan.actionKey);
      continue;
    }

    const def = ACTION_CATALOG.find((a) => a.key === plan.actionKey);
    if (!def) continue;
    state.cash -= plan.cashCost;

    switch (plan.actionKey) {
      case "build_website": {
        state.flags.hasWebsite = true;
        state.products.push({
          id: `web-${state.calendar.index}`,
          name: `${state.companyName} Home`,
          kind: "website",
          stage: "live",
          quality: 35,
          visitorsBoost: 120,
          revenueMonthly: 0,
          monthsLive: 0,
        });
        state.brand += 8;
        state.log.push("Launched first website.");
        break;
      }
      case "purchase_domain": {
        state.flags.hasDomain = true;
        state.brand += 12;
        state.visitors += 40;
        state.log.push("Secured a memorable .com domain.");
        break;
      }
      case "advertise": {
        const mult = state.macro.adCpm;
        state.visitors += Math.round(180 * mult);
        state.log.push("Ran banner ads on directories and mailing lists.");
        break;
      }
      case "hire_developer":
        state.headcount.developers += 1;
        state.log.push("Hired a developer.");
        break;
      case "hire_designer":
        state.headcount.designers += 1;
        state.log.push("Hired a designer.");
        break;
      case "hire_sales":
        state.headcount.sales += 1;
        state.log.push("Hired sales.");
        break;
      case "develop_product": {
        const name = pickProductNameFromBank(state);
        state.products.push({
          id: `prod-${state.calendar.index}`,
          name,
          kind: "product",
          stage: "building",
          quality: 20,
          visitorsBoost: 0,
          revenueMonthly: 0,
          monthsLive: 0,
        });
        state.flags.hasFirstProduct = true;
        state.log.push(`Started building ${name}.`);
        break;
      }
      case "upgrade_infra":
        state.infraTier += 1;
        state.techDebt = Math.max(0, state.techDebt - 5);
        state.log.push("Upgraded hosting tier.");
        break;
      case "seo":
        state.brand += Math.round(5 * laneDef(state.lane).brandMult);
        state.visitors += 60;
        state.log.push("Climbed directory listings.");
        break;
      case "partnership":
        state.brand += 10;
        state.visitors += 150;
        state.investorConfidence += 3;
        state.log.push("Signed a portal distribution deal.");
        break;
      case "fundraise": {
        const raised = Math.round(state.valuation * 0.08 * state.macro.fundingMultiplier);
        state.cash += raised;
        state.investorConfidence += 8;
        state.valuation = Math.round(state.valuation * 1.15);
        state.log.push(`Closed a round for $${raised.toLocaleString()}.`);
        break;
      }
      case "ipo": {
        state.flags.ipoCompleted = true;
        state.cash += 2_000_000;
        state.valuation = Math.round(state.valuation * 1.4);
        state.investorConfidence += 20;
        state.log.push("IPO priced. The ticker is live.");
        break;
      }
      case "mobile_app": {
        const mrr = initialProductMrr(state, 58, "premium");
        state.products.push({
          id: `mobile-${state.calendar.index}`,
          name: `${state.companyName} Mobile`,
          kind: "product",
          stage: "live",
          quality: 58,
          visitorsBoost: 400,
          revenueMonthly: mrr,
          monthsLive: 0,
        });
        state.log.push(`Shipped mobile app at $${mrr.toLocaleString()}/mo.`);
        break;
      }
      case "ai_product": {
        const mrr = initialProductMrr(state, 72, "enterprise");
        state.products.push({
          id: `ai-${state.calendar.index}`,
          name: `${state.companyName} Copilot`,
          kind: "ai",
          stage: "live",
          quality: 72,
          visitorsBoost: 250,
          revenueMonthly: mrr,
          monthsLive: 0,
        });
        state.log.push(`Launched AI product at $${mrr.toLocaleString()}/mo — watch the GPU bill.`);
        break;
      }
      case "acquire": {
        const targetId = plan.payload?.targetId;
        const target = state.acquisitions.find((t) => t.id === targetId);
        if (target) {
          state.ownedAcquisitions.push(target.id);
          state.visitors += target.visitors;
          state.valuation += target.synergy;
          state.acquisitions = state.acquisitions.filter((t) => t.id !== target.id);
          state.log.push(`Acquired ${target.name}.`);
        } else {
          state.log.push("Acquisition fell through — target no longer available.");
        }
        break;
      }
      case "research_tick": {
        const node = state.research.find((r) => !r.completed && r.unlocked);
        if (node) {
          node.progress += 1;
          if (node.progress >= node.months) {
            node.completed = true;
            state.brand += 10;
            state.investorConfidence += 5;
            state.log.push(`Research complete: ${node.label}.`);
          }
        }
        break;
      }
      default:
        break;
    }
  }
  state.plannedActions = [];
}

export function queueAction(
  state: GameState,
  actionKey: string,
  payload?: Record<string, string>
): { ok: boolean; reason?: string } {
  const def = ACTION_CATALOG.find((a) => a.key === actionKey);
  if (!def) return { ok: false, reason: "Unknown action." };

  if (actionKey === "acquire") {
    const targetId = payload?.targetId;
    const target = state.acquisitions.find((t) => t.id === targetId);
    if (!target) return { ok: false, reason: "Select a target on the Rivals tab." };
    if (
      state.plannedActions.some(
        (p) => p.actionKey === "acquire" && p.payload?.targetId === targetId
      )
    ) {
      return { ok: false, reason: "That target is already queued." };
    }
    if (state.flags.gameOver || state.flags.ended) return { ok: false, reason: "Run ended." };
    if (state.apLeft < def.ap) return { ok: false, reason: "Not enough action points." };
    if (state.cash < plannedCash(state) + target.price) {
      return { ok: false, reason: "Not enough cash." };
    }
    state.plannedActions.push({
      id: `${state.calendar.index}-acquire-${targetId}`,
      actionKey,
      label: `Acquire ${target.name}`,
      cashCost: target.price,
      apCost: def.ap,
      payload,
    });
    state.apLeft -= def.ap;
    return { ok: true };
  }

  const bank = bankActionByKey(actionKey);
  if (bank && state.monthlyDeck.includes(actionKey)) {
    const deckDef = bankToDef(bank);
    const check = canQueueAction(state, deckDef, actionKey);
    if (!check.ok) return check;
    const cash = bankCashCost(state, bank);
    state.plannedActions.push({
      id: `${state.calendar.index}-${actionKey}-${state.plannedActions.length}`,
      actionKey,
      label: bank.label,
      cashCost: cash,
      apCost: bank.ap,
      payload,
    });
    state.apLeft -= bank.ap;
    return { ok: true };
  }

  const check = canQueueAction(state, def);
  if (!check.ok) return check;
  const cash = cashForAction(state, def);
  state.plannedActions.push({
    id: `${state.calendar.index}-${actionKey}-${state.plannedActions.length}`,
    actionKey,
    label: actionLabel(def, state),
    cashCost: cash,
    apCost: def.ap,
    payload,
  });
  state.apLeft -= def.ap;
  return { ok: true };
}

export function unqueueAction(state: GameState, id: string): void {
  const idx = state.plannedActions.findIndex((p) => p.id === id);
  if (idx < 0) return;
  const row = state.plannedActions[idx]!;
  state.apLeft += row.apCost;
  state.plannedActions.splice(idx, 1);
}

export function normalizeLoadedState(state: GameState): GameState {
  if (!state.firedEvents) state.firedEvents = [];
  return state;
}
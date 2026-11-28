import type { ResearchNode } from "./types";

export function defaultResearch(): ResearchNode[] {
  return [
    {
      id: "html-forms",
      label: "HTML forms & guestbooks",
      era: "early",
      cost: 500,
      months: 1,
      unlocked: true,
      completed: false,
      progress: 0,
    },
    {
      id: "search-index",
      label: "On-site search index",
      era: "dotcom",
      cost: 1200,
      months: 2,
      unlocked: false,
      completed: false,
      progress: 0,
    },
    {
      id: "social-graph",
      label: "Social graph v0",
      era: "web2",
      cost: 4000,
      months: 3,
      unlocked: false,
      completed: false,
      progress: 0,
    },
    {
      id: "mobile-sdk",
      label: "Mobile SDK",
      era: "mobile",
      cost: 8000,
      months: 2,
      unlocked: false,
      completed: false,
      progress: 0,
    },
    {
      id: "payments-rail",
      label: "Payments rail",
      era: "platform",
      cost: 6000,
      months: 2,
      unlocked: false,
      completed: false,
      progress: 0,
    },
    {
      id: "ai-models",
      label: "Fine-tuned model stack",
      era: "ai",
      cost: 15000,
      months: 3,
      unlocked: false,
      completed: false,
      progress: 0,
    },
  ];
}

export function unlockResearchForYear(year: number, nodes: ResearchNode[]): void {
  if (year >= 2000) nodes.find((n) => n.id === "search-index")!.unlocked = true;
  if (year >= 2005) nodes.find((n) => n.id === "social-graph")!.unlocked = true;
  if (year >= 2010) nodes.find((n) => n.id === "mobile-sdk")!.unlocked = true;
  if (year >= 2016) nodes.find((n) => n.id === "payments-rail")!.unlocked = true;
}
import { profile, siteConfig, ventures } from "@/lib/profile";

export const servicesContact = {
  email: profile.email,
  phoneDisplay: "865.441.5476",
  phoneTel: "+18654415476",
} as const;

export const serviceOfferings = [
  {
    name: "Custom software development",
    summary:
      "Full-stack web apps, internal tools, APIs, and integrations—built for maintainability and real production constraints.",
    bullets: [
      "Next.js, React, and Node backends",
      "Real-time features (WebRTC, live dashboards, classroom-scale load)",
      "Third-party APIs, LMS and payment integrations",
      "Performance, observability, and deployment pipelines",
    ],
  },
  {
    name: "Technical consulting",
    summary:
      "Architecture reviews, roadmap input, and hands-on guidance when you need a senior engineer who has shipped under pressure.",
    bullets: [
      "System design and trade-off documentation",
      "Codebase audits and refactor planning",
      "Edtech, SaaS, and data-heavy product domains",
      "Team onboarding and technical hiring support",
    ],
  },
  {
    name: "Prototyping & simulation",
    summary:
      "Browser games, simulators, and interactive demos—like the Work projects on this site—useful for pitches, training, or R&D.",
    bullets: [
      "Gameplay and simulation logic in TypeScript",
      "Physics and strategy mechanics",
      "Playable web demos without app-store friction",
      "Iterative prototyping with clear milestones",
    ],
  },
  {
    name: "Founder & product engineering",
    summary:
      "Early-stage build partner work: MVP scope, foundation code, and the first features investors and users can touch.",
    bullets: [
      "MVP definition and thin-slice delivery",
      "Auth, billing, and admin foundations",
      "Analytics and error tracking from day one",
      "Honest timelines for solo-founder bandwidth",
    ],
  },
] as const;

export const servicesFaqs = [
  {
    question: "What kinds of technical services do you offer?",
    answer:
      "Software development, architecture and code consultation, interactive prototypes, and founder-stage engineering—especially for web products, edtech, and simulation-heavy experiences.",
  },
  {
    question: "Where are you located? Do you work remotely?",
    answer: `I'm based in ${siteConfig.location} and work with clients across the United States. Remote collaboration is the default; on-site or local meetings in East Tennessee can be arranged when useful.`,
  },
  {
    question: "How do I start a project or consultation?",
    answer: `Email ${servicesContact.email} or call ${servicesContact.phoneDisplay} with a short description of your goals, timeline, and budget range. I'll reply with next steps—no contact form on this site.`,
  },
  {
    question: "Are you available for contract or part-time work?",
    answer:
      "Yes. Engagements are typically project-based or a defined monthly retainer, depending on scope. Full-time employment is not the focus of this page; founder roles at ClassQuip and Novux Games remain my primary commitments.",
  },
  {
    question: "What is your background?",
    answer: `Nearly a decade in K–12 edtech (including Stride/K12), co-founding ${ventures.classQuip.name}, founding ${ventures.novuxGames.name}, and shipping personal browser projects documented under Work on this site.`,
  },
] as const;

/** Knoxville, TN — approximate center for geo metadata (not a street address). */
export const serviceGeo = {
  locality: "Knoxville",
  region: "TN",
  country: "US",
  latitude: 35.9606,
  longitude: -83.9207,
} as const;
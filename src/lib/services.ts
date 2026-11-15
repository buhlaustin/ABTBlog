import { profile, siteConfig } from "@/lib/profile";

export const servicesContact = {
  email: profile.email,
  phoneDisplay: "865.441.5476",
  phoneTel: "+18654415476",
} as const;

export const serviceOfferings = [
  {
    name: "Software development",
    summary:
      "Web apps, APIs, and integrations—usually Next.js/React/Node, with an eye toward what breaks in production.",
    bullets: [
      "Greenfield products and hardened legacy code",
      "Real-time and classroom-scale systems",
      "LMS, payments, and third-party integrations",
    ],
  },
  {
    name: "Consultation",
    summary:
      "Architecture reviews, scope sanity checks, and pairing when you need another senior set of eyes.",
    bullets: [
      "System design and codebase audits",
      "Edtech, SaaS, and simulation-heavy domains",
    ],
  },
  {
    name: "Prototypes",
    summary:
      "Browser demos and sims in the vein of the projects under Work—good for pitches, training, or trying mechanics.",
    bullets: [
      "TypeScript gameplay and simulation logic",
      "Shipped in the browser, no store required",
    ],
  },
] as const;

export const servicesFaqs = [
  {
    question: "What do you actually do for clients?",
    answer:
      "Build software, advise on architecture, or ship a prototype. Most of my depth is web product work, K–12 edtech, and simulation-style apps.",
  },
  {
    question: "Where are you based?",
    answer: `${siteConfig.location}. Remote is normal; local meetings in East Tennessee when it helps.`,
  },
  {
    question: "How do we start?",
    answer: `Email ${servicesContact.email} or call ${servicesContact.phoneDisplay}. A few sentences on what you need and your timeline is enough.`,
  },
  {
    question: "Full-time hire?",
    answer:
      "Usually project or retainer work. Email me with what you need and we can see if timing fits.",
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
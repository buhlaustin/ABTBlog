import { profile } from "@/lib/profile";

export const servicesContact = {
  email: profile.email,
  phoneDisplay: "865.441.5476",
  phoneTel: "+18654415476",
  bookingUrl: "[BOOKING_URL]",
  bookingLabel: "Book a 20-minute call",
} as const;

export type ServiceOffer = {
  slug: string;
  name: string;
  oneLiner: string;
  idealFor: string;
  includes: readonly string[];
  deliverables: readonly string[];
  timeframe: string;
  price: string;
  priceNote: string;
  cta: string;
  seoTitle: string;
  seoDescription: string;
  relatedWritingPath?: string;
};

/** Meta + hero copy for /services/ (single source for page and JSON-LD). */
export const servicesPageSeo = {
  title: "EdTech Integration Consultant: LTI 1.3, OneRoster, WebRTC",
  metaDescription:
    "Fixed-scope LTI 1.3 and OneRoster integration sprints, district-readiness audits, and fractional edtech engineering retainers. Austin Buhl, Knoxville, TN, remote US.",
  h1: "Integration and real-time engineering for edtech teams",
  locationLine: "Knoxville, TN · Remote US",
  lead:
    "Districts buy products that plug into their LMS, sync their rosters, and run on their network. I build that part, so your sales team stops losing deals in IT review.",
  support:
    "Three ways to work together, from a two-week audit to an ongoing retainer. Other Next.js, Node, AWS, and browser-sim work is welcome too. See the bottom of the page.",
} as const;

export const serviceOffers: readonly ServiceOffer[] = [
  {
    slug: "district-readiness-audit",
    name: "District-Readiness Audit",
    oneLiner:
      "A hard look at your product before a pilot, an RFP, or a big district's IT review.",
    idealFor:
      "Teams heading into a pilot or security review who want to know what will break first.",
    includes: [
      "Walkthrough of your LTI 1.3 launch flow and token handling",
      "Review of roster sync (OneRoster, Clever, ClassLink) and how you handle drift",
      "Live video and real-time behavior on filtered, low-bandwidth networks",
      "Attendance and session logging against what districts ask for in audits",
      "Rollout risks: SSO, Chromebook constraints, browser policies",
    ],
    deliverables: [
      "Written report with a ranked fix list",
      "60-minute walkthrough with your team",
      "Rough estimate for each fix",
    ],
    timeframe: "[confirm] 2 weeks",
    price: "[PRICE]",
    priceNote:
      "Fixed fee. [confirm] Credited toward an Integration Sprint if you start within 30 days.",
    cta: "Book a 20-minute call",
    seoTitle: "District-Readiness Audit for EdTech Products",
    seoDescription:
      "A hard look at your edtech product before a pilot or district IT review—LTI 1.3, roster sync, live video, and audit-ready logging with a ranked fix list.",
    relatedWritingPath: "/blog/oneroster-lti-plain-english/",
  },
  {
    slug: "lti-oneroster-integration-sprint",
    name: "LTI 1.3 + OneRoster Integration Sprint",
    oneLiner:
      "Your tool launching from the LMS and rostered from the SIS, built in your repo and ready for district rollout.",
    idealFor:
      "Edtech companies losing or delaying deals because the integration isn't done or doesn't hold up.",
    includes: [
      "LTI 1.3 tool launch (OIDC login, JWT validation, deployments, deep linking as needed)",
      "LTI Advantage services in scope: Names and Roles, Assignment and Grade Services",
      "OneRoster rostering sync with drift and late-roster handling, plus Clever/ClassLink if your districts use them",
      "Testing against [LMS_LIST] sandboxes",
      "Weekly demo and written status",
    ],
    deliverables: [
      "Merged, reviewed code in your repo",
      "Setup guide for district admins",
      "Runbook for your support team",
      "Handoff session with your engineers",
    ],
    timeframe: "[confirm] 6 weeks",
    price: "[PRICE]",
    priceNote: "Fixed scope, agreed in writing before we start.",
    cta: "Book a 20-minute call",
    seoTitle: "LTI 1.3 + OneRoster Integration Sprint for EdTech Teams",
    seoDescription:
      "Fixed-scope sprint: LTI 1.3 tool launch, LTI Advantage, OneRoster and Clever/ClassLink rostering, tested in your repo and ready for district IT review.",
    relatedWritingPath: "/blog/oneroster-lti-plain-english/",
  },
  {
    slug: "fractional-edtech-engineering-retainer",
    name: "Fractional EdTech Engineering Retainer",
    oneLiner:
      "A senior engineer who owns your integrations and real-time stack every month, without a full-time hire.",
    idealFor:
      "Teams with live district customers who need integrations kept healthy and new ones shipped.",
    includes: [
      "[confirm] [HOURS_OR_DAYS] per month of hands-on engineering",
      "Ownership of LMS, rostering, and SSO integrations",
      "Escalation help when a district's IT team reports a problem",
      "Architecture and code review for your team",
      "Priority availability in back-to-school windows [confirm]",
    ],
    deliverables: [
      "Monthly written summary of shipped work and open risks",
      "Shared channel with a [RESPONSE_TIME] response target on business days",
    ],
    timeframe: "Monthly, [confirm] 3-month minimum",
    price: "[PRICE]/month",
    priceNote: "Billed monthly in advance. Limited to a few clients at a time.",
    cta: "Book a 20-minute call",
    seoTitle: "Fractional EdTech Engineering Retainer",
    seoDescription:
      "Monthly retainer: a senior engineer owns LMS integrations, rostering, SSO, and real-time classroom systems for edtech teams with live district customers.",
  },
] as const;

export function getServiceOfferBySlug(
  slug: string,
): ServiceOffer | undefined {
  return serviceOffers.find((offer) => offer.slug === slug);
}

export function getAllServiceOfferSlugs(): string[] {
  return serviceOffers.map((offer) => offer.slug);
}

export const serviceProcess = [
  "20-minute call: you tell me what's blocking the deal.",
  "Written scope and fixed price within [confirm] 2 business days.",
  "Work happens in your repo, with weekly demos.",
  "Handoff with docs your team and district admins can use.",
] as const;

export const serviceOfferings = [
  {
    name: "Ship Production Software",
    summary:
      "Next.js and Node web apps through deploy—real-time data, AWS, and legacy stabilization when you need a release.",
  },
  {
    name: "Sanity-Check Your Architecture",
    summary:
      "System reviews and senior pairing before you commit months to a rewrite or the wrong stack.",
  },
  {
    name: "Build Interactive Sims & Demos",
    summary:
      "Browser TypeScript prototypes for training sims, game mechanics, or stakeholder demos without app-store friction.",
  },
] as const;

export const serviceAudience = [
  {
    title: "EdTech & K–12 vendors",
    body: "Classroom real-time features, roster sync, compliance-friendly attendance, and integrations that survive district firewalls and budget Chromebooks.",
  },
  {
    title: "Startups & SaaS teams",
    body: "MVP hardening, API design, billing, and the first production deploy when you need a senior builder.",
  },
  {
    title: "East Tennessee businesses",
    body: "Knoxville and East Tennessee—local meetings when useful, same remote delivery as anywhere in the US.",
  },
] as const;

export const serviceTechnologies = [
  "Next.js & React",
  "TypeScript & Node.js",
  "WebRTC & real-time systems",
  "LTI 1.3 · OneRoster · LMS APIs",
  "AWS · Postgres · payments",
  "Browser games & simulations",
] as const;

export const servicesFaqs = [
  {
    question: "What EdTech and K–12 experience do you bring?",
    answer:
      "Nearly a decade in K–12 and virtual learning: real-time classroom software, WebRTC on constrained networks, roster and grade passback (LTI, OneRoster), and production ops for district-scale deployments. I co-founded ClassQuip around those constraints.",
  },
  {
    question: "What technologies do you use for web applications?",
    answer:
      "Modern TypeScript stacks—usually Next.js, React, and Node—with AWS for hosting, plus integrations for payments, auth, and LMS platforms. I choose boring, maintainable tools that match your team and timeline.",
  },
  {
    question: "How are projects priced?",
    answer:
      "Audits and sprints are fixed fees. Retainers are a flat monthly rate. Prices are listed on each offer, and the final number depends on scope, which we agree on in writing before any work starts.",
  },
  {
    question: "How do we kick things off?",
    answer:
      "Book a 20-minute call, or email abuhl@classquip.com with what you're building and where it's stuck. No formal RFP needed.",
  },
  {
    question: "How soon can you start?",
    answer:
      "Usually within [START_WINDOW]. Retainer spots are limited, so ask early if you have a back-to-school or pilot deadline.",
  },
  {
    question: "Who owns the code?",
    answer:
      "You do. Everything lives in your repo under your accounts. I'm happy to sign your NDA.",
  },
  {
    question: "Which LMS and SIS platforms have you worked with?",
    answer:
      "Canvas, Brightspace, Clever, ClassLink, and PowerSchool from my years supporting virtual schools at Stride, plus LTI 1.3 Advantage and OneRoster in ClassQuip. [ADD_OTHERS]",
  },
  {
    question: "Are you open to full-time roles?",
    answer:
      "I focus on project-based and retainer contract work. I'm happy to hear about interesting problems, but full-time employment isn't the default.",
  },
  {
    question: "Do we have to meet in person?",
    answer:
      "No. Remote is normal. If you're in the Knoxville or greater East Tennessee area, I'm glad to meet for coffee or a working session when it helps.",
  },
  {
    question: "Are you a freelance software developer in Knoxville, Tennessee?",
    answer:
      "Yes. I'm a Knoxville-based software engineer and founder offering contract development and technical consulting. Local clients can meet in person in East Tennessee; I also work with teams nationwide.",
  },
  {
    question: "Do you take remote software consulting projects outside Tennessee?",
    answer:
      "Yes. Most engagements are remote across the United States. I collaborate through your repo, async docs, and scheduled video check-ins—Eastern Time friendly, with async handoffs for other US time zones.",
  },
] as const;

export const servicesSchema = {
  serviceTypes: [
    "Software Development",
    "Technical Consulting",
    "Web Application Development",
    "EdTech Consulting",
    "Custom Software Development",
  ],
  knowsAbout: [
    "Software engineering",
    "Next.js",
    "React",
    "TypeScript",
    "Node.js",
    "K-12 education technology",
    "LTI 1.3",
    "LTI Advantage",
    "OneRoster",
    "Clever",
    "ClassLink",
    "Canvas LMS",
    "Brightspace",
    "PowerSchool",
    "K-12 rostering",
    "Grade passback",
    "WebRTC",
    "SaaS",
    "System architecture",
  ],
} as const;

/** Knoxville, TN — approximate center for geo metadata (not a street address). */
export const serviceGeo = {
  locality: "Knoxville",
  region: "TN",
  country: "US",
  latitude: 35.9606,
  longitude: -83.9207,
} as const;

export const serviceAreaNames = [
  "United States",
  "Tennessee",
  "Knoxville",
  "East Tennessee",
] as const;
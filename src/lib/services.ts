import { profile } from "@/lib/profile";

export const servicesContact = {
  email: profile.email,
  phoneDisplay: "865.441.5476",
  phoneTel: "+18654415476",
} as const;

/** Meta + hero copy for /services/ (single source for page and JSON-LD). */
export const servicesPageSeo = {
  title: "Knoxville Software Consultant & Contract Developer",
  metaDescription:
    "Senior freelance software developer in Knoxville, TN—contract web apps, EdTech, SaaS, and architecture consulting. Remote across the US. Email or call 865.441.5476.",
  h1: "Contract Software Development & Technical Consulting",
  locationLine: "Knoxville, TN · Remote US",
  lead:
    "I help founders and product teams ship production software—and recover momentum when architecture or legacy code is in the way. Based in Knoxville, Tennessee, available nationwide for remote contract engineering and consulting.",
  support:
    "Typical engagements: greenfield Next.js products, K–12 EdTech and LMS integrations, SaaS APIs, and browser-based simulations. East Tennessee clients can meet locally; everyone else gets the same senior hands-on delivery remotely.",
} as const;

export const serviceOfferings = [
  {
    name: "Ship Production Software",
    summary:
      "End-to-end web apps and APIs using Next.js, React, TypeScript, and Node. I handle the messy parts: real-time classroom data, payment pipelines, LTI 1.3 and OneRoster integrations, AWS deployment, and stabilizing legacy systems so you can release with confidence.",
  },
  {
    name: "Sanity-Check Your Architecture",
    summary:
      "Second-opinion system reviews, scope sanity checks, and senior pairing. If you need to know whether your stack will scale—or how to untangle a rewrite— we align on a plan before you burn months of dev time.",
  },
  {
    name: "Build Interactive Sims & Demos",
    summary:
      "High-performance TypeScript prototypes that run in the browser. Ideal for game mechanics, training simulations, stakeholder demos, or validating UX before a full build—without app-store friction.",
  },
] as const;

export const serviceAudience = [
  {
    title: "Startups & SaaS teams",
    body: "MVP hardening, API design, billing, and the first production deploy—when you need a senior builder, not a dev shop roster.",
  },
  {
    title: "EdTech & K–12 vendors",
    body: "Classroom real-time features, roster sync, compliance-friendly attendance, and integrations that survive district firewalls and budget Chromebooks.",
  },
  {
    title: "East Tennessee businesses",
    body: "Knoxville, Maryville, Oak Ridge, and the broader TRI—local meetings when useful, same remote rigor as out-of-state clients.",
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
    question: "Are you a freelance software developer in Knoxville, Tennessee?",
    answer:
      "Yes. I'm a Knoxville-based software engineer and founder offering contract development and technical consulting. Local clients can meet in person in East Tennessee; I also work with teams nationwide.",
  },
  {
    question: "Do you take remote software consulting projects outside Tennessee?",
    answer:
      "Yes. Most engagements are remote across the United States. I collaborate through your repo, async docs, and scheduled video check-ins—Eastern Time friendly, with async handoffs for other US time zones.",
  },
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
    question: "How do we kick things off?",
    answer:
      "Email abuhl@classquip.com or call 865.441.5476. You don't need a formal RFP—just a few sentences about the problem you're solving, your stack if you have one, and when you need it done.",
  },
  {
    question: "Are you open to full-time roles?",
    answer:
      "I focus on project-based and retainer contract work. I'm happy to hear about interesting problems, but full-time employment isn't the default.",
  },
  {
    question: "How are projects priced?",
    answer:
      "Fixed-scope projects and monthly retainers depending on clarity and duration. After a short intro call I can suggest structure; no hourly bait-and-switch without alignment up front.",
  },
  {
    question: "Do we have to meet in person?",
    answer:
      "No. Remote is normal. If you're in the Knoxville or greater East Tennessee area, I'm glad to meet for coffee or a working session when it helps.",
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
    "Freelance software development",
    "Knoxville Tennessee",
    "Next.js",
    "React",
    "TypeScript",
    "Node.js",
    "K-12 education technology",
    "LTI 1.3",
    "OneRoster",
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
import { profile } from "@/lib/profile";

export const servicesContact = {
  email: profile.email,
  phoneDisplay: "865.441.5476",
  phoneTel: "+18654415476",
} as const;

export const serviceOfferings = [
  {
    name: "Ship Production Software",
    summary:
      "End-to-end web apps and APIs using Next.js, React, and Node. I handle the messy parts: real-time classroom data, payment pipelines, LMS integrations, and stabilizing legacy systems.",
  },
  {
    name: "Sanity-Check Your Architecture",
    summary:
      "Second-opinion system reviews and technical pairing. If you need to know whether your current stack will hold up—or how to untangle it—we can figure it out before you waste months of dev time.",
  },
  {
    name: "Build Interactive Sims & Demos",
    summary:
      "High-performance TypeScript prototypes that run right in the browser. Great for testing game mechanics, interactive training, or giving stakeholders something tangible to click.",
  },
] as const;

export const servicesFaqs = [
  {
    question: "How do we kick things off?",
    answer:
      "Email abuhl@classquip.com or call 865.441.5476. You don't need a formal RFP—just a few sentences about the problem you're solving and when you need it done.",
  },
  {
    question: "Are you open to full-time roles?",
    answer:
      "I focus on project-based and retainer work, though I'm always open to hearing about interesting problems.",
  },
  {
    question: "Do we have to meet in person?",
    answer:
      "No, I work remotely with teams across the US. If you're in East Tennessee, happy to grab coffee.",
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
import { siteConfig } from "@/lib/site";

/** Public profile facts (aligned with https://github.com/buhlaustin). */
/** Shown on blog posts and author cards. */
export const authorCard = {
  name: "Austin Buhl",
  shortBio:
    "Co-Founder & CEO of ClassQuip in Knoxville, TN. I build low-latency WebRTC for K–12, browser games like House of Strategy, and open-source tools when I’m not in the classroom stack.",
} as const;

export const profile = {
  role: "Co-Founder & CEO",
  company: "ClassQuip",
  companyUrl: "https://www.classquip.com",
  previousEmployer: "Stride / K12",
  avatarUrl: "https://avatars.githubusercontent.com/u/287395945?v=4",
  linkedIn: "https://www.linkedin.com/in/austinbuhl20",
  email: "abuhl@classquip.com",
  bioParagraphs: [
    "I'm a builder and software engineer in Knoxville, TN—Co-Founder and CEO of ClassQuip.",
    "For the better part of a decade I've worked inside real-time software and K–12 edtech, mostly on the ground: support with IT directors at 7 AM, teachers mid-lesson when a tab freezes, and streams that die on district firewalls and student Chromebooks. That work taught me to treat a live classroom as an environment, not a feature checklist.",
    "I founded ClassQuip to build a classroom engine from scratch for those constraints—custom low-latency WebRTC on AWS, unified teacher workflows, and compliance tooling (LTI 1.3, OneRoster) so attendance and participation logging doesn't land on teachers after school.",
    "When I'm not in the edtech stack, I build browser simulations, games, and open-source tools—the same engineering muscle, different playgrounds.",
  ] as const,
} as const;

export type QuickFact = {
  label: string;
  value: string;
};

export const quickFacts: QuickFact[] = [
  { label: "Born", value: "June 5, 1998" },
  { label: "Sign", value: "Gemini" },
  { label: "Based in", value: "Knoxville, TN" },
  { label: "Politics", value: "Independent" },
  { label: "Work", value: "Co-Founder & CEO, ClassQuip" },
  { label: "Before that", value: "Stride / K12 (edtech operations)" },
];

export type OpenSourceHighlight = {
  name: string;
  href: string;
  blurb: string;
  languages: string[];
  /** Link to a page on this site when the project is hosted or documented here. */
  sitePath?: string;
};

/** Curated from public GitHub repos (excluding profile/dotfiles and this site’s repo). */
export const openSourceHighlights: OpenSourceHighlight[] = [
  {
    name: "hvit-engine",
    href: "https://github.com/buhlaustin/hvit-engine",
    sitePath: "/work/hvit-engine/",
    blurb:
      "Particle-mesh framework for relativistic stellar collisions near black holes—modeling compressible plasma hydrodynamics and HVIT kinetic signatures with Python, AMUSE, and CUDA.",
    languages: ["Python"],
  },
  {
    name: "House of Strategy (HOS)",
    href: "https://github.com/buhlaustin/HOS",
    sitePath: "/work/hos/",
    blurb:
      "Single-player text-based social strategy game inspired by reality competition shows—alliances, competitions, and evictions in the browser.",
    languages: ["JavaScript"],
  },
  {
    name: "Cursor Cloud to Paxel Converter",
    href: "https://github.com/buhlaustin/Cursor-Cloud-to-Paxel-Converter",
    sitePath: "/work/cursor-cloud-to-paxel-converter/",
    blurb:
      "Unofficial bridge that exports Cursor Cloud Agent transcripts, converts them to Paxel's format, and uploads them for founder reflection and session analysis.",
    languages: ["Python"],
  },
  {
    name: "AmericanPong",
    href: "https://github.com/buhlaustin/AmericanPong",
    blurb:
      "Patriotic paddle Pong as a web app—classic CPU vs. player, first to 7 wins.",
    languages: ["JavaScript"],
  },
  {
    name: "AmericanPongMobile",
    href: "https://github.com/buhlaustin/AmericanPongMobile",
    blurb:
      "Mobile Android build of American Pong with four game modes, power-ups, campaign levels, touch controls, and procedural audio.",
    languages: ["TypeScript"],
  },
];

export { siteConfig };

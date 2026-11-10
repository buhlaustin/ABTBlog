import { siteConfig } from "@/lib/site";

/** Public profile facts (aligned with https://github.com/buhlaustin). */
/** Shown on blog posts and author cards. */
export const authorCard = {
  name: "Austin Buhl",
  shortBio:
    "Co-Founder & CEO of ClassQuip and Founder of Novux Games in Knoxville, TN. I build low-latency WebRTC for K–12, browser games and simulations at novux.dev, and open-source tools when an idea won’t leave me alone.",
} as const;

export type Venture = {
  name: string;
  url: string;
  role: string;
  /** Human-readable founding month/year for bios and quick facts. */
  founded: string;
};

export const ventures = {
  classQuip: {
    name: "ClassQuip",
    url: "https://www.classquip.com",
    role: "Co-Founder & CEO",
    founded: "September 2026",
  },
  novuxGames: {
    name: "Novux Games",
    url: "https://novux.dev",
    role: "Founder",
    founded: "November 2026",
  },
} satisfies Record<string, Venture>;

/** Founder roles in display order (newest venture first). */
export const founderVentures: Venture[] = [
  ventures.novuxGames,
  ventures.classQuip,
];

/** Single-line summary for bylines, hero asides, and quick scanning. */
export const profileWorkLine =
  "Co-Founder & CEO, ClassQuip · Founder, Novux Games";

export const profile = {
  role: "Software Engineer & Founder",
  ventures: founderVentures,
  workLine: profileWorkLine,
  /** Primary edtech company — prefer `ventures.classQuip` for links. */
  company: ventures.classQuip.name,
  companyUrl: ventures.classQuip.url,
  novuxUrl: ventures.novuxGames.url,
  previousEmployer: "Stride / K12",
  avatarUrl: "https://avatars.githubusercontent.com/u/287395945?v=4",
  linkedIn: "https://www.linkedin.com/in/austinbuhl20",
  email: "abuhl@classquip.com",
  bioParagraphs: [
    `I'm a builder and software engineer in Knoxville, TN—Co-Founder and CEO of ClassQuip (founded ${ventures.classQuip.founded}) and Founder of Novux Games (founded ${ventures.novuxGames.founded}).`,
    "For the better part of a decade I've worked inside real-time software and K–12 edtech, mostly on the ground: support with IT directors at 7 AM, teachers mid-lesson when a tab freezes, and streams that die on district firewalls and student Chromebooks. That work taught me to treat a live classroom as an environment, not a feature checklist.",
    "I founded ClassQuip to build a classroom engine from scratch for those constraints—custom low-latency WebRTC on AWS, unified teacher workflows, and compliance tooling (LTI 1.3, OneRoster) so attendance and participation logging doesn't land on teachers after school.",
    "Novux Games is the home for browser simulations, indie games, and playable experiments—the work you'll find at novux.dev and under Work on this site—using the same engineering discipline, different product lane.",
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
  {
    label: "ClassQuip",
    value: `${ventures.classQuip.role} (founded ${ventures.classQuip.founded})`,
  },
  {
    label: "Novux Games",
    value: `${ventures.novuxGames.role} (founded ${ventures.novuxGames.founded})`,
  },
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

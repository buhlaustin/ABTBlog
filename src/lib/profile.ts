import { siteConfig } from "@/lib/site";

/** Public profile facts (aligned with https://github.com/buhlaustin). */
/** Shown on blog posts and author cards. */
export const authorCard = {
  name: "Austin Buhl",
  shortBio:
    "Co-Founder & CEO of ClassQuip and founder of Novux Games in Knoxville. K–12 classroom software by day; Dynasty: College Basketball on Android at Novux; browser toys and open source when I can't help myself.",
} as const;

export type Venture = {
  name: string;
  url: string;
  role: string;
  /** For resume timeline / long-form copy only—not hero intros. */
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

/** Novux’s in-development title (not the personal projects on this site). */
export const novuxFlagship = {
  name: "Dynasty: College Basketball",
  platform: "Android",
  status: "in development",
} as const;

/** Founder roles in display order (newest venture first). */
export const founderVentures: Venture[] = [
  ventures.novuxGames,
  ventures.classQuip,
];

/** Single-line summary for bylines, hero asides, and quick scanning. */
export const profileWorkLine =
  "Co-Founder & CEO, ClassQuip · Founder, Novux Games";

export const profile = {
  role: "Software Engineer & Builder",
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
  /** Homepage hero only. */
  hero: {
    tagline: "Software Engineer & Builder | Knoxville, TN",
    lead:
      "Driven by hard problems, clean architectures, and data-heavy systems. My work spans everything from founding and building ed-tech infrastructure at ClassQuip to engineering possession-level simulation engines with Novux Games (Dynasty: College Basketball).",
    support:
      "The projects under Work are my personal sandbox—simulators, tools, and side projects built to explore mechanics independently of Novux releases.",
    sideProjectsCta: "View Side Projects",
  } as const,
  bioParagraphs: [
    "I'm a builder in Knoxville—Co-Founder and CEO of ClassQuip and founder of Novux Games.",
    "For the better part of a decade I've worked inside real-time software and K–12 edtech, mostly on the ground: support with IT directors at 7 AM, teachers mid-lesson when a tab freezes, and streams that die on district firewalls and student Chromebooks. That work taught me to treat a live classroom as an environment, not a feature checklist.",
    "I founded ClassQuip to build a classroom engine from scratch for those constraints—custom low-latency WebRTC on AWS, unified teacher workflows, and compliance tooling (LTI 1.3, OneRoster) so attendance and participation logging doesn't land on teachers after school.",
    `At Novux Games the focus is ${novuxFlagship.name}, an ${novuxFlagship.platform} title ${novuxFlagship.status}. I still ship browser experiments and open source on my own—House of Strategy, Startup Simulator, and the rest live here under Work, separate from the studio.`,
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
  { label: "ClassQuip", value: ventures.classQuip.role },
  {
    label: "Novux Games",
    value: `${ventures.novuxGames.role} — ${novuxFlagship.name} (${novuxFlagship.platform})`,
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

import { siteConfig } from "@/lib/site";

/** Public profile facts (aligned with https://github.com/buhlaustin). */
export const profile = {
  role: "Co-Founder & CEO",
  company: "ClassQuip",
  companyUrl: "https://www.classquip.com",
  previousEmployer: "Stride / K12",
  avatarUrl: "https://avatars.githubusercontent.com/u/287395945?v=4",
  linkedIn: "https://www.linkedin.com/in/austinbuhl20",
  email: "abuhl@classquip.com",
  bioParagraphs: [
    "I'm a builder and software engineer based in Knoxville, TN.",
    "Over the past eight years, my focus has been on real-time software and K–12 education technology. Having spent over seven years supporting teachers, students, and school administrators on platform operations, I saw firsthand how existing video and virtual learning platforms fail in real-world environments—crashing budget hardware, choking on weak home Wi-Fi, and creating massive attendance compliance burdens for districts.",
    "That experience led me to found ClassQuip, where I serve as CEO and system architect. I designed and built our custom, low-latency AWS WebRTC media engine specifically for low-spec K–12 hardware, bringing video infrastructure costs down to $0.50 per seat while delivering zero-drop reliability. My work spans deep media pipeline engineering, LTI 1.3 / OneRoster LMS integrations, and building scalable software that removes administrative friction from classrooms.",
    "Outside of core edtech, I regularly design interactive simulations, browser-based games, and open-source developer tools.",
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

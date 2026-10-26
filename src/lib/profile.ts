import { siteConfig } from "@/lib/site";

/** Public profile facts (aligned with https://github.com/buhlaustin). */
export const profile = {
  tagline:
    "Co-Founder & CEO at ClassQuip. Former Stride / K12. Builder of edtech, simulations, games, and dev tools.",
  bio: "Building a better virtual classroom experience for K–12.",
  role: "Co-Founder & CEO",
  company: "ClassQuip",
  companyUrl: "https://www.classquip.com",
  previousEmployer: "Stride / K12",
  avatarUrl: "https://avatars.githubusercontent.com/u/287395945?v=4",
  githubOrg: {
    name: "ClassQuip",
    url: "https://github.com/ClassQuip",
  },
} as const;

export type OpenSourceHighlight = {
  name: string;
  href: string;
  blurb: string;
  languages: string[];
  /** Link to a page on this site when we host or document the project. */
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
    blurb: "Turn Cursor Cloud tool definitions into Paxel-compatible formats.",
    languages: ["Python"],
  },
  {
    name: "AmericanPong",
    href: "https://github.com/buhlaustin/AmericanPong",
    blurb:
      "A patriotic twist on a classic arcade game for America’s 250th birthday.",
    languages: ["JavaScript"],
  },
  {
    name: "AmericanPongMobile",
    href: "https://github.com/buhlaustin/AmericanPongMobile",
    blurb: "Android take on AmericanPong.",
    languages: ["TypeScript"],
  },
];

export { siteConfig };

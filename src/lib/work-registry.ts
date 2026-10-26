export type WorkKind = "hosted" | "external";
export type WorkStatus = "live" | "wip" | "archived";

export interface WorkItem {
  slug: string;
  title: string;
  summary: string;
  kind: WorkKind;
  status: WorkStatus;
  tags: string[];
  featured?: boolean;
  repoUrl?: string;
  /** Path under public/ for hosted iframe entry (e.g. /work/hos/index.html) */
  hostedEntry?: string;
}

export const workItems: WorkItem[] = [
  {
    slug: "hos",
    title: "House of Strategy",
    summary:
      "A single-player text-based social strategy game inspired by reality competition shows. Outwit, outplay, outlast.",
    kind: "hosted",
    status: "live",
    tags: ["game", "javascript"],
    featured: true,
    repoUrl: "https://github.com/buhlaustin/HOS",
    hostedEntry: "/work/hos/index.html",
  },
  {
    slug: "hvit-engine",
    title: "hvit-engine",
    summary:
      "Particle-mesh simulation framework for relativistic stellar collisions near black holes (HVIT research).",
    kind: "external",
    status: "live",
    tags: ["python", "science"],
    featured: true,
    repoUrl: "https://github.com/buhlaustin/hvit-engine",
  },
  {
    slug: "cursor-cloud-to-paxel-converter",
    title: "Cursor Cloud to Paxel Converter",
    summary: "Convert Cursor Cloud tools into Paxel-compatible definitions.",
    kind: "external",
    status: "live",
    tags: ["python", "devtools"],
    repoUrl: "https://github.com/buhlaustin/Cursor-Cloud-to-Paxel-Converter",
  },
];

export function getWorkItem(slug: string): WorkItem | undefined {
  return workItems.find((item) => item.slug === slug);
}

export function getAllWorkSlugs(): string[] {
  return workItems.map((item) => item.slug);
}

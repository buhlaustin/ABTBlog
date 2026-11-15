import { workItems } from "@/lib/work-registry";
import { Reveal } from "@/components/reveal";
import { WorkCard } from "@/components/work-card";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Work",
  description:
    "Browser games, simulations, and open-source projects by Austin Buhl—hosted demos and GitHub repos.",
  path: "/work/",
});

export default function WorkIndexPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-safe py-10 sm:py-16">
      <Reveal when="mount">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Work
        </h1>
      </Reveal>
      <Reveal when="mount" delayMs={80}>
        <p className="mt-4 max-w-2xl text-muted">
          Games, tools, and experiments you can run here, plus selected
          open-source work on GitHub.
        </p>
      </Reveal>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {workItems.map((item, index) => (
          <Reveal key={item.slug} delayMs={index * 60}>
            <WorkCard item={item} />
          </Reveal>
        ))}
      </div>
    </main>
  );
}

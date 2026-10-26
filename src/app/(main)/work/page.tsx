import type { Metadata } from "next";
import { workItems } from "@/lib/work-registry";
import { WorkCard } from "@/components/work-card";

export const metadata: Metadata = {
  title: "Work",
  description: "Projects hosted on austinbuhltech.com and selected open-source work.",
};

export default function WorkIndexPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-4xl font-bold tracking-tight">Work</h1>
      <p className="mt-4 max-w-2xl text-muted">
        Games, tools, and experiments you can run here, plus selected
        open-source work on GitHub.
      </p>
      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {workItems.map((item) => (
          <WorkCard key={item.slug} item={item} />
        ))}
      </div>
    </main>
  );
}

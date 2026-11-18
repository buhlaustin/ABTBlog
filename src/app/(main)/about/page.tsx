import Image from "next/image";
import Link from "next/link";
import { ResumeTimeline } from "@/components/resume-timeline";
import {
  openSourceHighlights,
  profile,
  quickFacts,
  siteConfig,
  ventures,
} from "@/lib/profile";
import { BookCallButton } from "@/components/book-call-button";
import {
  EARLIER_COMMUNITY_GROUP_NAME,
  focusAreas,
  resumeGroups,
} from "@/lib/resume";
import { workItems } from "@/lib/work-registry";
import { Reveal } from "@/components/reveal";
import { WorkCard } from "@/components/work-card";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About",
  description: `About ${siteConfig.name}—builder and software engineer in Knoxville. ClassQuip, Novux Games (Dynasty: College Basketball), and personal Work lab.`,
  path: "/about/",
});

function AboutSection({
  title,
  children,
  className,
  centered,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}) {
  return (
    <Reveal
      className={`mt-12 border-t border-border pt-10 first:mt-0 first:border-t-0 first:pt-0 ${className ?? ""}`}
    >
      <section>
        <h2
          className={`font-display text-xl font-bold tracking-tight text-foreground ${centered ? "text-center" : ""}`}
        >
          {title}
        </h2>
        <div
          className={`mt-4 space-y-4 text-base leading-relaxed text-muted ${centered ? "mx-auto text-center" : ""}`}
        >
          {children}
        </div>
      </section>
    </Reveal>
  );
}

export default function AboutPage() {
  const featuredWork = workItems.filter((item) => item.featured);
  const primaryResumeGroups = resumeGroups.filter(
    (group) => group.name !== EARLIER_COMMUNITY_GROUP_NAME,
  );
  const earlierCommunityGroup = resumeGroups.find(
    (group) => group.name === EARLIER_COMMUNITY_GROUP_NAME,
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-safe py-10 sm:py-16">
      <Reveal when="mount">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
        <Image
          src={profile.avatarUrl}
          alt={`${siteConfig.name} headshot`}
          width={112}
          height={112}
          className="h-28 w-28 shrink-0 rounded-2xl border border-border bg-surface object-cover shadow-sm"
          priority
        />
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {siteConfig.name}
          </h1>
          <p className="mt-2 font-mono text-sm text-muted">{profile.about.tagline}</p>
          <p className="mt-4 text-base font-semibold leading-relaxed text-foreground">
            {profile.about.headline}
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted">
            {profile.about.intro}
          </p>
          <ul className="mt-4 list-none space-y-4 pl-0 text-base leading-relaxed text-foreground">
            {profile.about.pillars.map((pillar) => (
              <li key={pillar.label}>
                <span className="font-semibold text-foreground">
                  {pillar.label}:
                </span>{" "}
                {"href" in pillar && pillar.href ? (
                  <Link
                    href={pillar.href}
                    className="text-muted underline-offset-2 hover:text-accent hover:underline"
                  >
                    {pillar.body}
                  </Link>
                ) : (
                  <span className="text-muted">{pillar.body}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <a
              href={siteConfig.github}
              className="font-semibold text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub @
              {siteConfig.githubUsername}
            </a>
            <a
              href={profile.linkedIn}
              className="font-semibold text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            <a
              href={`mailto:${profile.email}`}
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              Email
            </a>
          </p>
        </div>
      </header>
      </Reveal>

      <div className="mt-14">
        <AboutSection title="Quick facts" centered>
          <dl className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
            {quickFacts.map((fact) => (
              <div
                key={fact.label}
                className="lift-card rounded-lg border border-border bg-surface px-4 py-3 text-center"
              >
                <dt className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
                  {fact.label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-foreground">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </AboutSection>

        <AboutSection title="Experience">
          <div className="text-foreground">
            <ResumeTimeline groups={primaryResumeGroups} />
            {earlierCommunityGroup ? (
              <details className="group mt-10 rounded-xl border border-border bg-surface open:bg-white open:shadow-sm">
                <summary className="font-display cursor-pointer list-none rounded-xl px-5 py-4 text-lg font-bold tracking-tight text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-2">
                    Earlier and community
                    <span
                      className="text-sm font-normal text-muted transition group-open:rotate-180"
                      aria-hidden
                    >
                      ↓
                    </span>
                  </span>
                </summary>
                <div className="border-t border-border px-5 pb-5 pt-2">
                  <ResumeTimeline
                    groups={[earlierCommunityGroup]}
                    hideGroupHeadings
                  />
                </div>
              </details>
            ) : null}
          </div>
        </AboutSection>

        <AboutSection title="Focus areas">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[280px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface">
                  <th className="px-4 py-3 font-semibold text-foreground">
                    Area
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    What I care about
                  </th>
                </tr>
              </thead>
              <tbody>
                {focusAreas.map((row) => (
                  <tr
                    key={row.area}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 align-top font-medium text-foreground">
                      {row.area}
                    </td>
                    <td className="px-4 py-3 text-muted">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AboutSection>

        <AboutSection title="Side projects & open source">
          <p>
            Browser games and simulators on this site are personal projects.
            Commercial game work runs through{" "}
            <a
              href={ventures.novuxGames.url}
              className="font-semibold text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Novux Games
            </a>
            . I also ship devtools on GitHub when an idea won&apos;t leave me
            alone.
          </p>
          <ul className="list-none space-y-6 pl-0">
            {openSourceHighlights.map((project) => (
              <li
                key={project.href}
                className="rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <a
                    href={project.href}
                    className="font-display text-lg font-bold text-foreground underline-offset-2 hover:text-accent hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.name}
                  </a>
                  <span className="font-mono text-[11px] text-muted">
                    {project.languages.join(" · ")}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed">{project.blurb}</p>
                {project.sitePath ? (
                  <p className="mt-3 text-sm">
                    <Link
                      href={project.sitePath}
                      className="font-semibold text-accent hover:text-blue-700"
                    >
                      On this site →
                    </Link>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </AboutSection>

        <AboutSection title="Playable & documented here">
          <div className="grid gap-6 sm:grid-cols-2 [&>*]:text-foreground">
            {featuredWork.map((item) => (
              <WorkCard key={item.slug} item={item} />
            ))}
          </div>
          <p className="mt-6">
            <Link
              href="/work/"
              className="font-semibold text-accent hover:text-blue-700"
            >
              All projects →
            </Link>
          </p>
        </AboutSection>

        <AboutSection title="Contact">
          <div className="not-prose mb-4">
            <BookCallButton />
          </div>
          <p>
            <a
              href={`mailto:${profile.email}`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {profile.email}
            </a>
            {" · "}
            <a
              href={profile.linkedIn}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            {" · "}
            <a
              href={siteConfig.github}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            {" · "}
            <a
              href={ventures.classQuip.url}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              ClassQuip
            </a>
            {" · "}
            <a
              href={ventures.novuxGames.url}
              className="font-medium text-accent underline-offset-2 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Novux Games
            </a>
          </p>
        </AboutSection>
      </div>
    </main>
  );
}

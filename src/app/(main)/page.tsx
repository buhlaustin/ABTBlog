import Link from "next/link";
import { BookShelf } from "@/components/book-shelf";
import { JsonLd } from "@/components/json-ld";
import { SiteLogo } from "@/components/site-logo";
import { getAllPosts } from "@/lib/blog";
import { novuxFlagship, profile, ventures } from "@/lib/profile";
import { pageMetadata, personJsonLd } from "@/lib/seo";
import { workItems } from "@/lib/work-registry";

export const metadata = pageMetadata({
  title: "Austin Buhl · Games, classroom software, and writing",
  description:
    "I'm Austin, a builder in Knoxville. This is my personal site: what I've made, what I'm working on now, and what I'm writing.",
  path: "/",
  absoluteTitle: true,
});

const latestPostCount = 6;

function formatPostDate(isoDate: string): string {
  const day = isoDate.slice(0, 10);
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function HomePage() {
  const posts = getAllPosts().slice(0, latestPostCount);

  return (
    <>
      <JsonLd data={personJsonLd()} />
      <main className="flex-1">
        <article className="mx-auto w-full max-w-3xl px-safe pb-16 pt-10 sm:pb-24 sm:pt-16">
          <header>
            <SiteLogo variant="mark" />
            <h1 className="font-display mt-8 text-[2.35rem] font-semibold leading-[1.08] tracking-tight text-foreground sm:mt-10 sm:text-5xl sm:leading-[1.05] lg:text-[3.4rem]">
              {profile.hero.headline}
            </h1>
            <p className="mt-6 max-w-[38rem] text-lg leading-relaxed text-foreground sm:text-xl">
              {profile.hero.lead}
            </p>
          </header>

          <section
            aria-labelledby="now-heading"
            className="mt-12 border-y border-border py-8 sm:mt-16"
          >
            <h2
              id="now-heading"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-muted"
            >
              Now
            </h2>
            <div className="mt-5 space-y-6">
              <p>
                <span className="font-display block text-2xl font-semibold tracking-tight text-foreground">
                  {novuxFlagship.name}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  Live in Early Access on{" "}
                  <a
                    href={novuxFlagship.storeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                  >
                    Google Play
                  </a>
                  . Novux Games.
                </span>
              </p>
              <p>
                <a
                  href={ventures.classQuip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-display text-2xl font-semibold tracking-tight text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
                >
                  {ventures.classQuip.name}
                </a>
                <span className="mt-1 block text-sm leading-relaxed text-muted">
                  Founder and CEO.
                </span>
              </p>
            </div>
          </section>

          <section aria-labelledby="writing-heading" className="mt-14 sm:mt-20">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2
                id="writing-heading"
                className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                Writing
              </h2>
              <Link
                href="/blog/"
                className="text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                All posts
              </Link>
            </div>
            <ol className="mt-8">
              {posts.map((post) => (
                <li key={post.slug} className="border-t border-border py-6">
                  <time
                    dateTime={post.date.slice(0, 10)}
                    className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted"
                  >
                    {formatPostDate(post.date)}
                  </time>
                  <h3 className="font-display mt-2 text-2xl font-semibold leading-snug tracking-tight sm:text-[1.7rem]">
                    <Link
                      href={`/blog/${post.slug}/`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {post.title}
                    </Link>
                  </h3>
                  <p className="mt-2 max-w-[40rem] text-sm leading-relaxed text-muted sm:text-base">
                    {post.description}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section
            aria-labelledby="books-heading"
            className="mt-16 border-t border-border pt-12 sm:mt-20"
          >
            <BookShelf />
          </section>

          <section
            aria-labelledby="work-heading"
            className="mt-16 border-t border-border pt-12 sm:mt-20"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <h2
                id="work-heading"
                className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                Work
              </h2>
              <Link
                href="/work/"
                className="text-sm text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                All projects
              </Link>
            </div>
            <p className="mt-4 max-w-[36rem] text-base leading-relaxed text-muted">
              Browser games and other things I build for myself.
            </p>
            <ul className="mt-6">
              {workItems.map((item) => (
                <li key={item.slug} className="border-t border-border py-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display text-2xl font-semibold leading-snug tracking-tight">
                      <Link
                        href={`/work/${item.slug}/`}
                        className="text-foreground underline-offset-4 hover:underline"
                      >
                        {item.title}
                      </Link>
                    </h3>
                    {item.status !== "live" ? (
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                        {item.status === "wip" ? "In progress" : "Archived"}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-[40rem] text-sm leading-relaxed text-muted sm:text-base">
                    {item.summary}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <p className="mt-16 border-t border-border pt-8 text-sm text-muted">
            <Link
              href="/services/"
              className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              I also take on some consulting work.
            </Link>
          </p>
        </article>
      </main>
    </>
  );
}

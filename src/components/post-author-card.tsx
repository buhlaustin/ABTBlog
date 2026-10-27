import Image from "next/image";
import Link from "next/link";
import { authorCard, profile } from "@/lib/profile";
import { siteConfig } from "@/lib/site";

type Variant = "byline" | "footer";

export function PostAuthorCard({
  variant = "footer",
  authorName = authorCard.name,
}: {
  variant?: Variant;
  authorName?: string;
}) {
  const isByline = variant === "byline";

  return (
    <div
      className={
        isByline
          ? "flex items-center gap-3"
          : "mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5"
      }
    >
      <Image
        src={profile.avatarUrl}
        alt={`${authorName} headshot`}
        width={isByline ? 40 : 88}
        height={isByline ? 40 : 88}
        className={
          isByline
            ? "size-10 shrink-0 rounded-full ring-2 ring-border object-cover"
            : "size-[5.5rem] shrink-0 rounded-full ring-2 ring-accent/30 object-cover"
        }
      />
      <div className={isByline ? "min-w-0" : "min-w-0 flex-1"}>
        <p className="font-display text-sm font-bold text-foreground">
          {authorName}
        </p>
        {!isByline && (
          <>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {authorCard.shortBio}
            </p>
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
              <Link href="/about/" className="text-accent hover:text-blue-700">
                More about me
              </Link>
              <a
                href={siteConfig.github}
                className="text-accent hover:text-blue-700"
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub
              </a>
              <a
                href={profile.linkedIn}
                className="text-accent hover:text-blue-700"
                rel="noopener noreferrer"
                target="_blank"
              >
                LinkedIn
              </a>
            </p>
          </>
        )}
        {isByline && (
          <p className="text-xs text-muted">
            {profile.role}, {profile.company}
          </p>
        )}
      </div>
    </div>
  );
}

import Image from "next/image";
import { siteConfig } from "@/lib/site";

type SiteLogoProps = {
  /** Header wordmark, larger hero, or the mark that opens the homepage. */
  variant?: "header" | "hero" | "mark";
  className?: string;
};

export function SiteLogo({ variant = "header", className = "" }: SiteLogoProps) {
  const isHero = variant === "hero";
  const isMark = variant === "mark";

  const sizeClass = isHero
    ? "h-auto w-full max-w-[min(100%,20rem)] sm:max-w-md"
    : isMark
      ? "h-14 w-auto sm:h-16"
      : "h-7 w-auto max-w-[9.5rem] sm:h-10 sm:max-w-none";

  return (
    <Image
      src={siteConfig.logoSignature}
      alt={isMark ? "" : siteConfig.name}
      width={isHero || isMark ? 400 : 200}
      height={isHero || isMark ? 160 : 80}
      loading="eager"
      className={`${sizeClass} ${className}`}
    />
  );
}

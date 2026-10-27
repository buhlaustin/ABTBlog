import Image from "next/image";
import { siteConfig } from "@/lib/site";

type SiteLogoProps = {
  /** Header size vs larger home hero */
  variant?: "header" | "hero";
  className?: string;
};

export function SiteLogo({ variant = "header", className = "" }: SiteLogoProps) {
  const isHero = variant === "hero";

  return (
    <Image
      src={siteConfig.logoSignature}
      alt={siteConfig.name}
      width={isHero ? 400 : 200}
      height={isHero ? 160 : 80}
      priority={isHero}
      className={
        isHero
          ? `h-auto w-full max-w-[min(100%,20rem)] sm:max-w-md ${className}`
          : `h-8 w-auto max-w-[min(55vw,11rem)] sm:h-10 sm:max-w-none ${className}`
      }
    />
  );
}

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
          ? `h-auto w-full max-w-md ${className}`
          : `h-9 w-auto sm:h-10 ${className}`
      }
    />
  );
}

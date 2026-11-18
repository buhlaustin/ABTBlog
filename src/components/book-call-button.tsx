import { servicesContact } from "@/lib/services";

const primaryClass =
  "btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:bg-zinc-700 sm:w-auto";

const secondaryClass =
  "btn-press inline-flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface active:bg-surface-raised sm:w-auto";

type BookCallButtonProps = {
  variant?: "primary" | "secondary";
  className?: string;
};

export function BookCallButton({
  variant = "primary",
  className = "",
}: BookCallButtonProps) {
  return (
    <a
      href={servicesContact.bookingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${variant === "primary" ? primaryClass : secondaryClass} ${className}`.trim()}
    >
      {servicesContact.bookingLabel}
    </a>
  );
}
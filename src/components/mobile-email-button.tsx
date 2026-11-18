import { servicesContact } from "@/lib/services";

const baseClass =
  "btn-press inline-flex min-h-11 w-full min-w-0 items-center justify-center rounded-full border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface sm:w-auto sm:px-5";

type MobileEmailButtonProps = {
  className?: string;
};

export function MobileEmailButton({ className = "" }: MobileEmailButtonProps) {
  return (
    <a
      href={`mailto:${servicesContact.email}`}
      className={`${baseClass} ${className}`.trim()}
    >
      <span className="truncate sm:hidden">Email me</span>
      <span className="hidden truncate sm:inline">
        Email {servicesContact.email}
      </span>
    </a>
  );
}
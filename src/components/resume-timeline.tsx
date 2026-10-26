import type { ResumeGroup } from "@/lib/resume";

export function ResumeTimeline({ groups }: { groups: ResumeGroup[] }) {
  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <div key={group.name}>
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground">
            {group.name}
          </h3>
          <ul className="mt-5 list-none space-y-8 pl-0">
            {group.roles.map((role) => (
              <li
                key={`${group.name}-${role.organization}-${role.title}`}
                className="rounded-xl border border-border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{role.title}</p>
                    <p className="mt-0.5 text-sm text-foreground/90">
                      {role.organizationUrl ? (
                        <a
                          href={role.organizationUrl}
                          className="font-medium text-accent underline-offset-2 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {role.organization}
                        </a>
                      ) : (
                        role.organization
                      )}
                      {role.location ? (
                        <span className="text-muted"> · {role.location}</span>
                      ) : null}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-xs text-muted sm:text-right">
                    {role.period}
                  </p>
                </div>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
                  {role.highlights.map((item) => (
                    <li key={item.slice(0, 48)}>{item}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

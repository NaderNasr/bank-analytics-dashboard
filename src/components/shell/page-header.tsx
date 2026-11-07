import type { ReactNode } from "react";

export function PageHeader({ title, description }: { title: ReactNode; description?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
      {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      <span aria-hidden className="mt-3 h-0.5 w-16 rounded-full bg-gold-accent" />
    </div>
  );
}

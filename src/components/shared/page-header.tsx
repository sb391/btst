import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <Badge variant="outline" className="mb-3">
          {eyebrow}
        </Badge>
        <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{title}</h2>
        <p className="mt-3 text-base text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

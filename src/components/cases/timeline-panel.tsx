import type { TimelineItem } from "@/lib/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { displayDate } from "@/lib/format";

export function TimelinePanel({ items }: { items: TimelineItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Timeline</CardTitle>
        <CardDescription>
          Every important action should remain traceable, including uploads, extraction, scoring, and final analyst decisioning.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={`${item.timestamp}-${item.title}`} className="rounded-[18px] border border-border/70 bg-background/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-muted-foreground">{displayDate(item.timestamp)}</p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

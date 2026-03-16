import type { InvoiceReviewRecord } from "@/lib/invoice-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function statusVariant(status: InvoiceReviewRecord["validationResults"][number]["status"]) {
  if (status === "PASS") return "success" as const;
  if (status === "WARN") return "warning" as const;
  return "danger" as const;
}

export function ValidationResultsPanel({
  review
}: {
  review: InvoiceReviewRecord;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Validation Results</CardTitle>
        <CardDescription>
          Rules-first validation explains which checks passed, which failed, and where manual review is still needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {review.validationResults.map((item) => (
          <div key={item.checkName} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              <p className="font-medium text-slate-900">{item.checkName}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.severity}</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{item.message}</p>
            {item.impactedFields.length ? (
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Impacted fields: {item.impactedFields.join(", ")}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

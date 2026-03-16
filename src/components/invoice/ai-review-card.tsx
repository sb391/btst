import type { InvoiceReviewRecord } from "@/lib/invoice-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AiReviewCard({
  review
}: {
  review: InvoiceReviewRecord;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Review Memo</CardTitle>
        <CardDescription>
          AI commentary is layered on top of extracted facts and rule checks. It does not replace analyst judgment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
          <p className="font-medium text-slate-900">Summary</p>
          <p className="mt-2 text-sm text-muted-foreground">{review.aiReview.summary}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="font-medium text-slate-900">What is clearly visible</p>
            <div className="mt-3 space-y-2">
              {review.aiReview.visibleFacts.map((item) => (
                <p key={item} className="text-sm text-muted-foreground">
                  - {item}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="font-medium text-slate-900">What is missing or unclear</p>
            <div className="mt-3 space-y-2">
              {review.aiReview.missingFields.length ? (
                review.aiReview.missingFields.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    - {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No major missing fields are currently flagged.</p>
              )}
            </div>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="font-medium text-slate-900">What looks suspicious</p>
            <div className="mt-3 space-y-2">
              {review.aiReview.suspiciousSignals.length ? (
                review.aiReview.suspiciousSignals.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    - {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No major suspicious signals are currently flagged.</p>
              )}
            </div>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="font-medium text-slate-900">Uncertainty</p>
            <div className="mt-3 space-y-2">
              {review.aiReview.uncertaintyNotes.length ? (
                review.aiReview.uncertaintyNotes.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    - {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No major uncertainty notes are currently open.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
          <p className="font-medium text-slate-900">Recommended action</p>
          <p className="mt-2 text-sm text-muted-foreground">{review.aiReview.recommendedAction}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Provider: {review.aiReview.provider} • Model: {review.aiReview.model}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

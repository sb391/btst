import type { InvoiceReviewRecord } from "@/lib/invoice-types";
import { ReviewHealthBadge, ReviewRecommendationBadge } from "@/components/invoice/review-health-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function scoreValue(review: InvoiceReviewRecord, key: InvoiceReviewRecord["scores"][number]["key"]) {
  return review.scores.find((score) => score.key === key)?.score ?? 0;
}

export function ReviewSummaryCard({
  review
}: {
  review: InvoiceReviewRecord;
}) {
  const extraction = scoreValue(review, "EXTRACTION_CONFIDENCE");
  const completeness = scoreValue(review, "COMPLETENESS");
  const consistency = scoreValue(review, "CONSISTENCY");
  const risk = scoreValue(review, "RISK");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Invoice Health Summary</CardTitle>
          <ReviewHealthBadge status={review.overallHealthStatus} />
          <ReviewRecommendationBadge recommendation={review.analystRecommendation} />
        </div>
        <CardDescription>
          Transparent scorecards show how the workbench reached its invoice health conclusion.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Extraction Confidence",
            value: extraction,
            hint: "OCR readability and field-level confidence."
          },
          {
            label: "Completeness Score",
            value: completeness,
            hint: "Presence of the expected invoice fields."
          },
          {
            label: "Consistency Score",
            value: consistency,
            hint: "Arithmetic, dates, GSTINs, and structural coherence."
          },
          {
            label: "Risk Score",
            value: risk,
            hint: "Higher values mean more analyst attention is needed."
          }
        ].map((item) => (
          <div key={item.label} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="text-xl font-semibold text-slate-900">{item.value}</p>
            </div>
            <Progress value={item.value} className="mt-3" />
            <p className="mt-3 text-sm text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

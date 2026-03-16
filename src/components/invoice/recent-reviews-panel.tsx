import Link from "next/link";

import type { InvoiceReviewListItem } from "@/lib/invoice-types";
import { displayCurrency, displayDate, formatInvoiceRecommendation } from "@/lib/invoice-format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewHealthBadge } from "@/components/invoice/review-health-badge";

export function RecentReviewsPanel({
  reviews
}: {
  reviews: InvoiceReviewListItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Reviews</CardTitle>
        <CardDescription>
          Review history stays local in the MVP so analysts can revisit prior invoice decisions quickly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length ? (
          reviews.map((review) => (
            <Link
              key={review.id}
              href={`/reviews/${review.id}`}
              className="block rounded-[22px] border border-border/70 bg-background/70 p-4 transition hover:bg-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{review.reviewNumber}</p>
                  <p className="mt-2 font-semibold text-slate-900">{review.fileName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {review.supplierName ?? "Supplier not extracted"} to {review.buyerName ?? "Buyer not extracted"}
                  </p>
                </div>
                <ReviewHealthBadge status={review.overallHealthStatus} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{displayDate(review.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Invoice number</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{review.invoiceNumber ?? "Not extracted"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total amount</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{displayCurrency(review.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Recommendation</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatInvoiceRecommendation(review.analystRecommendation)}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No invoice reviews yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

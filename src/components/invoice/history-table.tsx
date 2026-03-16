import Link from "next/link";

import type { InvoiceReviewListItem } from "@/lib/invoice-types";
import { displayCurrency, displayDate, formatInvoiceRecommendation } from "@/lib/invoice-format";
import { ReviewHealthBadge } from "@/components/invoice/review-health-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function HistoryTable({
  reviews
}: {
  reviews: InvoiceReviewListItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Past Reviews</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border/70 text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-3 font-medium">Review</th>
              <th className="pb-3 font-medium">File</th>
              <th className="pb-3 font-medium">Supplier / Buyer</th>
              <th className="pb-3 font-medium">Total</th>
              <th className="pb-3 font-medium">Scores</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {reviews.map((review) => (
              <tr key={review.id}>
                <td className="py-4 pr-6">
                  <Link href={`/reviews/${review.id}`} className="font-semibold text-slate-900 hover:underline">
                    {review.reviewNumber}
                  </Link>
                  <p className="mt-1 text-muted-foreground">{displayDate(review.createdAt)}</p>
                </td>
                <td className="py-4 pr-6 text-slate-900">{review.fileName}</td>
                <td className="py-4 pr-6 text-muted-foreground">
                  {review.supplierName ?? "Supplier unclear"}
                  <br />
                  {review.buyerName ?? "Buyer unclear"}
                </td>
                <td className="py-4 pr-6 text-slate-900">{displayCurrency(review.totalAmount)}</td>
                <td className="py-4 pr-6 text-muted-foreground">
                  Extraction {review.extractionConfidenceScore}
                  <br />
                  Consistency {review.consistencyScore}
                  <br />
                  Risk {review.riskScore}
                </td>
                <td className="py-4">
                  <div className="space-y-2">
                    <ReviewHealthBadge status={review.overallHealthStatus} />
                    <p className="text-muted-foreground">
                      {formatInvoiceRecommendation(review.analystRecommendation)}
                    </p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

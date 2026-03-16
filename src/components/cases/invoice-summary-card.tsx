import type { InvoiceSummary } from "@/lib/types";

import { displayCurrency, displayDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InvoiceSummaryCard({ invoice }: { invoice?: InvoiceSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Intelligence Engine</CardTitle>
        <CardDescription>
          Structured invoice extraction, completeness checks, and authenticity logic for analyst review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoice ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{invoice.invoiceNumber}</Badge>
              <Badge variant="outline">Authenticity {invoice.authenticityScore}</Badge>
              <Badge variant="outline">Completeness {invoice.completenessScore}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invoice date</p>
                <p className="mt-1 font-medium">{displayDate(invoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Supplier</p>
                <p className="mt-1 font-medium">{invoice.supplierName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Buyer</p>
                <p className="mt-1 font-medium">{invoice.buyerName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total value</p>
                <p className="mt-1 font-medium">{displayCurrency(invoice.totalValue)}</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="font-medium">Risk flags</p>
              {invoice.flags.length ? (
                invoice.flags.map((flag) => (
                  <div key={flag} className="rounded-[18px] border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                    {flag}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No invoice anomalies detected.</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Upload an invoice to activate invoice intelligence and fraud checks.</p>
        )}
      </CardContent>
    </Card>
  );
}

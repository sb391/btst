import type { InvoiceReviewRecord } from "@/lib/invoice-types";
import { displayCurrency } from "@/lib/invoice-format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function sectionFields(review: InvoiceReviewRecord, section: string) {
  return review.normalizedDocument.extractedFields.filter((field) => field.section === section);
}

function fieldVariant(present: boolean, confidence: number) {
  if (!present) return "outline" as const;
  if (confidence >= 0.8) return "success" as const;
  if (confidence >= 0.6) return "warning" as const;
  return "outline" as const;
}

function valueLabel(value: string) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && /^(?:\d+|\d+\.\d+)$/.test(value) && numeric > 999
    ? displayCurrency(numeric)
    : value;
}

function lineQuantityLabel(quantity?: number, unit?: string) {
  if (quantity === undefined || quantity === null) {
    return "—";
  }

  return unit ? `${quantity} ${unit}` : String(quantity);
}

export function ExtractedFieldsPanel({
  review
}: {
  review: InvoiceReviewRecord;
}) {
  const sections = [
    "Supplier details",
    "Buyer details",
    "Invoice metadata",
    "Tax details",
    "Totals",
    "Logistics",
    "Bank / Payment"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Fields</CardTitle>
        <CardDescription>
          Structured values are shown exactly as extracted so the analyst can see what is truly visible versus missing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map((section) => {
          const fields = sectionFields(review, section);
          if (!fields.length) {
            return null;
          }

          return (
            <div key={section}>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">{section}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.key} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{field.label}</p>
                      <Badge variant={fieldVariant(field.present, field.confidence)}>
                        {Math.round(field.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{valueLabel(field.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Line Items</p>
          <div className="mt-3 overflow-x-auto rounded-[22px] border border-border/70 bg-background/70">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Unit Price</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">HSN / SAC</th>
                  <th className="px-4 py-3 font-medium">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {review.normalizedDocument.lineItems.length ? (
                  review.normalizedDocument.lineItems.map((item) => (
                    <tr key={`${item.lineNumber}-${item.description}`}>
                      <td className="px-4 py-3 text-slate-900">{item.description ?? "Not extracted"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lineQuantityLabel(item.quantity, item.unit)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{displayCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-slate-900">{displayCurrency(item.lineAmount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{item.hsnSac ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{Math.round(item.confidence * 100)}%</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      No reliable line items were extracted.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

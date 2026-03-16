import type { InvoiceReviewRecord } from "@/lib/invoice-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RawOcrPanel({
  review
}: {
  review: InvoiceReviewRecord;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw OCR Text</CardTitle>
        <CardDescription>
          Analysts can inspect the raw OCR output directly to understand where extracted values came from.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="max-h-[340px] overflow-auto rounded-[22px] border border-border/70 bg-background/70 p-4 text-xs leading-6 text-muted-foreground">
          {review.rawOcrText || "No OCR text available."}
        </pre>
      </CardContent>
    </Card>
  );
}

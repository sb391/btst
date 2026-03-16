import { AiReviewCard } from "@/components/invoice/ai-review-card";
import { AnalystWorkbenchPanel } from "@/components/invoice/analyst-workbench-panel";
import { ExtractedFieldsPanel } from "@/components/invoice/extracted-fields-panel";
import { InvoicePreviewPanel } from "@/components/invoice/invoice-preview-panel";
import { RawOcrPanel } from "@/components/invoice/raw-ocr-panel";
import { ReviewSummaryCard } from "@/components/invoice/review-summary-card";
import { ValidationResultsPanel } from "@/components/invoice/validation-results-panel";
import { InternalBanner } from "@/components/shared/internal-banner";
import { PageHeader } from "@/components/shared/page-header";
import { notFound } from "next/navigation";
import { getInvoiceReview } from "@/server/repositories/invoice-review-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReviewDetailPage({
  params
}: {
  params: { reviewId: string };
}) {
  const review = await getInvoiceReview(params.reviewId);

  if (!review) {
    notFound();
  }

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow={review.reviewNumber}
        title={review.uploadedFile.originalFileName}
        description="See the original invoice, extracted structure, validation trail, AI memo, and manual analyst decision in one place."
      />

      <div className="grid gap-6 xl:grid-cols-[0.88fr,1.12fr]">
        <InvoicePreviewPanel
          reviewId={review.id}
          mimeType={review.uploadedFile.mimeType}
          pageCount={review.uploadedFile.pageCount}
        />

        <div className="space-y-6">
          <ReviewSummaryCard review={review} />
          <ExtractedFieldsPanel review={review} />
          <ValidationResultsPanel review={review} />
          <AiReviewCard review={review} />
          <RawOcrPanel review={review} />
          <AnalystWorkbenchPanel review={review} />
        </div>
      </div>
    </div>
  );
}

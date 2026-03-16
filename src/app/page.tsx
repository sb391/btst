import { RecentReviewsPanel } from "@/components/invoice/recent-reviews-panel";
import { UploadReviewPanel } from "@/components/invoice/upload-review-panel";
import { InternalBanner } from "@/components/shared/internal-banner";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { listInvoiceReviews } from "@/server/repositories/invoice-review-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const reviews = await listInvoiceReviews();
  const highRiskCount = reviews.filter((review) => review.overallHealthStatus === "HIGH_RISK").length;
  const lowConfidenceCount = reviews.filter((review) => review.overallHealthStatus === "LOW_CONFIDENCE").length;
  const averageExtraction = reviews.length
    ? Math.round(reviews.reduce((sum, review) => sum + review.extractionConfidenceScore, 0) / reviews.length)
    : 0;

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow="Invoice Intelligence Workbench"
        title="Upload an invoice and review what the system actually sees"
        description="This internal analyst tool focuses only on invoice intelligence: OCR, structured extraction, rule-based validation, AI review, and visible scoring."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Stored reviews"
          value={String(reviews.length)}
          hint="Each invoice review is persisted locally for later inspection."
        />
        <MetricCard
          label="Average extraction"
          value={`${averageExtraction}`}
          hint="Rules and AI become more useful when extraction quality is strong."
        />
        <MetricCard
          label="High risk"
          value={String(highRiskCount)}
          hint="High-risk reviews deserve faster analyst attention."
        />
        <MetricCard
          label="Low confidence"
          value={String(lowConfidenceCount)}
          hint="Low-confidence reads should be reviewed against the original file."
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <UploadReviewPanel />
        <RecentReviewsPanel reviews={reviews.slice(0, 6)} />
      </div>
    </div>
  );
}

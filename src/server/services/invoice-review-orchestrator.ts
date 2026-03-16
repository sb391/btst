import type { InvoiceReviewRecommendation, InvoiceScore } from "@/lib/invoice-types";
import { generateInvoiceAiReview } from "@/server/services/invoice-ai-review-service";
import { normalizeInvoiceDocument } from "@/server/services/invoice-normalization-service";
import { runInvoiceValidationRules } from "@/server/services/invoice-validation-rules-engine";
import { computeInvoiceScores } from "@/server/services/invoice-scoring-engine";
import type { OcrDocumentResult } from "@/lib/invoice-types";

export interface InvoiceReviewOutput {
  normalizedDocument: ReturnType<typeof normalizeInvoiceDocument>;
  validationResults: ReturnType<typeof runInvoiceValidationRules>;
  scores: InvoiceScore[];
  overallHealthStatus: "GOOD" | "NEEDS_REVIEW" | "HIGH_RISK" | "LOW_CONFIDENCE";
  recommendation: InvoiceReviewRecommendation;
  aiReview: Awaited<ReturnType<typeof generateInvoiceAiReview>>;
}

export async function runInvoiceReviewPipeline(ocr: OcrDocumentResult): Promise<InvoiceReviewOutput> {
  const normalizedDocument = normalizeInvoiceDocument(ocr);
  const validationResults = runInvoiceValidationRules({
    ocr,
    document: normalizedDocument
  });
  const { scores, overallHealthStatus, recommendation } = computeInvoiceScores({
    ocr,
    document: normalizedDocument,
    validationResults
  });
  const aiReview = await generateInvoiceAiReview({
    ocr,
    document: normalizedDocument,
    validationResults,
    scores,
    recommendation
  });

  return {
    normalizedDocument,
    validationResults,
    scores,
    overallHealthStatus,
    recommendation,
    aiReview
  };
}

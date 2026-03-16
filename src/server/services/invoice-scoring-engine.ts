import type {
  InvoiceHealthStatus,
  InvoiceReviewRecommendation,
  InvoiceScore,
  InvoiceValidationResult,
  NormalizedInvoiceDocument,
  OcrDocumentResult
} from "@/lib/invoice-types";
import { clamp } from "@/lib/utils";
import { averageExtractedFieldConfidence } from "@/server/services/invoice-normalization-service";

function scoreEntry(
  key: InvoiceScore["key"],
  label: string,
  score: number,
  rationale: string,
  detail: string[]
): InvoiceScore {
  return {
    key,
    label,
    score: Math.round(score),
    rationale,
    detail
  };
}

export function computeInvoiceScores(input: {
  ocr: OcrDocumentResult;
  document: NormalizedInvoiceDocument;
  validationResults: InvoiceValidationResult[];
}): {
  scores: InvoiceScore[];
  overallHealthStatus: InvoiceHealthStatus;
  recommendation: InvoiceReviewRecommendation;
} {
  const { ocr, document, validationResults } = input;
  const presentFieldCount = document.extractedFields.filter((field) => field.present).length;
  const essentialPresentCount = [
    document.invoiceNumber,
    document.invoiceDate,
    document.supplier.name,
    document.buyer.name,
    document.taxDetails.totalAmount !== undefined ? "present" : undefined
  ].filter(Boolean).length;
  const passCount = validationResults.filter((item) => item.status === "PASS").length;
  const warnCount = validationResults.filter((item) => item.status === "WARN").length;
  const failCount = validationResults.filter((item) => item.status === "FAIL").length;
  const averageFieldConfidence = averageExtractedFieldConfidence(document);
  const extractionConfidenceScore = clamp(
    (ocr.averageConfidence * 0.55 + averageFieldConfidence * 0.45) * 100,
    0,
    100
  );
  const completenessScore = clamp(
    essentialPresentCount * 14 +
      Math.min(presentFieldCount, 14) * 2.8 +
      (document.lineItems.length > 0 ? 10 : 0) +
      (document.supplier.gstin ? 4 : 0) +
      (document.buyer.gstin ? 4 : 0),
    0,
    100
  );
  const consistencyScore = clamp(
    100 - failCount * 18 - warnCount * 7 + passCount * 1.5,
    0,
    100
  );
  const riskScore = clamp(
    18 + failCount * 20 + warnCount * 8 + (extractionConfidenceScore < 55 ? 14 : 0) + (completenessScore < 60 ? 10 : 0),
    0,
    100
  );

  let overallHealthStatus: InvoiceHealthStatus = "GOOD";
  if (extractionConfidenceScore < 45 || ocr.qualitySignals.lowReadability) {
    overallHealthStatus = "LOW_CONFIDENCE";
  } else if (riskScore >= 70 || failCount >= 3) {
    overallHealthStatus = "HIGH_RISK";
  } else if (riskScore >= 40 || warnCount > 0 || failCount > 0) {
    overallHealthStatus = "NEEDS_REVIEW";
  }

  const recommendation: InvoiceReviewRecommendation =
    overallHealthStatus === "GOOD"
      ? "LOOKS_IN_ORDER"
      : overallHealthStatus === "NEEDS_REVIEW"
        ? "MINOR_ISSUES_REVIEW_RECOMMENDED"
        : overallHealthStatus === "HIGH_RISK"
          ? "SUSPICIOUS_OR_INCOMPLETE"
          : "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED";

  return {
    scores: [
      scoreEntry(
        "EXTRACTION_CONFIDENCE",
        "Extraction Confidence",
        extractionConfidenceScore,
        "Reflects OCR readability and confidence across extracted fields.",
        [
          `OCR average confidence: ${Math.round(ocr.averageConfidence * 100)}`,
          `Average field confidence: ${Math.round(averageFieldConfidence * 100)}`,
          ocr.qualitySignals.lowReadability ? "Readability signal is weak." : "Readability signal is acceptable."
        ]
      ),
      scoreEntry(
        "COMPLETENESS",
        "Invoice Completeness",
        completenessScore,
        "Measures whether expected invoice fields and line items are present.",
        [
          `${essentialPresentCount} / 5 core invoice fields were captured.`,
          `${presentFieldCount} structured fields were populated.`,
          document.lineItems.length ? `${document.lineItems.length} line items were extracted.` : "No reliable line items were extracted."
        ]
      ),
      scoreEntry(
        "CONSISTENCY",
        "Invoice Consistency",
        consistencyScore,
        "Based on arithmetic, date validity, GSTIN quality, and cross-field consistency checks.",
        [
          `${passCount} checks passed.`,
          `${warnCount} checks produced warnings.`,
          `${failCount} checks failed.`
        ]
      ),
      scoreEntry(
        "RISK",
        "Invoice Risk",
        riskScore,
        "Higher values indicate higher analyst attention and document risk.",
        [
          failCount ? `${failCount} failed checks materially increase risk.` : "No failed checks materially increase risk.",
          warnCount ? `${warnCount} warnings remain open.` : "No warnings remain open.",
          extractionConfidenceScore < 55 ? "Low extraction confidence adds risk." : "Extraction confidence is not the main risk driver."
        ]
      )
    ],
    overallHealthStatus,
    recommendation
  };
}

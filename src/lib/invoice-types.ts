export type InvoiceHealthStatus = "GOOD" | "NEEDS_REVIEW" | "HIGH_RISK" | "LOW_CONFIDENCE";
export type InvoiceValidationStatus = "PASS" | "WARN" | "FAIL";
export type InvoiceValidationSeverity = "LOW" | "MEDIUM" | "HIGH";
export type ReviewStatus = "UPLOADED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type InvoiceReviewRecommendation =
  | "LOOKS_IN_ORDER"
  | "MINOR_ISSUES_REVIEW_RECOMMENDED"
  | "SUSPICIOUS_OR_INCOMPLETE"
  | "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED";

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
}

export interface OcrQualitySignals {
  lowReadability: boolean;
  cutOffRisk: boolean;
  rotated: boolean;
  overlappingTextRisk: boolean;
  likelyScanned: boolean;
  noisyTokenRatio: number;
}

export interface OcrDocumentResult {
  providerKey: string;
  providerMode: string;
  rawText: string;
  pages: OcrPageResult[];
  averageConfidence: number;
  rawPayload?: Record<string, unknown>;
  qualitySignals: OcrQualitySignals;
}

export interface InvoiceFieldValue {
  section: string;
  key: string;
  label: string;
  value: string;
  confidence: number;
  present: boolean;
  pageNumber?: number;
  source?: string;
  rawTextSnippet?: string;
}

export interface InvoiceLineItem {
  lineNumber: number;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  taxableValue?: number;
  lineAmount?: number;
  hsnSac?: string;
  confidence: number;
  rawTextSnippet?: string;
}

export interface InvoiceParty {
  name?: string;
  address?: string;
  gstin?: string;
}

export interface InvoiceBankDetails {
  bankName?: string;
  accountNumber?: string;
  ifsc?: string;
  branch?: string;
  rawText?: string;
}

export interface InvoiceTaxDetails {
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  totalAmount?: number;
  amountInWords?: string;
}

export interface NormalizedInvoiceDocument {
  supplier: InvoiceParty;
  buyer: InvoiceParty;
  invoiceNumber?: string;
  invoiceDate?: string;
  placeOfSupply?: string;
  poNumber?: string;
  vehicleNumber?: string;
  eWayBillNumber?: string;
  paymentTerms?: string;
  bankDetails?: InvoiceBankDetails;
  signatureOrStamp: "present" | "not_detected" | "unclear";
  lineItems: InvoiceLineItem[];
  taxDetails: InvoiceTaxDetails;
  rawText: string;
  extractedFields: InvoiceFieldValue[];
  qualitySignals: OcrQualitySignals;
}

export interface InvoiceValidationResult {
  checkName: string;
  status: InvoiceValidationStatus;
  severity: InvoiceValidationSeverity;
  message: string;
  impactedFields: string[];
  evidence?: Record<string, unknown>;
}

export interface InvoiceScore {
  key: "EXTRACTION_CONFIDENCE" | "COMPLETENESS" | "CONSISTENCY" | "RISK";
  label: string;
  score: number;
  rationale: string;
  detail: string[];
}

export interface InvoiceAiReview {
  provider: string;
  model: string;
  promptVersion: string;
  visibleFacts: string[];
  missingFields: string[];
  suspiciousSignals: string[];
  uncertaintyNotes: string[];
  internalCoherence: string;
  summary: string;
  recommendedAction: string;
  rawResponse?: Record<string, unknown>;
}

export interface InvoiceReviewRecord {
  id: string;
  reviewNumber: string;
  processingStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  uploadedFile: {
    id: string;
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    pageCount?: number | null;
    previewKind?: string | null;
  };
  ocrProviderKey: string;
  ocrProviderMode?: string | null;
  rawOcrText: string;
  rawOcrPayload?: Record<string, unknown>;
  normalizedDocument: NormalizedInvoiceDocument;
  validationResults: InvoiceValidationResult[];
  scores: InvoiceScore[];
  overallHealthStatus: InvoiceHealthStatus;
  analystRecommendation: InvoiceReviewRecommendation;
  analystDecision?: InvoiceReviewRecommendation | null;
  analystDecisionReason?: string | null;
  aiReview: InvoiceAiReview;
  analystNotes: Array<{
    id: string;
    authorName?: string | null;
    body: string;
    createdAt: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
}

export interface InvoiceReviewListItem {
  id: string;
  reviewNumber: string;
  fileName: string;
  createdAt: string;
  supplierName?: string;
  buyerName?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  extractionConfidenceScore: number;
  completenessScore: number;
  consistencyScore: number;
  riskScore: number;
  overallHealthStatus: InvoiceHealthStatus;
  analystRecommendation: InvoiceReviewRecommendation;
}

export interface OcrProviderSetting {
  key: string;
  label: string;
  description: string;
  configured: boolean;
  mode: "ready" | "stub";
}

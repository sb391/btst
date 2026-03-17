import { randomUUID } from "node:crypto";

import { Prisma } from "@prisma/client";

import type {
  InvoiceHealthStatus,
  InvoiceReviewListItem,
  InvoiceReviewRecord,
  InvoiceReviewRecommendation,
  InvoiceValidationSeverity,
  InvoiceValidationStatus,
  ReviewStatus
} from "@/lib/invoice-types";
import { prisma } from "@/server/db";

function createReviewNumber() {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
    String(now.getUTCMilliseconds()).padStart(3, "0")
  ].join("");
  return `INVREV-${stamp}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value);
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function toReviewStatus(value: string): ReviewStatus {
  if (value === "UPLOADED" || value === "PROCESSING" || value === "FAILED") {
    return value;
  }

  return "COMPLETED";
}

function toHealthStatus(value: string): InvoiceHealthStatus {
  if (value === "GOOD" || value === "NEEDS_REVIEW" || value === "HIGH_RISK") {
    return value;
  }

  return "LOW_CONFIDENCE";
}

function toRecommendation(value: string | null | undefined): InvoiceReviewRecommendation | null {
  if (
    value === "LOOKS_IN_ORDER" ||
    value === "MINOR_ISSUES_REVIEW_RECOMMENDED" ||
    value === "SUSPICIOUS_OR_INCOMPLETE" ||
    value === "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED"
  ) {
    return value;
  }

  return value == null ? null : "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED";
}

function toValidationStatus(value: string): InvoiceValidationStatus {
  if (value === "PASS" || value === "WARN") {
    return value;
  }

  return "FAIL";
}

function toValidationSeverity(value: string): InvoiceValidationSeverity {
  if (value === "LOW" || value === "MEDIUM") {
    return value;
  }

  return "HIGH";
}

function emptyNormalizedDocument(rawText: string): InvoiceReviewRecord["normalizedDocument"] {
  return {
    supplier: {},
    buyer: {},
    signatureOrStamp: "unclear",
    lineItems: [],
    taxDetails: {},
    rawText,
    extractedFields: [],
    qualitySignals: {
      lowReadability: true,
      cutOffRisk: false,
      rotated: false,
      overlappingTextRisk: false,
      likelyScanned: false,
      noisyTokenRatio: 0
    }
  };
}

function mapReview(
  record: Prisma.InvoiceReviewGetPayload<{
    include: {
      uploadedFile: true;
      validationResults: true;
      scores: true;
      aiReview: true;
      analystNotes: true;
      auditLogs: true;
    };
  }>
): InvoiceReviewRecord {
  const rawOcrPayload = parseJson<Record<string, unknown>>(record.rawOcrPayload, {});
  const normalizedDocument = parseJson<InvoiceReviewRecord["normalizedDocument"]>(
    record.normalizedPayload,
    emptyNormalizedDocument(record.rawOcrText ?? "")
  );

  return {
    id: record.id,
    reviewNumber: record.reviewNumber,
    processingStatus: toReviewStatus(record.processingStatus),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    uploadedFile: {
      id: record.uploadedFile.id,
      originalFileName: record.uploadedFile.originalFileName,
      mimeType: record.uploadedFile.mimeType,
      sizeBytes: record.uploadedFile.sizeBytes,
      storagePath: record.uploadedFile.storagePath,
      pageCount: record.uploadedFile.pageCount,
      previewKind: record.uploadedFile.previewKind
    },
    ocrProviderKey: record.ocrProviderKey,
    ocrProviderMode: record.ocrProviderMode,
    rawOcrText: record.rawOcrText ?? "",
    rawOcrPayload: rawOcrPayload,
    normalizedDocument,
    validationResults: record.validationResults.map((item) => ({
      checkName: item.checkName,
      status: toValidationStatus(item.status),
      severity: toValidationSeverity(item.severity),
      message: item.message,
      impactedFields: parseJson<string[]>(item.impactedFields, []),
      evidence: parseJson<Record<string, unknown>>(item.evidence, {})
    })),
    scores: record.scores.map((item) => ({
      key: item.scoreKey as InvoiceReviewRecord["scores"][number]["key"],
      label: item.label,
      score: item.score,
      rationale: item.rationale ?? "",
      detail: parseJson<string[]>(item.metadata, [])
    })),
    overallHealthStatus: toHealthStatus(record.overallHealthStatus),
    analystRecommendation: toRecommendation(record.analystRecommendation) ?? "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED",
    analystDecision: toRecommendation(record.analystDecision),
    analystDecisionReason: record.analystDecisionReason,
    aiReview: {
      provider: record.aiReview?.provider ?? "mock",
      model: record.aiReview?.model ?? "template-analyst-v1",
      promptVersion: record.aiReview?.promptVersion ?? "invoice-review-v1",
      visibleFacts: parseJson<string[]>(record.aiReview?.visibleFacts, []),
      missingFields: parseJson<string[]>(record.aiReview?.missingFields, []),
      suspiciousSignals: parseJson<string[]>(record.aiReview?.suspiciousSignals, []),
      uncertaintyNotes: parseJson<string[]>(record.aiReview?.uncertaintyNotes, []),
      internalCoherence: record.aiReview?.internalCoherence ?? "",
      summary: record.aiReview?.summary ?? "",
      recommendedAction: record.aiReview?.recommendedAction ?? "",
      rawResponse: parseJson<Record<string, unknown>>(record.aiReview?.rawResponse, {})
    },
    analystNotes: record.analystNotes.map((note) => ({
      id: note.id,
      authorName: note.authorName,
      body: note.body,
      createdAt: note.createdAt.toISOString()
    })),
    auditLogs: record.auditLogs.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      createdAt: item.createdAt.toISOString()
    }))
  };
}

export async function listInvoiceReviews(search?: string): Promise<InvoiceReviewListItem[]> {
  const reviews = await prisma.invoiceReview.findMany({
    where: search
      ? {
          OR: [
            {
              reviewNumber: {
                contains: search
              }
            },
            {
              uploadedFile: {
                is: {
                  originalFileName: {
                    contains: search
                  }
                }
              }
            },
            {
              summarySupplierName: {
                contains: search
              }
            },
            {
              summaryBuyerName: {
                contains: search
              }
            }
          ]
        }
      : undefined,
    include: {
      uploadedFile: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return reviews.map((review) => ({
    id: review.id,
    reviewNumber: review.reviewNumber,
    fileName: review.uploadedFile.originalFileName,
    createdAt: review.createdAt.toISOString(),
    supplierName: review.summarySupplierName ?? undefined,
    buyerName: review.summaryBuyerName ?? undefined,
    invoiceNumber: review.summaryInvoiceNumber ?? undefined,
    totalAmount: review.summaryTotalAmount ?? undefined,
    extractionConfidenceScore: review.extractionConfidenceScore,
    completenessScore: review.completenessScore,
    consistencyScore: review.consistencyScore,
    riskScore: review.riskScore,
    overallHealthStatus: toHealthStatus(review.overallHealthStatus),
    analystRecommendation: toRecommendation(review.analystRecommendation) ?? "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED"
  }));
}

export async function getInvoiceReview(reviewId: string): Promise<InvoiceReviewRecord | null> {
  const review = await prisma.invoiceReview.findUnique({
    where: { id: reviewId },
    include: {
      uploadedFile: true,
      validationResults: {
        orderBy: {
          createdAt: "asc"
        }
      },
      scores: {
        orderBy: {
          createdAt: "asc"
        }
      },
      aiReview: true,
      analystNotes: {
        orderBy: {
          createdAt: "desc"
        }
      },
      auditLogs: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  return review ? mapReview(review) : null;
}

export async function createInvoiceReview(input: {
  uploadedFile: {
    originalFileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    checksum: string;
    previewKind: "pdf" | "image";
    pageCount?: number;
  };
  ocr: {
    providerKey: string;
    providerMode: string;
    rawText: string;
    rawPayload?: Record<string, unknown>;
  };
  output: {
    normalizedDocument: InvoiceReviewRecord["normalizedDocument"];
    validationResults: InvoiceReviewRecord["validationResults"];
    scores: InvoiceReviewRecord["scores"];
    overallHealthStatus: InvoiceReviewRecord["overallHealthStatus"];
    recommendation: InvoiceReviewRecord["analystRecommendation"];
    aiReview: InvoiceReviewRecord["aiReview"];
  };
}) {
  const reviewNumber = createReviewNumber();

  const review = await prisma.$transaction(async (tx) => {
    const uploadedFile = await tx.invoiceUploadedFile.create({
      data: {
        originalFileName: input.uploadedFile.originalFileName,
        mimeType: input.uploadedFile.mimeType,
        sizeBytes: input.uploadedFile.sizeBytes,
        storagePath: input.uploadedFile.storagePath,
        checksum: input.uploadedFile.checksum,
        pageCount: input.uploadedFile.pageCount,
        previewKind: input.uploadedFile.previewKind,
        uploadStatus: "COMPLETED"
      }
    });

    const reviewRecord = await tx.invoiceReview.create({
      data: {
        reviewNumber,
        uploadedFileId: uploadedFile.id,
        processingStatus: "COMPLETED",
        ocrProviderKey: input.ocr.providerKey,
        ocrProviderMode: input.ocr.providerMode,
        extractionVersion: "invoice-workbench-v1",
        rawOcrText: input.ocr.rawText,
        rawOcrPayload: stringifyJson(input.ocr.rawPayload ?? {}),
        normalizedPayload: stringifyJson(input.output.normalizedDocument),
        summaryInvoiceNumber: input.output.normalizedDocument.invoiceNumber,
        summaryInvoiceDate: input.output.normalizedDocument.invoiceDate ? new Date(input.output.normalizedDocument.invoiceDate) : undefined,
        summarySupplierName: input.output.normalizedDocument.supplier.name,
        summaryBuyerName: input.output.normalizedDocument.buyer.name,
        summaryTotalAmount: input.output.normalizedDocument.taxDetails.totalAmount,
        extractionConfidenceScore: input.output.scores.find((score) => score.key === "EXTRACTION_CONFIDENCE")?.score ?? 0,
        completenessScore: input.output.scores.find((score) => score.key === "COMPLETENESS")?.score ?? 0,
        consistencyScore: input.output.scores.find((score) => score.key === "CONSISTENCY")?.score ?? 0,
        riskScore: input.output.scores.find((score) => score.key === "RISK")?.score ?? 0,
        overallHealthStatus: input.output.overallHealthStatus,
        analystRecommendation: input.output.recommendation
      }
    });

    if (input.output.normalizedDocument.extractedFields.length) {
      await tx.invoiceExtractedField.createMany({
        data: input.output.normalizedDocument.extractedFields.map((field) => ({
          reviewId: reviewRecord.id,
          section: field.section,
          fieldKey: field.key,
          label: field.label,
          valueText: field.value,
          confidence: field.confidence,
          isPresent: field.present,
          pageNumber: field.pageNumber,
          source: field.source,
          rawTextSnippet: field.rawTextSnippet
        }))
      });
    }

    if (input.output.normalizedDocument.lineItems.length) {
      await tx.invoiceExtractedLineItem.createMany({
        data: input.output.normalizedDocument.lineItems.map((item) => ({
          reviewId: reviewRecord.id,
          lineNumber: item.lineNumber,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxableValue: item.taxableValue,
          lineAmount: item.lineAmount,
          hsnSac: item.hsnSac,
          confidence: item.confidence,
          rawTextSnippet: item.rawTextSnippet
        }))
      });
    }

    if (input.output.validationResults.length) {
      await tx.invoiceValidationResult.createMany({
        data: input.output.validationResults.map((item) => ({
          reviewId: reviewRecord.id,
          checkName: item.checkName,
          status: item.status,
          severity: item.severity,
          message: item.message,
          impactedFields: stringifyJson(item.impactedFields),
          evidence: stringifyJson(item.evidence ?? {})
        }))
      });
    }

    if (input.output.scores.length) {
      await tx.invoiceReviewScore.createMany({
        data: input.output.scores.map((item) => ({
          reviewId: reviewRecord.id,
          scoreKey: item.key,
          label: item.label,
          score: item.score,
          rationale: item.rationale,
          metadata: stringifyJson(item.detail)
        }))
      });
    }

    await tx.invoiceAiReview.create({
      data: {
        reviewId: reviewRecord.id,
        provider: input.output.aiReview.provider,
        model: input.output.aiReview.model,
        promptVersion: input.output.aiReview.promptVersion,
        visibleFacts: stringifyJson(input.output.aiReview.visibleFacts),
        missingFields: stringifyJson(input.output.aiReview.missingFields),
        suspiciousSignals: stringifyJson(input.output.aiReview.suspiciousSignals),
        uncertaintyNotes: stringifyJson(input.output.aiReview.uncertaintyNotes),
        internalCoherence: input.output.aiReview.internalCoherence,
        summary: input.output.aiReview.summary,
        recommendedAction: input.output.aiReview.recommendedAction,
        rawResponse: stringifyJson(input.output.aiReview.rawResponse ?? {})
      }
    });

    await tx.invoiceReviewAuditLog.createMany({
      data: [
        {
          reviewId: reviewRecord.id,
          action: "FILE_UPLOADED",
          entityType: "InvoiceUploadedFile",
          entityId: uploadedFile.id,
          metadata: stringifyJson({
            fileName: uploadedFile.originalFileName
          })
        },
        {
          reviewId: reviewRecord.id,
          action: "REVIEW_PROCESSED",
          entityType: "InvoiceReview",
          entityId: reviewRecord.id,
          metadata: stringifyJson({
            recommendation: reviewRecord.analystRecommendation,
            healthStatus: reviewRecord.overallHealthStatus
          })
        }
      ]
    });

    return tx.invoiceReview.findUniqueOrThrow({
      where: {
        id: reviewRecord.id
      },
      include: {
        uploadedFile: true,
        validationResults: true,
        scores: true,
        aiReview: true,
        analystNotes: true,
        auditLogs: true
      }
    });
  });

  return mapReview(review);
}

export async function updateInvoiceReviewAnalystState(input: {
  reviewId: string;
  analystDecision?: InvoiceReviewRecommendation;
  analystDecisionReason?: string;
  note?: string;
  authorName?: string;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.invoiceReview.update({
      where: {
        id: input.reviewId
      },
      data: {
        analystDecision: input.analystDecision,
        analystDecisionReason: input.analystDecisionReason
      }
    });

    if (input.note) {
      await tx.invoiceReviewNote.create({
        data: {
          reviewId: input.reviewId,
          authorName: input.authorName,
          body: input.note
        }
      });
    }

    await tx.invoiceReviewAuditLog.create({
      data: {
        reviewId: input.reviewId,
        action: "ANALYST_UPDATED_REVIEW",
        entityType: "InvoiceReview",
        entityId: input.reviewId,
        metadata: stringifyJson({
          analystDecision: input.analystDecision,
          noteAdded: Boolean(input.note)
        })
      }
    });
  });

  return getInvoiceReview(input.reviewId);
}

import { NextResponse } from "next/server";

import { documentTypeSchema } from "@/lib/schemas";
import { prisma } from "@/server/db";
import { createAuditLog } from "@/server/services/audit-log-service";
import { analyzeBankStatement } from "@/server/services/bank-analytics-service";
import { parseBureauReport } from "@/server/services/bureau-parser-service";
import {
  persistBankAnalytics,
  persistBureauSummary,
  persistExtractedFields,
  persistInvoiceSummary
} from "@/server/services/case-persistence-service";
import { saveUploadedFile } from "@/server/services/document-ingestion-service";
import { parseInvoiceDocument } from "@/server/services/invoice-intelligence-service";
import { extractDocumentText } from "@/server/services/ocr-extraction-service";
import { jobQueue } from "@/server/services/queue";

export async function POST(
  request: Request,
  { params }: { params: { caseId: string } }
) {
  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("documentType");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const parsedType = documentTypeSchema.safeParse(type);
  if (!parsedType.success) {
    return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
  }

  const storedFile = await saveUploadedFile(params.caseId, file);
  const extraction = await extractDocumentText(file);

  let documentId: string | undefined;

  try {
    const document = await prisma.uploadedDocument.create({
      data: {
        caseId: params.caseId,
        type: parsedType.data,
        originalFileName: storedFile.originalFileName,
        mimeType: storedFile.mimeType,
        sizeBytes: storedFile.sizeBytes,
        storagePath: storedFile.storagePath,
        checksum: storedFile.checksum,
        rawText: extraction.text,
        extractionConfidence: extraction.confidence,
        status: "PROCESSING",
        rawPayload: {
          originalFileName: storedFile.originalFileName
        }
      }
    });
    documentId = document.id;
  } catch {
    documentId = undefined;
  }

  const processingResult = await jobQueue.enqueue("process-upload", async () => {
    if (parsedType.data === "BUREAU_REPORT") {
      const result = parseBureauReport(extraction.text);
      try {
        await persistBureauSummary(params.caseId, result.summary);
        await persistExtractedFields(params.caseId, "Bureau", result.extractedFields);
      } catch {
        // No-op fallback for demo mode without database connectivity.
      }
      return { section: "Bureau", summary: result.summary, extractedFields: result.extractedFields };
    }

    if (parsedType.data === "BANK_STATEMENT") {
      const result = analyzeBankStatement(extraction.text);
      try {
        await persistBankAnalytics(params.caseId, result.analytics);
        await persistExtractedFields(params.caseId, "Bank", result.extractedFields);
      } catch {
        // No-op fallback for demo mode without database connectivity.
      }
      return { section: "Bank", analytics: result.analytics, extractedFields: result.extractedFields };
    }

    if (parsedType.data === "INVOICE") {
      const result = parseInvoiceDocument(extraction.text);
      try {
        await persistInvoiceSummary(params.caseId, result.invoice);
        await persistExtractedFields(params.caseId, "Invoice", result.extractedFields);
      } catch {
        // No-op fallback for demo mode without database connectivity.
      }
      return { section: "Invoice", invoice: result.invoice, extractedFields: result.extractedFields };
    }

    return {
      section: "Other",
      extractedFields: []
    };
  });

  try {
    if (documentId) {
      await prisma.uploadedDocument.update({
        where: { id: documentId },
        data: {
          status: "PROCESSED",
          extractionConfidence: extraction.confidence,
          processedPayload: processingResult
        }
      });
    }

    await createAuditLog({
      caseId: params.caseId,
      action: "DOCUMENT_PROCESSED",
      entityType: "UploadedDocument",
      entityId: documentId ?? storedFile.checksum,
      metadata: {
        type: parsedType.data,
        extractionConfidence: extraction.confidence
      }
    });
  } catch {
    // Best effort only.
  }

  return NextResponse.json({
    documentId,
    extractionConfidence: extraction.confidence,
    processingResult
  });
}

import { readFile } from "node:fs/promises";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function stringifyJson(value: unknown) {
  return JSON.stringify(value);
}

async function main() {
  const mockInvoiceText = await readFile("public/demo/mock-invoice.txt", "utf8");

  await prisma.$transaction([
    prisma.invoiceReviewAuditLog.deleteMany(),
    prisma.invoiceReviewNote.deleteMany(),
    prisma.invoiceAiReview.deleteMany(),
    prisma.invoiceReviewScore.deleteMany(),
    prisma.invoiceValidationResult.deleteMany(),
    prisma.invoiceExtractedLineItem.deleteMany(),
    prisma.invoiceExtractedField.deleteMany(),
    prisma.invoiceReview.deleteMany(),
    prisma.invoiceUploadedFile.deleteMany()
  ]);

  const uploadedFile = await prisma.invoiceUploadedFile.create({
    data: {
      id: "file_demo_invoice_001",
      originalFileName: "mock-invoice.svg",
      mimeType: "image/svg+xml",
      sizeBytes: 0,
      storagePath: "public/demo/mock-invoice.svg",
      checksum: "demo-mock-invoice-svg",
      pageCount: 1,
      previewKind: "image",
      uploadStatus: "COMPLETED"
    }
  });

  const normalizedPayload = {
    supplier: {
      name: "Deccan Industrial Supplies Pvt Ltd",
      address: "14 Industrial Layout, Hosur Road, Bengaluru, Karnataka 560095",
      gstin: "29AACCD1148P1ZX"
    },
    buyer: {
      name: "Starline Retail Distributors LLP",
      address: "102 Market Yard Road, Pune, Maharashtra 411037",
      gstin: "27AATFS6621L1ZB"
    },
    invoiceNumber: "INV-2026-1148",
    invoiceDate: "2026-03-13",
    placeOfSupply: "Maharashtra",
    poNumber: "PO-7743-26",
    vehicleNumber: "MH12QX4431",
    eWayBillNumber: "271008845612",
    paymentTerms: "Net 21 days",
    bankDetails: {
      bankName: "State Bank of India",
      accountNumber: "34022199088",
      ifsc: "SBIN0000456"
    },
    signatureOrStamp: "present",
    lineItems: [
      {
        lineNumber: 1,
        description: "Refined cooking oil cartons",
        quantity: 120,
        unitPrice: 990,
        taxableValue: 118800,
        lineAmount: 118800,
        hsnSac: "151211",
        confidence: 0.9
      },
      {
        lineNumber: 2,
        description: "Snack display units",
        quantity: 24,
        unitPrice: 583.33,
        taxableValue: 13999.92,
        lineAmount: 13999.92,
        hsnSac: "940360",
        confidence: 0.88
      }
    ],
    taxDetails: {
      taxableValue: 132799.92,
      cgst: 11952,
      sgst: 11952,
      totalAmount: 156703.92,
      amountInWords: "Rupees One Lakh Fifty Six Thousand Seven Hundred Four Only"
    },
    rawText: mockInvoiceText,
    extractedFields: [
      {
        section: "Invoice metadata",
        key: "invoice_number",
        label: "Invoice Number",
        value: "INV-2026-1148",
        confidence: 0.94,
        present: true,
        source: "fixture"
      },
      {
        section: "Invoice metadata",
        key: "invoice_date",
        label: "Invoice Date",
        value: "2026-03-13",
        confidence: 0.93,
        present: true,
        source: "fixture"
      },
      {
        section: "Supplier details",
        key: "supplier_name",
        label: "Supplier Name",
        value: "Deccan Industrial Supplies Pvt Ltd",
        confidence: 0.91,
        present: true,
        source: "fixture"
      },
      {
        section: "Supplier details",
        key: "supplier_gstin",
        label: "Supplier GSTIN",
        value: "29AACCD1148P1ZX",
        confidence: 0.91,
        present: true,
        source: "fixture"
      },
      {
        section: "Buyer details",
        key: "buyer_name",
        label: "Buyer Name",
        value: "Starline Retail Distributors LLP",
        confidence: 0.91,
        present: true,
        source: "fixture"
      },
      {
        section: "Buyer details",
        key: "buyer_gstin",
        label: "Buyer GSTIN",
        value: "27AATFS6621L1ZB",
        confidence: 0.91,
        present: true,
        source: "fixture"
      },
      {
        section: "Tax details",
        key: "taxable_value",
        label: "Taxable Value",
        value: "132799.92",
        confidence: 0.92,
        present: true,
        source: "fixture"
      },
      {
        section: "Tax details",
        key: "cgst",
        label: "CGST",
        value: "11952.00",
        confidence: 0.9,
        present: true,
        source: "fixture"
      },
      {
        section: "Tax details",
        key: "sgst",
        label: "SGST",
        value: "11952.00",
        confidence: 0.9,
        present: true,
        source: "fixture"
      },
      {
        section: "Totals",
        key: "total_amount",
        label: "Total Amount",
        value: "156703.92",
        confidence: 0.92,
        present: true,
        source: "fixture"
      }
    ],
    qualitySignals: {
      lowReadability: false,
      cutOffRisk: false,
      rotated: false,
      overlappingTextRisk: false,
      likelyScanned: false,
      noisyTokenRatio: 0.02
    }
  };

  const review = await prisma.invoiceReview.create({
    data: {
      id: "review_demo_001",
      reviewNumber: "INVREV-DEMO-001",
      uploadedFileId: uploadedFile.id,
      processingStatus: "COMPLETED",
      ocrProviderKey: "demo-text-fixture",
      ocrProviderMode: "fixture",
      extractionVersion: "invoice-workbench-v1",
      rawOcrText: mockInvoiceText,
      rawOcrPayload: stringifyJson({
        provider: "demo-text-fixture"
      }),
      normalizedPayload: stringifyJson(normalizedPayload),
      summaryInvoiceNumber: "INV-2026-1148",
      summaryInvoiceDate: new Date("2026-03-13T00:00:00.000Z"),
      summarySupplierName: "Deccan Industrial Supplies Pvt Ltd",
      summaryBuyerName: "Starline Retail Distributors LLP",
      summaryTotalAmount: 156703.92,
      extractionConfidenceScore: 91,
      completenessScore: 93,
      consistencyScore: 88,
      riskScore: 18,
      overallHealthStatus: "GOOD",
      analystRecommendation: "LOOKS_IN_ORDER"
    }
  });

  await prisma.invoiceExtractedField.createMany({
    data: [
      {
        reviewId: review.id,
        section: "Invoice metadata",
        fieldKey: "invoice_number",
        label: "Invoice Number",
        valueText: "INV-2026-1148",
        confidence: 0.94,
        isPresent: true,
        source: "fixture"
      },
      {
        reviewId: review.id,
        section: "Supplier details",
        fieldKey: "supplier_name",
        label: "Supplier Name",
        valueText: "Deccan Industrial Supplies Pvt Ltd",
        confidence: 0.91,
        isPresent: true,
        source: "fixture"
      },
      {
        reviewId: review.id,
        section: "Buyer details",
        fieldKey: "buyer_name",
        label: "Buyer Name",
        valueText: "Starline Retail Distributors LLP",
        confidence: 0.91,
        isPresent: true,
        source: "fixture"
      },
      {
        reviewId: review.id,
        section: "Totals",
        fieldKey: "total_amount",
        label: "Total Amount",
        valueText: "156703.92",
        confidence: 0.92,
        isPresent: true,
        source: "fixture"
      }
    ]
  });

  await prisma.invoiceExtractedLineItem.createMany({
    data: normalizedPayload.lineItems.map((item) => ({
      reviewId: review.id,
      lineNumber: item.lineNumber,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxableValue: item.taxableValue,
      lineAmount: item.lineAmount,
      hsnSac: item.hsnSac,
      confidence: item.confidence
    }))
  });

  await prisma.invoiceValidationResult.createMany({
    data: [
      {
        reviewId: review.id,
        checkName: "invoice_number_present",
        status: "PASS",
        severity: "LOW",
        message: "Invoice number is visible.",
        impactedFields: stringifyJson(["invoice_number"])
      },
      {
        reviewId: review.id,
        checkName: "tax_math_consistent",
        status: "PASS",
        severity: "LOW",
        message: "Tax arithmetic is internally consistent.",
        impactedFields: stringifyJson(["taxable_value", "tax_fields", "total_amount"])
      },
      {
        reviewId: review.id,
        checkName: "eway_bill_present_or_not_required",
        status: "PASS",
        severity: "LOW",
        message: "E-way bill is present or not obviously required.",
        impactedFields: stringifyJson(["eway_bill_number"])
      },
      {
        reviewId: review.id,
        checkName: "scan_quality_acceptable",
        status: "PASS",
        severity: "LOW",
        message: "Readability is acceptable for structured review.",
        impactedFields: stringifyJson(["raw_ocr_text"])
      }
    ]
  });

  await prisma.invoiceReviewScore.createMany({
    data: [
      {
        reviewId: review.id,
        scoreKey: "EXTRACTION_CONFIDENCE",
        label: "Extraction Confidence",
        score: 91,
        rationale: "OCR and field confidence are strong across the document.",
        metadata: stringifyJson(["OCR readability is high.", "Most key fields were captured."])
      },
      {
        reviewId: review.id,
        scoreKey: "COMPLETENESS",
        label: "Invoice Completeness",
        score: 93,
        rationale: "Core invoice fields and line items are present.",
        metadata: stringifyJson(["Supplier, buyer, totals, taxes, and line items are visible."])
      },
      {
        reviewId: review.id,
        scoreKey: "CONSISTENCY",
        label: "Invoice Consistency",
        score: 88,
        rationale: "Arithmetic and formatting are coherent.",
        metadata: stringifyJson(["Tax math reconciles cleanly.", "No critical warning signals were triggered."])
      },
      {
        reviewId: review.id,
        scoreKey: "RISK",
        label: "Invoice Risk",
        score: 18,
        rationale: "Only routine analyst review signals are present.",
        metadata: stringifyJson(["Low residual risk after rule checks."])
      }
    ]
  });

  await prisma.invoiceAiReview.create({
    data: {
      reviewId: review.id,
      provider: "mock",
      model: "template-analyst-v1",
      promptVersion: "invoice-review-v1",
      visibleFacts: stringifyJson([
        "Supplier and buyer identities are fully visible.",
        "Line items, taxes, logistics, and bank details are present."
      ]),
      missingFields: stringifyJson([]),
      suspiciousSignals: stringifyJson([]),
      uncertaintyNotes: stringifyJson([]),
      internalCoherence: "The invoice looks structurally normal and totals reconcile cleanly.",
      summary: "The seeded demo invoice appears complete, internally consistent, and business-like.",
      recommendedAction: "Looks In Order",
      rawResponse: stringifyJson({
        mode: "template"
      })
    }
  });

  await prisma.invoiceReviewNote.create({
    data: {
      reviewId: review.id,
      authorName: "Demo Analyst",
      body: "Seeded demo review for local testing."
    }
  });

  await prisma.invoiceReviewAuditLog.createMany({
    data: [
      {
        reviewId: review.id,
        action: "SEEDED_REVIEW_CREATED",
        entityType: "InvoiceReview",
        entityId: review.id
      },
      {
        reviewId: review.id,
        action: "SEEDED_FILE_REGISTERED",
        entityType: "InvoiceUploadedFile",
        entityId: uploadedFile.id
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

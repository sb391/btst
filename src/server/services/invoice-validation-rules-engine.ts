import type {
  InvoiceValidationResult,
  NormalizedInvoiceDocument,
  OcrDocumentResult
} from "@/lib/invoice-types";

const gstinPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/i;
const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

function result(
  checkName: string,
  status: InvoiceValidationResult["status"],
  severity: InvoiceValidationResult["severity"],
  message: string,
  impactedFields: string[],
  evidence?: Record<string, unknown>
): InvoiceValidationResult {
  return {
    checkName,
    status,
    severity,
    message,
    impactedFields,
    evidence
  };
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasMalformedGstinSignal(rawText: string) {
  const lines = rawText.split(/\r?\n/);

  for (const line of lines) {
    if (!/(gstin|gst no|gstin\/uid|gstin\/uin)/i.test(line)) {
      continue;
    }

    const stripped = line
      .replace(/.*?(gstin|gst no|gstin\/uid|gstin\/uin)\s*[:\-]?\s*/i, "")
      .trim();

    if (!stripped || /^pan:?$/i.test(stripped)) {
      continue;
    }

    const embeddedValidGstin = stripped.match(/\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]/i)?.[0];

    if (embeddedValidGstin && gstinPattern.test(embeddedValidGstin)) {
      gstinPattern.lastIndex = 0;
      continue;
    }

    gstinPattern.lastIndex = 0;

    const suspiciousToken = stripped.match(/[A-Z0-9]{10,}/i)?.[0];
    if (suspiciousToken) {
      return true;
    }
  }

  return false;
}

function isLikelyServiceInvoice(document: NormalizedInvoiceDocument) {
  if (
    document.family === "GST_SERVICE" ||
    document.family === "PINE_LABS_POS" ||
    document.family === "PAYU_MERCHANT" ||
    document.family === "BVALUE_PARTNER"
  ) {
    return true;
  }

  const rawText = document.rawText.toLowerCase();
  const serviceDescriptionSignals = document.lineItems.filter((item) =>
    /(service|charges|consulting|support|subscription|bot|login hrs|utilised|pricing|data sharing|campaign|marketing|growth plan|enrich)/i.test(
      item.description ?? ""
    )
  ).length;
  const hasSacSignals =
    rawText.includes("sac") ||
    rawText.includes("transaction type:services") ||
    rawText.includes("goods / services") ||
    rawText.includes("period:-") ||
    /data ?sharing|campaign|marketing/i.test(rawText) ||
    document.lineItems.some((item) => (item.hsnSac?.length ?? 0) === 6);

  return hasSacSignals && (serviceDescriptionSignals > 0 || /pinelabs|truecaller|payu/i.test(rawText));
}

export function runInvoiceValidationRules(input: {
  ocr: OcrDocumentResult;
  document: NormalizedInvoiceDocument;
}): InvoiceValidationResult[] {
  const { ocr, document } = input;
  const results: InvoiceValidationResult[] = [];
  const now = new Date();
  const invoiceDate = parseDate(document.invoiceDate);
  const zeroTaxSignal = /@\s*0(?:\.0+)?%|0(?:\.0+)?%|zero.?rated|nil.?rated|exempt/i.test(
    document.rawText
  );
  const taxTotal =
    (document.taxDetails.taxableValue ?? 0) +
    (document.taxDetails.cgst ?? 0) +
    (document.taxDetails.sgst ?? 0) +
    (document.taxDetails.igst ?? 0) +
    (document.taxDetails.cess ?? 0);
  const totalMismatch =
    document.taxDetails.totalAmount !== undefined &&
    Math.abs((document.taxDetails.totalAmount ?? 0) - taxTotal) > 2;
  const duplicateDescriptions = new Set<string>();
  const repeatedLineItems = document.lineItems.filter((item) => {
    if (!item.description) {
      return false;
    }

    const normalized = item.description.toLowerCase();
    if (duplicateDescriptions.has(normalized)) {
      return true;
    }

    duplicateDescriptions.add(normalized);
    return false;
  });
  const averageLineConfidence =
    document.lineItems.length > 0
      ? document.lineItems.reduce((sum, item) => sum + item.confidence, 0) / document.lineItems.length
      : 0;
  const likelyServiceInvoice = isLikelyServiceInvoice(document);
  const parserMissSignals = document.extractionDiagnostics?.parserMissSignals ?? [];

  results.push(
    document.invoiceNumber
      ? result("invoice_number_present", "PASS", "LOW", "Invoice number is visible.", ["invoice_number"])
      : result("invoice_number_present", "FAIL", "HIGH", "Invoice number is missing.", ["invoice_number"])
  );

  results.push(
    document.invoiceDate
      ? result("invoice_date_present", "PASS", "LOW", "Invoice date is visible.", ["invoice_date"])
      : result("invoice_date_present", "FAIL", "HIGH", "Invoice date is missing.", ["invoice_date"])
  );

  results.push(
    document.supplier.name
      ? result("supplier_name_present", "PASS", "LOW", "Supplier name is visible.", ["supplier_name"])
      : result("supplier_name_present", "FAIL", "HIGH", "Supplier name is missing.", ["supplier_name"])
  );

  results.push(
    document.buyer.name
      ? result("buyer_name_present", "PASS", "LOW", "Buyer name is visible.", ["buyer_name"])
      : result("buyer_name_present", "FAIL", "HIGH", "Buyer name is missing.", ["buyer_name"])
  );

  results.push(
    document.taxDetails.totalAmount !== undefined
      ? result("total_amount_present", "PASS", "LOW", "Total amount is visible.", ["total_amount"])
      : result("total_amount_present", "FAIL", "HIGH", "Total amount is missing.", ["total_amount"])
  );

  results.push(
    invoiceDate
      ? result("invoice_date_format_valid", "PASS", "LOW", "Invoice date format is valid.", ["invoice_date"])
      : result("invoice_date_format_valid", "FAIL", "MEDIUM", "Invoice date format is invalid or unreadable.", ["invoice_date"])
  );

  if (invoiceDate) {
    results.push(
      invoiceDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000
        ? result("invoice_date_not_in_future", "FAIL", "HIGH", "Invoice date appears to be in the future.", ["invoice_date"])
        : result("invoice_date_not_in_future", "PASS", "LOW", "Invoice date is not in the future.", ["invoice_date"])
    );

    results.push(
      now.getTime() - invoiceDate.getTime() > 180 * 24 * 60 * 60 * 1000
        ? result("invoice_date_not_suspiciously_old", "WARN", "MEDIUM", "Invoice date is materially older than expected for a fresh review.", ["invoice_date"])
        : result("invoice_date_not_suspiciously_old", "PASS", "LOW", "Invoice date is within a normal review window.", ["invoice_date"])
    );
  }

  const supplierGstinValid = !document.supplier.gstin || gstinPattern.test(document.supplier.gstin);
  const buyerGstinValid = !document.buyer.gstin || gstinPattern.test(document.buyer.gstin);
  gstinPattern.lastIndex = 0;
  const malformedGstinSignal = hasMalformedGstinSignal(document.rawText);
  results.push(
    supplierGstinValid && buyerGstinValid && !malformedGstinSignal
      ? result("gstin_format_valid", "PASS", "LOW", "Visible GSTINs match expected format.", ["supplier_gstin", "buyer_gstin"])
      : result("gstin_format_valid", "FAIL", "HIGH", "One or more GSTINs are badly formatted.", ["supplier_gstin", "buyer_gstin"])
  );

  results.push(
    document.lineItems.length
      ? result("line_items_detected", "PASS", "LOW", "Line items were detected.", ["line_items"], {
          count: document.lineItems.length
        })
      : result("line_items_detected", "WARN", "MEDIUM", "No reliable line items were extracted.", ["line_items"])
  );

  results.push(
    totalMismatch
      ? result("tax_math_consistent", "FAIL", "HIGH", "Tax arithmetic does not reconcile to the invoice total.", ["taxable_value", "tax_fields", "total_amount"], {
          expectedTotal: taxTotal,
          extractedTotal: document.taxDetails.totalAmount
        })
      : result("tax_math_consistent", "PASS", "LOW", "Tax arithmetic is internally consistent.", ["taxable_value", "tax_fields", "total_amount"])
  );

  results.push(
    document.taxDetails.taxableValue !== undefined &&
      !document.taxDetails.cgst &&
      !document.taxDetails.sgst &&
      !document.taxDetails.igst &&
      !zeroTaxSignal
      ? result("tax_fields_present", "WARN", "MEDIUM", "Taxable value is visible but tax breakup is missing.", ["taxable_value", "tax_fields"])
      : result("tax_fields_present", "PASS", "LOW", "Tax fields are present or not required.", ["tax_fields"])
  );

  results.push(
    document.lineItems.some((item) => item.hsnSac)
      ? result("hsn_or_sac_present", "PASS", "LOW", "HSN/SAC was found in the invoice.", ["hsn_sac"])
      : result("hsn_or_sac_present", "WARN", "MEDIUM", "HSN/SAC was not detected clearly.", ["hsn_sac"])
  );

  results.push(
    (document.taxDetails.totalAmount ?? 0) >= 50000 && !document.eWayBillNumber && !likelyServiceInvoice
      ? result("eway_bill_present_or_not_required", "WARN", "MEDIUM", "E-way bill is missing for a higher-value invoice.", ["eway_bill_number", "total_amount"])
      : result("eway_bill_present_or_not_required", "PASS", "LOW", "E-way bill is present or not obviously required.", ["eway_bill_number"])
  );

  results.push(
    repeatedLineItems.length
      ? result("duplicate_line_items_if_obvious", "WARN", "MEDIUM", "Repeated line item descriptions were detected.", ["line_items"], {
          repeatedDescriptions: repeatedLineItems.map((item) => item.description)
        })
      : result("duplicate_line_items_if_obvious", "PASS", "LOW", "No obvious duplicate line items were detected.", ["line_items"])
  );

  results.push(
    /[^A-Z0-9/-]/i.test(document.invoiceNumber ?? "") || (document.invoiceNumber?.length ?? 0) < 4
      ? result("invoice_number_format_regular", "WARN", "LOW", "Invoice number format looks irregular.", ["invoice_number"])
      : result("invoice_number_format_regular", "PASS", "LOW", "Invoice number format looks regular.", ["invoice_number"])
  );

  const bankDetailsPresent =
    Boolean(document.bankDetails?.bankName) ||
    Boolean(document.bankDetails?.accountNumber) ||
    Boolean(document.bankDetails?.ifsc) ||
    Boolean(document.bankDetails?.rawText);
  const bankDetailsOdd =
    (document.bankDetails?.ifsc && !ifscPattern.test(document.bankDetails.ifsc)) ||
    (document.bankDetails?.accountNumber && document.bankDetails.accountNumber.replace(/\D/g, "").length < 8);
  results.push(
    bankDetailsPresent && bankDetailsOdd
      ? result("bank_details_format_reasonable", "WARN", "MEDIUM", "Bank details are visible but look oddly formatted.", ["bank_details"])
      : result("bank_details_format_reasonable", "PASS", "LOW", "Bank details are absent or formatted normally.", ["bank_details"])
  );

  results.push(
    /amount in words/i.test(document.rawText) && !document.taxDetails.amountInWords
      ? result("amount_in_words_detected_if_expected", "WARN", "LOW", "Amount in words label exists but the value was not extracted clearly.", ["amount_in_words"])
      : result("amount_in_words_detected_if_expected", "PASS", "LOW", "Amount in words is present or the format does not make it relevant.", ["amount_in_words"])
  );

  results.push(
    parserMissSignals.length
      ? result(
          "parser_evidence_alignment",
          "WARN",
          "HIGH",
          "Raw OCR contains field evidence that the structured parser did not capture cleanly.",
          parserMissSignals,
          {
            parserMissSignals,
            evidenceSignals: document.extractionDiagnostics?.evidenceSignals ?? []
          }
        )
      : result(
          "parser_evidence_alignment",
          "PASS",
          "LOW",
          "Structured extraction is aligned with the visible OCR evidence.",
          ["structured_extraction"]
        )
  );

  results.push(
    averageLineConfidence > 0 && averageLineConfidence < 0.58
      ? result("table_extraction_confidence_acceptable", "WARN", "MEDIUM", "Line item extraction confidence is weak.", ["line_items"], {
          averageLineConfidence
        })
      : result("table_extraction_confidence_acceptable", "PASS", "LOW", "Line item extraction confidence is acceptable.", ["line_items"])
  );

  results.push(
    ocr.averageConfidence < 0.55 || document.qualitySignals.lowReadability
      ? result("scan_quality_acceptable", "FAIL", "HIGH", "OCR readability is poor, so manual review is required.", ["raw_ocr_text"], {
          averageConfidence: ocr.averageConfidence,
          qualitySignals: document.qualitySignals
        })
      : result("scan_quality_acceptable", "PASS", "LOW", "Readability is acceptable for structured review.", ["raw_ocr_text"])
  );

  results.push(
    document.qualitySignals.cutOffRisk
      ? result("page_cutoff_not_detected", "WARN", "MEDIUM", "The document may be cut off or truncated.", ["raw_ocr_text"])
      : result("page_cutoff_not_detected", "PASS", "LOW", "No obvious cutoff signal was detected.", ["raw_ocr_text"])
  );

  results.push(
    document.qualitySignals.overlappingTextRisk
      ? result("template_consistency_reasonable", "WARN", "MEDIUM", "Text layout looks noisy or inconsistent.", ["raw_ocr_text"])
      : result("template_consistency_reasonable", "PASS", "LOW", "No major layout inconsistency was detected from OCR output.", ["raw_ocr_text"])
  );

  return results;
}

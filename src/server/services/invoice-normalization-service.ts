import type {
  InvoiceBankDetails,
  InvoiceFieldValue,
  InvoiceLineItem,
  NormalizedInvoiceDocument,
  OcrDocumentResult
} from "@/lib/invoice-types";
import { safeNumber } from "@/lib/utils";

const gstinPattern = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/gi;
const ifscPattern = /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi;
const invoiceNumberPattern = /\b(?:invoice|inv)\s*(?:no|number|#)?[:\-\s]*([A-Z0-9/-]{4,})\b/i;
const datePattern = /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{8})\b/;
const companyNamePattern =
  /\b(?:private limited|pvt\.?\s*ltd|limited|ltd|llp|elasticrun|transportation services|industr(?:y|ies)|enterprises?|traders|india limited)\b/i;
const genericPartyValuePattern =
  /^(?:address:?|buyer:?|seller:?|supplier:?|from:?|to:?|bill to:?|bill to address:?|buyer address:?|ship to:?|ship to address:?|for:?|gstin:?|pan:?)$/i;

function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizedValue(value?: string) {
  return value?.replace(/\s+/g, " ").trim();
}

function stripLeadingLabel(value: string) {
  return value.replace(/^(?:buyer|seller|supplier|from|bill to|ship to|address)\s*:\s*/i, "").trim();
}

function isMeaningfulValue(value?: string) {
  const normalized = normalizedValue(value);

  if (!normalized) {
    return false;
  }

  return !genericPartyValuePattern.test(normalized);
}

function meaningfulValue(value?: string) {
  const cleaned = stripLeadingLabel(normalizedValue(value) ?? "");
  return isMeaningfulValue(cleaned) ? cleaned : undefined;
}

function extractInlineValue(text: string, matchers: RegExp[]) {
  const allLines = lines(text);

  for (const line of allLines) {
    for (const matcher of matchers) {
      const match = line.match(matcher);
      const candidate = meaningfulValue(match?.[1]);

      if (candidate) {
        return candidate;
      }
    }
  }

  return undefined;
}

function extractLabeledValue(text: string, labels: string[]) {
  const allLines = lines(text);

  for (const line of allLines) {
    const lower = line.toLowerCase();

    for (const label of labels) {
      if (lower.startsWith(label.toLowerCase())) {
        const value = line.slice(label.length).replace(/^[:\s-]+/, "").trim();

        if (value) {
          return value;
        }
      }
    }
  }

  return "";
}

function extractSectionLines(text: string, startMatchers: RegExp[], stopMatchers: RegExp[], maxLines = 8) {
  const allLines = lines(text);

  for (let index = 0; index < allLines.length; index += 1) {
    const line = allLines[index]!;

    if (!startMatchers.some((matcher) => matcher.test(line))) {
      continue;
    }

    const block: string[] = [];

    for (let cursor = index + 1; cursor < allLines.length && block.length < maxLines; cursor += 1) {
      const next = allLines[cursor]!;

      if (stopMatchers.some((matcher) => matcher.test(next))) {
        break;
      }

      block.push(next);
    }

    return block;
  }

  return [];
}

function extractBlock(text: string, startMatchers: RegExp[], stopMatchers: RegExp[], maxLines = 8) {
  return normalizedValue(extractSectionLines(text, startMatchers, stopMatchers, maxLines).join(", "));
}

function cleanAddressLines(sectionLines: string[]) {
  return sectionLines.filter((line) => {
    if (/^(gstin|pan|contact|mobile|date|delivery date|business type)\b/i.test(line)) {
      return false;
    }

    if (/^\d{10}$/.test(line)) {
      return false;
    }

    return true;
  });
}

function parseInvoiceDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const cleaned = value.replace(/[.]/g, "/").replace(/-/g, "/");
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (match) {
    const [, day, month, year] = match;
    const normalizedYear = year!.length === 2 ? `20${year}` : year!;
    return `${normalizedYear}-${month!.padStart(2, "0")}-${day!.padStart(2, "0")}`;
  }

  const denseMatch = value.match(/^(\d{2})(\d{2})(\d{4})$/);

  if (denseMatch) {
    const [, day, month, year] = denseMatch;
    return `${year}-${month}-${day}`;
  }

  return undefined;
}

function parseMoney(value?: string) {
  if (!value) {
    return undefined;
  }

  const numeric = value.replace(/[^\d.()-]/g, "").replace(/[()]/g, "");
  const parsed = safeNumber(numeric, Number.NaN);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function averageConfidence(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function field(
  section: string,
  key: string,
  label: string,
  value: string | undefined,
  confidence: number,
  source: string,
  rawTextSnippet?: string
): InvoiceFieldValue {
  const normalized = normalizedValue(value) ?? "";
  const present = Boolean(normalized) && normalized !== "Not extracted";

  return {
    section,
    key,
    label,
    value: present ? normalized : "Not extracted",
    confidence,
    present,
    source,
    rawTextSnippet
  };
}

function extractGstins(text: string) {
  return Array.from(new Set(text.match(gstinPattern) ?? []));
}

function firstGstinInLines(sectionLines: string[]) {
  const blockText = sectionLines.join("\n");
  const values = extractGstins(blockText);
  return values[0];
}

function extractBankDetails(text: string): InvoiceBankDetails | undefined {
  const bankName = extractLabeledValue(text, ["bank name", "bank", "bank details"]);
  const accountNumber = extractLabeledValue(text, ["account no", "account number", "a/c no"]);
  const ifsc = extractLabeledValue(text, ["ifsc", "ifsc code"]);
  const branch = extractLabeledValue(text, ["branch"]);
  const rawText = extractBlock(
    text,
    [/^bank details$/i, /^payment details$/i],
    [/^invoice total/i, /^grand total/i, /^payment terms/i],
    5
  );

  if (!bankName && !accountNumber && !ifsc && !branch && !rawText) {
    return undefined;
  }

  return {
    bankName: meaningfulValue(bankName),
    accountNumber: normalizedValue(accountNumber),
    ifsc: normalizedValue(ifsc),
    branch: normalizedValue(branch),
    rawText: normalizedValue(rawText)
  };
}

function isStandaloneNumericLine(line: string) {
  return /^-?\d[\d,]*\.?\d*$/.test(line.trim());
}

function isRateLine(line: string) {
  return /^@\s*\d[\d,]*\.?\d*$/.test(line.trim());
}

function cleanItemDescription(parts: string[]) {
  const cleanedParts = parts
    .map((part) => normalizedValue(part) ?? "")
    .map((part) => part.replace(/^kg\s*=\s*\d+\s*kg\s*/i, "").trim())
    .filter(Boolean);

  if (!cleanedParts.length) {
    return undefined;
  }

  const base = cleanedParts[0]!;
  const bagsLine = cleanedParts.find((part) => /no\.?\s*of\s*bags/i.test(part));

  if (!bagsLine || bagsLine === base) {
    return base;
  }

  return `${base} (${bagsLine.replace(/^[,;:\s]+/, "")})`;
}

function parseStructuredLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const allLines = lines(text);
  const headerIndex = allLines.findIndex((line) => /^sr$/i.test(line));
  const isRowNumber = (value: string) => /^\d{1,3}$/.test(value.trim());

  if (headerIndex === -1) {
    return [];
  }

  const totalsIndex = allLines.findIndex((line, index) => index > headerIndex && /^totals$/i.test(line));
  const tableLines = allLines.slice(headerIndex + 1, totalsIndex === -1 ? allLines.length : totalsIndex);
  const items: InvoiceLineItem[] = [];

  for (let index = 0; index < tableLines.length; index += 1) {
    const line = tableLines[index]!;

    if (!isRowNumber(line)) {
      continue;
    }

    const rowNumber = Number(line);
    const rowLines: string[] = [];

    for (let cursor = index + 1; cursor < tableLines.length; cursor += 1) {
      const next = tableLines[cursor]!;

      if (isRowNumber(next)) {
        index = cursor - 1;
        break;
      }

      rowLines.push(next);
      index = cursor;
    }

    if (!rowLines.length) {
      continue;
    }

    const hsnIndex = rowLines.findIndex((candidate) => /^\d{4,8}$/.test(candidate));
    const quantityIndex =
      hsnIndex === -1
        ? -1
        : rowLines.findIndex((candidate, candidateIndex) => candidateIndex > hsnIndex && isStandaloneNumericLine(candidate));
    const unitIndex =
      quantityIndex === -1
        ? -1
        : rowLines.findIndex((candidate, candidateIndex) => candidateIndex > quantityIndex && /^[A-Za-z]{1,8}$/.test(candidate));
    const numericCandidates = rowLines
      .map((candidate, candidateIndex) => ({
        value: parseMoney(candidate),
        index: candidateIndex,
        raw: candidate
      }))
      .filter((candidate) => candidate.value !== undefined && !isRateLine(candidate.raw));
    const amountCandidates = numericCandidates.filter(
      (candidate) => candidate.index !== hsnIndex && candidate.index !== quantityIndex
    );
    const rateCandidates = rowLines
      .map((candidate) => parseMoney(candidate.match(/^@\s*([\d.,]+)/)?.[1]))
      .filter((candidate): candidate is number => candidate !== undefined && candidate > 0);
    const positiveAmounts = amountCandidates
      .map((candidate) => candidate.value!)
      .filter((candidate) => candidate > 0);
    const description = cleanItemDescription(
      rowLines.filter((candidate, candidateIndex) => {
        if (candidateIndex === hsnIndex || candidateIndex === quantityIndex || candidateIndex === unitIndex) {
          return false;
        }

        return !isStandaloneNumericLine(candidate) && !isRateLine(candidate);
      })
    );
    const quantity = quantityIndex === -1 ? undefined : parseMoney(rowLines[quantityIndex]);
    const unit = unitIndex === -1 ? undefined : normalizedValue(rowLines[unitIndex]);
    const lineAmount = positiveAmounts.length ? positiveAmounts[positiveAmounts.length - 1] : undefined;
    const taxableValue =
      positiveAmounts.length > 1
        ? positiveAmounts[positiveAmounts.length - 2]
        : lineAmount;
    const unitPrice = rateCandidates[0];
    const hsnSac = hsnIndex === -1 ? undefined : rowLines[hsnIndex];
    const matchedSignals = [description, quantity, lineAmount, hsnSac].filter(Boolean).length;
    const confidence = Number(
      Math.max(0.46, Math.min(0.95, ocrConfidence - 0.06 + matchedSignals * 0.04)).toFixed(2)
    );

    if (!description && !lineAmount && !quantity) {
      continue;
    }

    items.push({
      lineNumber: Number.isFinite(rowNumber) ? rowNumber : items.length + 1,
      description,
      quantity,
      unit,
      unitPrice,
      taxableValue,
      lineAmount,
      hsnSac,
      confidence,
      rawTextSnippet: rowLines.join(" | ")
    });
  }

  return items;
}

function parseFallbackLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const allLines = lines(text);
  const itemHeaderIndex = allLines.findIndex((line) => /description|item|qty|quantity|rate|amount/i.test(line));

  if (itemHeaderIndex === -1) {
    return [];
  }

  const items: InvoiceLineItem[] = [];

  for (let index = itemHeaderIndex + 1; index < allLines.length; index += 1) {
    const line = allLines[index]!;

    if (/taxable value|taxable amount|rounded total|grand total|invoice total|cgst|sgst|igst|bank details|payment terms/i.test(line)) {
      break;
    }

    const amountMatches = line.match(/(?:\d[\d,]*\.?\d{0,2})/g) ?? [];

    if (amountMatches.length < 2) {
      continue;
    }

    const amount = parseMoney(amountMatches[amountMatches.length - 1]);
    const unitPrice = parseMoney(amountMatches[amountMatches.length - 2]);
    const quantity = parseMoney(amountMatches[0]);
    const description = line.replace(/(?:\d[\d,]*\.?\d{0,2})/g, " ").replace(/\s+/g, " ").trim();
    const hsnMatch = line.match(/\b\d{4,8}\b/);

    items.push({
      lineNumber: items.length + 1,
      description: normalizedValue(description),
      quantity,
      unitPrice,
      taxableValue: amount,
      lineAmount: amount,
      hsnSac: hsnMatch?.[0],
      confidence: Number(Math.max(0.35, ocrConfidence - 0.08).toFixed(2)),
      rawTextSnippet: line
    });
  }

  return items;
}

function extractLineItems(text: string, ocrConfidence: number) {
  const structured = parseStructuredLineItems(text, ocrConfidence);

  if (structured.length) {
    return structured;
  }

  return parseFallbackLineItems(text, ocrConfidence);
}

function extractSupplierName(text: string, supplierGstin?: string, buyerName?: string) {
  const explicitName = extractInlineValue(text, [
    /^supplier name\s*:\s*(.+)$/i,
    /^supplier\s*:\s*(.+)$/i,
    /^seller name\s*:\s*(.+)$/i,
    /^seller\s*:\s*(.+)$/i
  ]);

  if (explicitName) {
    return explicitName;
  }

  const allLines = lines(text);

  if (supplierGstin) {
    for (let index = 0; index < allLines.length; index += 1) {
      const candidate = allLines[index]!;
      const nearby = allLines.slice(index, index + 5).join(" ");

      if (!companyNamePattern.test(candidate) || !nearby.includes(supplierGstin)) {
        continue;
      }

      const cleaned = candidate.replace(/^for\s+/i, "").trim();

      if (cleaned && cleaned !== buyerName) {
        return cleaned;
      }
    }
  }

  return allLines
    .map((line) => line.replace(/^for\s+/i, "").trim())
    .find((line) => companyNamePattern.test(line) && line !== buyerName && !/^authorized signatory$/i.test(line));
}

function extractBuyerName(text: string) {
  return (
    extractInlineValue(text, [
      /^buyer name\s*:\s*(.+)$/i,
      /^buyer\s*:\s*(.+)$/i,
      /^bill to\s*:\s*(?!address\b)(.+)$/i,
      /^consignee\s*:\s*(.+)$/i
    ]) ??
    lines(text).find((line) => /^buyer\s*:/i.test(line))?.replace(/^buyer\s*:\s*/i, "").trim()
  );
}

function hasZeroTaxSignal(text: string) {
  return /@\s*0(?:\.0+)?%|0(?:\.0+)?%/i.test(text);
}

export function normalizeInvoiceDocument(ocr: OcrDocumentResult): NormalizedInvoiceDocument {
  const text = ocr.rawText;
  const ocrConfidence = ocr.averageConfidence;
  const allLines = lines(text);
  const buyerSectionLines = extractSectionLines(
    text,
    [/^bill to address:?$/i, /^buyer address:?$/i, /^billed to:?$/i],
    [/^date\b/i, /^delivery date\b/i, /^contact\b/i, /^mobile\b/i, /^business type\b/i, /^from address:?$/i, /^ship to address:?$/i],
    8
  );
  const supplierSectionLines = extractSectionLines(
    text,
    [/^from address:?$/i, /^supplier address:?$/i, /^seller address:?$/i],
    [/^place of supply\b/i, /^ship to address:?$/i, /^rcm applicable\b/i, /^sr$/i, /^item$/i],
    8
  );
  const buyerGstin = firstGstinInLines(buyerSectionLines) ?? extractInlineValue(text, [/^buyer gstin\s*:\s*(.+)$/i]);
  const supplierGstin = firstGstinInLines(supplierSectionLines) ?? extractInlineValue(text, [/^supplier gstin\s*:\s*(.+)$/i]);
  const invoiceNumberAfterTitleIndex = allLines.findIndex(
    (line, index) => /^tax invoice$/i.test(line) && Boolean(allLines[index + 1] && /^[A-Z0-9/-]{6,}$/.test(allLines[index + 1]!))
  );
  const invoiceNumber =
    extractLabeledValue(text, ["invoice number", "invoice no", "invoice #"]) ||
    (invoiceNumberAfterTitleIndex === -1 ? undefined : allLines[invoiceNumberAfterTitleIndex + 1]) ||
    text.match(invoiceNumberPattern)?.[1];
  const invoiceDateValue =
    extractLabeledValue(text, ["invoice date", "date"]) ||
    allLines.find((line) => /invoice date|^date\b/i.test(line) && datePattern.test(line)) ||
    "";
  const invoiceDate = parseInvoiceDate(invoiceDateValue.match(datePattern)?.[1] ?? invoiceDateValue);
  const buyerName = extractBuyerName(text);
  const supplierName = extractSupplierName(text, supplierGstin, buyerName);
  const buyerAddress = normalizedValue(cleanAddressLines(buyerSectionLines).join(", "));
  const supplierAddress = normalizedValue(cleanAddressLines(supplierSectionLines).join(", "));
  const placeOfSupply = extractLabeledValue(text, ["place of supply"]);
  const poNumber = extractLabeledValue(text, ["po number", "po no", "purchase order"]);
  const vehicleNumber = extractLabeledValue(text, ["vehicle number", "vehicle no"]);
  const eWayBillNumber = extractLabeledValue(text, ["e-way bill number", "eway bill number", "eway bill", "ewaybill"]);
  const paymentTerms = extractLabeledValue(text, ["payment terms", "terms"]);
  const amountInWords =
    extractInlineValue(text, [/^amount in words\s*:\s*(.+)$/i, /^in words\s*:\s*(.+)$/i]) ??
    extractBlock(text, [/^amount in words:?$/i, /^in words:?$/i], [/^rounded total/i, /^for /i, /^irn:?$/i], 2);
  const lineItems = extractLineItems(text, ocrConfidence);
  const roundedTotal = parseMoney(extractLabeledValue(text, ["rounded total"]));
  const labeledTaxableValue = parseMoney(
    extractLabeledValue(text, ["taxable value", "subtotal", "taxable amount", "sub total"])
  );
  const cgst = parseMoney(extractLabeledValue(text, ["cgst"]));
  const sgst = parseMoney(extractLabeledValue(text, ["sgst"]));
  const igst = parseMoney(extractLabeledValue(text, ["igst"]));
  const cess = parseMoney(extractLabeledValue(text, ["cess"]));
  const labeledTotalAmount = parseMoney(
    extractLabeledValue(text, ["invoice total", "grand total", "total value", "total amount", "rounded total"])
  );
  const zeroTaxSignal = hasZeroTaxSignal(text);
  const totalAmount =
    labeledTotalAmount ??
    roundedTotal ??
    (lineItems.length === 1 ? lineItems[0]?.lineAmount : undefined);
  const taxableValue =
    labeledTaxableValue ??
    (lineItems.length === 1 ? lineItems[0]?.taxableValue : undefined) ??
    ((zeroTaxSignal || (!cgst && !sgst && !igst && !cess)) ? totalAmount : undefined);
  const bankDetails = extractBankDetails(text);
  const signatureOrStamp = /authori[sz]ed signatory|stamp|seal/i.test(text)
    ? "present"
    : ocrConfidence < 0.45
      ? "unclear"
      : "not_detected";

  const extractedFields: InvoiceFieldValue[] = [
    field("Invoice metadata", "invoice_number", "Invoice Number", meaningfulValue(invoiceNumber), ocrConfidence, "ocr"),
    field("Invoice metadata", "invoice_date", "Invoice Date", invoiceDate, ocrConfidence, "ocr"),
    field("Supplier details", "supplier_name", "Supplier Name", meaningfulValue(supplierName), ocrConfidence - 0.02, "ocr"),
    field("Supplier details", "supplier_address", "Supplier Address", normalizedValue(supplierAddress), ocrConfidence - 0.05, "ocr"),
    field("Supplier details", "supplier_gstin", "Supplier GSTIN", normalizedValue(supplierGstin), ocrConfidence - 0.04, "ocr"),
    field("Buyer details", "buyer_name", "Buyer Name", meaningfulValue(buyerName), ocrConfidence - 0.02, "ocr"),
    field("Buyer details", "buyer_address", "Buyer Address", normalizedValue(buyerAddress), ocrConfidence - 0.05, "ocr"),
    field("Buyer details", "buyer_gstin", "Buyer GSTIN", normalizedValue(buyerGstin), ocrConfidence - 0.04, "ocr"),
    field("Invoice metadata", "place_of_supply", "Place Of Supply", normalizedValue(placeOfSupply), ocrConfidence - 0.05, "ocr"),
    field("Invoice metadata", "po_number", "PO Number", normalizedValue(poNumber), ocrConfidence - 0.06, "ocr"),
    field("Tax details", "taxable_value", "Taxable Value", taxableValue !== undefined ? String(taxableValue) : undefined, ocrConfidence - 0.03, "ocr"),
    field("Tax details", "cgst", "CGST", cgst !== undefined ? String(cgst) : undefined, ocrConfidence - 0.04, "ocr"),
    field("Tax details", "sgst", "SGST", sgst !== undefined ? String(sgst) : undefined, ocrConfidence - 0.04, "ocr"),
    field("Tax details", "igst", "IGST", igst !== undefined ? String(igst) : undefined, ocrConfidence - 0.04, "ocr"),
    field("Totals", "total_amount", "Total Amount", totalAmount !== undefined ? String(totalAmount) : undefined, ocrConfidence - 0.03, "ocr"),
    field("Logistics", "vehicle_number", "Vehicle Number", normalizedValue(vehicleNumber), ocrConfidence - 0.06, "ocr"),
    field("Logistics", "eway_bill_number", "E-Way Bill Number", normalizedValue(eWayBillNumber), ocrConfidence - 0.06, "ocr"),
    field("Invoice metadata", "payment_terms", "Payment Terms", normalizedValue(paymentTerms), ocrConfidence - 0.07, "ocr"),
    field("Bank / Payment", "bank_name", "Bank Name", bankDetails?.bankName, ocrConfidence - 0.08, "ocr"),
    field("Bank / Payment", "account_number", "Account Number", bankDetails?.accountNumber, ocrConfidence - 0.08, "ocr"),
    field("Bank / Payment", "ifsc", "IFSC", bankDetails?.ifsc, ocrConfidence - 0.08, "ocr"),
    field("Invoice metadata", "amount_in_words", "Amount In Words", normalizedValue(amountInWords), ocrConfidence - 0.06, "ocr"),
    field(
      "Invoice metadata",
      "signature_or_stamp",
      "Signature / Stamp",
      signatureOrStamp === "present" ? "Detected in visible text" : signatureOrStamp === "unclear" ? "Unclear" : undefined,
      ocrConfidence - 0.1,
      "ocr"
    )
  ].map((item) => ({
    ...item,
    confidence: Number(Math.max(0.1, Math.min(item.confidence, 0.98)).toFixed(2))
  }));

  const hsnValues = [
    ...new Set(
      [
        ...lineItems.map((item) => item.hsnSac).filter((value): value is string => Boolean(value)),
        ...allLines
          .map((line) => {
            if (!/hsn|sac/i.test(line)) {
              return undefined;
            }

            return line.match(/\b\d{4,8}\b/)?.[0];
          })
          .filter((value): value is string => Boolean(value))
      ]
    )
  ];

  return {
    supplier: {
      name: meaningfulValue(supplierName),
      address: normalizedValue(supplierAddress),
      gstin: normalizedValue(supplierGstin)
    },
    buyer: {
      name: meaningfulValue(buyerName),
      address: normalizedValue(buyerAddress),
      gstin: normalizedValue(buyerGstin)
    },
    invoiceNumber: meaningfulValue(invoiceNumber),
    invoiceDate,
    placeOfSupply: normalizedValue(placeOfSupply),
    poNumber: normalizedValue(poNumber),
    vehicleNumber: normalizedValue(vehicleNumber),
    eWayBillNumber: normalizedValue(eWayBillNumber),
    paymentTerms: normalizedValue(paymentTerms),
    bankDetails,
    signatureOrStamp,
    lineItems: lineItems.map((item, index) => ({
      ...item,
      hsnSac: item.hsnSac ?? hsnValues[index]
    })),
    taxDetails: {
      taxableValue,
      cgst,
      sgst,
      igst,
      cess,
      totalAmount,
      amountInWords: normalizedValue(amountInWords)
    },
    rawText: text,
    extractedFields,
    qualitySignals: ocr.qualitySignals
  };
}

export function averageExtractedFieldConfidence(document: NormalizedInvoiceDocument) {
  return Number(
    averageConfidence(document.extractedFields.filter((item) => item.present).map((item) => item.confidence)).toFixed(2)
  );
}

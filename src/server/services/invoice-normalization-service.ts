import type {
  InvoiceBankDetails,
  InvoiceDetectedSection,
  InvoiceFieldValue,
  InvoiceLineItem,
  NormalizedInvoiceDocument,
  OcrDocumentResult
} from "@/lib/invoice-types";
import { safeNumber } from "@/lib/utils";
import {
  analyzeInvoiceStructure,
  extractStructuredFieldValue,
  sectionLines
} from "@/server/services/invoice-document-structure-service";

const gstinPattern = /\b\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]\b/gi;
const ifscPattern = /\b[A-Z]{4}0[A-Z0-9]{6}\b/gi;
const invoiceNumberPattern = /\b(?:invoice|inv)\s*(?:no|number|#)?[:\-\s]*([A-Z0-9/-]{4,})\b/i;
const datePattern = /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{8})\b/;
const companyNamePattern =
  /(?:private limited|privatelimited|pvt\.?\s*ltd|pvtltd|limited|ltd|llp|elasticrun|transportation services|industr(?:y|ies)|enterprises?|traders|india limited)/i;
const genericPartyValuePattern =
  /^(?:address:?|buyer:?|seller:?|supplier:?|from:?|to:?|bill to:?|bill to address:?|buyer address:?|ship to:?|ship to address:?|for:?|gstin:?|pan:?)$/i;
const compressedOcrReplacements: Array<[RegExp, string]> = [
  [/TAXINVOICE/gi, "TAX INVOICE"],
  [/FINCOOPERS/gi, "FIN COOPERS"],
  [/COOPERSCAPITAL/gi, "COOPERS CAPITAL"],
  [/CAPITALPVT/gi, "CAPITAL PVT"],
  [/BVALUESERVICES/gi, "BVALUE SERVICES"],
  [/PRIVATELIMITED/gi, "PRIVATE LIMITED"],
  [/PVTLTD/gi, "PVT LTD"],
  [/AxisBankLtd/gi, "Axis Bank Ltd"],
  [/HSRLayout/gi, "HSR Layout"],
  [/CrossRoad/gi, "Cross Road"],
  [/NehruNagar/gi, "Nehru Nagar"],
  [/NagarIndore/gi, "Nagar Indore"],
  [/BengaluruUrban/gi, "Bengaluru Urban"],
  [/StateName/gi, "State Name"],
  [/BankName/gi, "Bank Name"],
  [/AccountName/gi, "Account Name"],
  [/AccountNo/gi, "Account No"],
  [/IFSCCode/gi, "IFSC Code"],
  [/AuthorizedSignatory/gi, "Authorized Signatory"],
  [/TotalAmount/gi, "Total Amount"],
  [/Amounttobecreditedingivenbankdetails/gi, "Amount to be credited in given bank details"],
  [/InvoiceNo\.InvoiceDate/gi, "Invoice No. Invoice Date"],
  [/DataSharing/gi, "Data Sharing"]
];

function lines(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizedValue(value?: string) {
  return value?.replace(/\s+/g, " ").trim();
}

function collapseRepeatedText(value?: string) {
  const normalized = normalizedValue(value);

  if (!normalized) {
    return undefined;
  }

  if (normalized.length % 2 === 0) {
    const midpoint = normalized.length / 2;
    const left = normalized.slice(0, midpoint);
    const right = normalized.slice(midpoint);

    if (left === right) {
      return left;
    }
  }

  return normalized;
}

function formatCompressedOcrText(value?: string) {
  const collapsed = collapseRepeatedText(value);

  if (!collapsed) {
    return undefined;
  }

  let formatted = collapsed;

  for (const [pattern, replacement] of compressedOcrReplacements) {
    formatted = formatted.replace(pattern, replacement);
  }

  return normalizedValue(
    formatted
      .replace(/([0-9])\s+(st|nd|rd|th)\b/gi, "$1$2")
      .replace(/([0-9/])([A-Z])/g, (match, prefix: string, capital: string, offset: number, source: string) => {
        const suffix = source.slice(offset + 1, offset + 3).toUpperCase();
        return ["ST", "ND", "RD", "TH"].includes(suffix) ? `${prefix}${capital}` : `${prefix} ${capital}`;
      })
      .replace(/([A-Za-z])\(/g, "$1 (")
      .replace(/\)(?=[A-Za-z0-9])/g, ") ")
      .replace(/\)-(?=\d)/g, ") - ")
      .replace(/\/\s+(?=[A-Za-z0-9])/g, "/")
      .replace(/,\s*/g, ", ")
      .replace(/\bNo\.(\d)/g, "No. $1")
  );
}

function formatOcrName(value?: string) {
  return formatCompressedOcrText(value);
}

function formatOcrAddress(value?: string) {
  return formatCompressedOcrText(value);
}

function formatAmountInWords(value?: string) {
  const formatted = formatCompressedOcrText(value);

  return normalizedValue(formatted?.replace(/([a-z])([A-Z])/g, "$1 $2"));
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
  if (/^[:#./-]+$/.test(cleaned)) {
    return undefined;
  }
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

function extractAnywhereValue(text: string, matchers: RegExp[]) {
  for (const matcher of matchers) {
    const match = text.match(matcher);
    const candidate = meaningfulValue(match?.[1]);

    if (candidate) {
      return candidate;
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

  return undefined;
}

function extractLabeledGstin(text: string, matchers: RegExp[]) {
  for (const line of lines(text)) {
    if (!matchers.some((matcher) => matcher.test(line))) {
      continue;
    }

    const gstin = extractGstins(line)[0];

    if (gstin) {
      return gstin;
    }
  }

  return undefined;
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

function mergeSectionLines(primary: string[], fallback: string[]) {
  return primary.length ? primary : fallback;
}

function extractMultilineValue(
  section: InvoiceDetectedSection | undefined,
  fallbackLines: string[],
  matchers: RegExp[],
  options?: {
    lookaheadLines?: number;
    allowJoin?: boolean;
    skipMatchers?: RegExp[];
    stopMatchers?: RegExp[];
  }
) {
  return (
    extractStructuredFieldValue(section?.lines ?? [], matchers, options) ??
    extractStructuredFieldValue(fallbackLines, matchers, options)
  );
}

function extractBuyerSectionLines(text: string) {
  const allLines = lines(text);

  for (let index = 0; index < allLines.length; index += 1) {
    const line = allLines[index]!;

    if (
      ![
        /^bill to$/i,
        /^bill to address:?$/i,
        /^buyer address:?$/i,
        /^billed to:?$/i,
        /^buyer \(bill to\)/i,
        /^consignee \(ship to\)/i,
        /^details of receiver\b/i,
        /^details of customer\b/i
      ].some((matcher) => matcher.test(line))
    ) {
      continue;
    }

    const block: string[] = [];
    const combinedReceiverAndConsignee = /details of receiver.*details of consignee/i.test(line);

    for (let cursor = index + 1; cursor < allLines.length && block.length < 14; cursor += 1) {
      const next = collapseRepeatedText(allLines[cursor]!);

      if (
        (!combinedReceiverAndConsignee && block.length > 0 && /^details of consignee\b/i.test(next ?? "")) ||
        /^sl\.?\b/i.test(next ?? "") ||
        /^s\.?no\.?\b/i.test(next ?? "") ||
        /^description/i.test(next ?? "") ||
        /^#?item\b/i.test(next ?? "") ||
        /^particulars\b/i.test(next ?? "") ||
        /^irn\b/i.test(next ?? "") ||
        /^ack\b/i.test(next ?? "") ||
        /^bank details\b/i.test(next ?? "")
      ) {
        break;
      }

      if (!combinedReceiverAndConsignee && /^details of consignee\b/i.test(next ?? "")) {
        continue;
      }

      if (next) {
        block.push(next);
      }
    }

    return block;
  }

  return [];
}

function extractLastMoneyToken(value?: string) {
  if (!value) {
    return undefined;
  }

  const matches = Array.from(value.matchAll(/\d[\d,]*\.\d{1,2}|\d[\d,]*/g));

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index]!;
    const token = match[0];
    const endIndex = (match.index ?? 0) + token.length;
    const nextCharacter = value[endIndex] ?? "";

    if (nextCharacter === "%") {
      continue;
    }

    const parsed = parseMoney(token);

    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
}

function extractAmountFromMatchingLine(text: string, matchers: RegExp[], lookaheadLines = 0) {
  const allLines = lines(text);

  for (let index = 0; index < allLines.length; index += 1) {
    const line = allLines[index]!;

    if (!matchers.some((matcher) => matcher.test(line))) {
      continue;
    }

    const amount = extractLastMoneyToken(line);

    if (amount !== undefined) {
      return amount;
    }

    if (lookaheadLines > 0) {
      const lookaheadWindow = allLines.slice(index + 1, Math.min(allLines.length, index + 1 + lookaheadLines));

      for (const candidate of lookaheadWindow) {
        if (/%\s*$/.test(candidate) || /[A-Za-z]/.test(candidate)) {
          continue;
        }

        const trailingAmount = extractLastMoneyToken(candidate);

        if (trailingAmount !== undefined) {
          return trailingAmount;
        }
      }
    }
  }

  return undefined;
}

function cleanAddressLines(sectionLines: string[]) {
  return sectionLines.filter((line) => {
    if (/^tax\s*invoice$/i.test(formatCompressedOcrText(line) ?? "")) {
      return false;
    }

    if (
      /^(gstin|pan|contact|mobile|date|delivery date|business type|state code|customer order ref|reference|reverse charge|ack|irn|payment terms?|due date|currency|type of bank account|merchant id)\b/i.test(
        line
      )
    ) {
      return false;
    }

    if (/^\d{10}$/.test(line)) {
      return false;
    }

  return true;
  });
}

function cleanPartyAddress(sectionLines: string[], partyName?: string) {
  const partyNameLower = formatOcrName(partyName)?.toLowerCase();

  return formatOcrAddress(
    cleanAddressLines(sectionLines)
      .filter((line) => formatOcrName(line)?.toLowerCase() !== partyNameLower)
      .join(", ")
  );
}

function normalizeBankAccountNumber(value?: string) {
  const normalized = normalizedValue(value);

  if (!normalized) {
    return undefined;
  }

  if (/rupees|amount|invoice|taxable|igst|sgst|cgst|round off|upi|micr|only/i.test(normalized)) {
    return undefined;
  }

  if (/\d[\d,]*\.\d{2}/.test(normalized)) {
    return undefined;
  }

  const digits = normalized.replace(/\D/g, "");

  if (digits.length < 8) {
    return undefined;
  }

  return digits;
}

function extractEmbeddedInvoiceTuple(text: string) {
  for (const line of lines(text)) {
    const compact = line.replace(/\s+/g, "");
    const match = compact.match(/^([A-Z0-9/-]{4,}?)(\d{2}[/-]\d{2}[/-]\d{4})$/i);

    if (match && match[1]?.includes("/")) {
      return {
        invoiceNumber: match[1],
        invoiceDate: parseInvoiceDate(match[2])
      };
    }
  }

  return {
    invoiceNumber: undefined,
    invoiceDate: undefined
  };
}

function extractLegacyPartyDetails(text: string) {
  const allLines = lines(text);
  const partyIndex = allLines.findIndex((line) => /^party$/i.test(line));
  const nameIndex = allLines.findIndex((line, index) => index > partyIndex && /^name:?$/i.test(line));
  const addressIndex = allLines.findIndex((line, index) => index > nameIndex && /^address$/i.test(line));

  if (partyIndex === -1 || nameIndex === -1 || addressIndex === -1) {
    return {
      name: undefined,
      address: undefined,
      gstin: undefined
    };
  }

  const nameLines: string[] = [];
  const addressLines: string[] = [];
  let buyerGstin: string | undefined;

  for (let cursor = nameIndex + 1; cursor < addressIndex; cursor += 1) {
    const line = allLines[cursor]!;

    if (!line || /^invoice ?no/i.test(formatCompressedOcrText(line) ?? "")) {
      break;
    }

    nameLines.push(line);
  }

  for (let cursor = addressIndex + 1; cursor < allLines.length; cursor += 1) {
    const line = allLines[cursor]!;
    const compact = line.replace(/\s+/g, "");

    if (/^particulars/i.test(line)) {
      break;
    }

    if (!buyerGstin && extractGstins(line).length > 0) {
      buyerGstin = extractGstins(line)[0];
      continue;
    }

    if (/^gstin:?$/i.test(line) || /^pan:?$/i.test(line)) {
      continue;
    }

    if (/^[A-Z]{5}\d{4}[A-Z]$/i.test(line.replace(/\s+/g, ""))) {
      continue;
    }

    if (compact.match(/^([A-Z0-9/-]{4,}?)(\d{2}[/-]\d{2}[/-]\d{4})$/i)) {
      continue;
    }

    addressLines.push(line);
  }

  return {
    name: formatOcrName(nameLines.join(" ")),
    address: formatOcrAddress(addressLines.join(" ")),
    gstin: buyerGstin
  };
}

function extractBuyerDetailsFromSection(sectionLines: string[]) {
  if (!sectionLines.length) {
    return {
      name: undefined,
      address: undefined,
      gstin: undefined,
      placeOfSupply: undefined
    };
  }

  const dedupedLines = sectionLines
    .map((line) => collapseRepeatedText(line))
    .filter((line): line is string => Boolean(line));
  const legalNameLine = dedupedLines.find((line) => /^legal name\s*:/i.test(line));
  const buyerName =
    formatOcrName(legalNameLine?.replace(/^legal name\s*:\s*/i, "")) ??
    formatOcrName(
      dedupedLines.find(
        (line) =>
          companyNamePattern.test(line) &&
          !/^details of consignee\b/i.test(line) &&
          !/^gstin|^gst no|^pan\b|^state code\b|@/i.test(line)
      )
    );
  const buyerGstin =
    extractGstins(dedupedLines.join("\n"))[0] ??
    extractLabeledGstin(dedupedLines.join("\n"), [/^gst no\b/i, /^gstin\/uid\b/i, /^gstin\b/i]);
  const placeOfSupply = formatOcrAddress(
    extractAnywhereValue(dedupedLines.join("\n"), [
      /place of supply(?: \(pos\))?\s*:\s*([^\n]+?)(?=pin code|customer order ref|$)/i
    ])
  );

  const addressParts: string[] = [];
  let afterBuyerName = false;
  let inAddress = false;

  for (const line of dedupedLines) {
    if (buyerName && formatOcrName(line) === buyerName) {
      afterBuyerName = true;
      continue;
    }

    if (/^legal name\s*:/i.test(line)) {
      continue;
    }

    if (/^address:?$/i.test(line)) {
      inAddress = true;
      continue;
    }

    if (/^city:?$/i.test(line)) {
      inAddress = true;
      continue;
    }

    if (/^gst no:?$/i.test(line) || /^gstin\/uid\b/i.test(line) || /^gstin\b/i.test(line) || /^state code\b/i.test(line)) {
      break;
    }

    if (/^details of consignee\b/i.test(line) || /^s\.?no\.?\b/i.test(line) || /^sl\.?\b/i.test(line) || /^description/i.test(line)) {
      break;
    }

    if (extractGstins(line).length > 0) {
      continue;
    }

    if (/(transaction type|merchant id|pin code)/i.test(line)) {
      continue;
    }

    if (inAddress || afterBuyerName) {
      if (!/^pan\b/i.test(line) && !/@/.test(line) && !/^address:?$/i.test(line) && !/^city:?$/i.test(line)) {
        addressParts.push(line);
      }
    }
  }

  return {
    name: buyerName,
    address: formatOcrAddress(addressParts.join(", ")),
    gstin: buyerGstin,
    placeOfSupply
  };
}

function extractSupplierNameFromFooter(text: string, buyerName?: string) {
  const footerCandidate =
    extractInlineValue(text, [
      /^beneficiary name\s*:\s*(.+)$/i,
      /^account name\s*:\s*(.+)$/i,
      /^for\s+(.+)$/i
    ]) ??
    extractAnywhereValue(text, [/for\s+([A-Za-z0-9.,&()' -]+(?:llp|limited|pvt ltd|private limited))/i]);

  const normalizedCandidate = formatOcrName(footerCandidate);

  if (
    normalizedCandidate &&
    normalizedCandidate !== buyerName &&
    !/^authorized signatory$/i.test(normalizedCandidate) &&
    !/^designated partner$/i.test(normalizedCandidate)
  ) {
    return normalizedCandidate;
  }

  return undefined;
}

function extractSupplierNameFromBankDetails(bankDetails?: InvoiceBankDetails, buyerName?: string) {
  const rawText = bankDetails?.rawText;

  if (!rawText) {
    return undefined;
  }

  const candidate = extractAnywhereValue(rawText, [
    /for\s+([A-Za-z0-9.,&()' -]+(?:llp|limited|private limited|pvt ltd))/i,
    /account name\s*:\s*([A-Za-z0-9.,&()' -]+(?:llp|limited|private limited|pvt ltd))/i,
    /beneficiary name\s*:\s*([A-Za-z0-9.,&()' -]+(?:llp|limited|private limited|pvt ltd))/i
  ]);
  const normalizedCandidate = formatOcrName(candidate);

  if (normalizedCandidate && normalizedCandidate !== buyerName) {
    return normalizedCandidate;
  }

  return undefined;
}

function extractHeaderSupplierAddress(text: string, supplierName?: string) {
  const allLines = lines(text);
  const titleIndex = allLines.findIndex((line) => /^tax invoice$/i.test(line));

  if (titleIndex <= 0 || !supplierName) {
    return undefined;
  }

  const headerLines = allLines.slice(0, titleIndex).map((line) => collapseRepeatedText(line)).filter(Boolean) as string[];

  if (!headerLines.length || formatOcrName(headerLines[0]) !== supplierName) {
    return undefined;
  }

  return formatOcrAddress(
    headerLines
      .slice(1)
      .filter((line) => !extractGstins(line).length)
      .join(", ")
  );
}

function extractAddressNearGstin(text: string, gstin?: string, partyName?: string) {
  if (!gstin) {
    return undefined;
  }

  const allLines = lines(text);
  const gstinIndex = allLines.findIndex((line) => line.includes(gstin));

  if (gstinIndex === -1) {
    return undefined;
  }

  const addressLines: string[] = [];
  const partyNameLower = formatOcrName(partyName)?.toLowerCase();

  for (let cursor = gstinIndex - 1; cursor >= 0 && addressLines.length < 4; cursor -= 1) {
    const candidate = collapseRepeatedText(allLines[cursor]!);
    const formattedCandidate = formatCompressedOcrText(candidate);

    if (!formattedCandidate) {
      continue;
    }

    if (
      /^(tax invoice|\(\s*original|irn\b|ack\b|reverse charge\b|customer order ref\b|place of supply\b|payment terms?\b|terms\b|due date\b|invoice date\b|document no\b|invoice number\b|this is a system generated invoice\b|pay via qr code\b|remittance detail\b|beneficiary name\b|bank name\b|branch\b|ifsc\b|micr\b|upi id\b)/i.test(
        formattedCandidate
      )
    ) {
      break;
    }

    if (
      /^(pan\b|gstin\b|formerl?y known as\b|authori[sz]ed signatory\b|company cin\b|tel\.?\b|fax\b|e\.?mail\b|email\b|web\b)/i.test(
        formattedCandidate
      ) ||
      formatOcrName(formattedCandidate)?.toLowerCase() === partyNameLower
    ) {
      continue;
    }

    addressLines.unshift(formattedCandidate.replace(/,\s*$/, ""));
  }

  return formatOcrAddress(addressLines.join(", "));
}

function inferSupplierSectionLines(text: string, preferredGstin?: string) {
  const allLines = lines(text);
  const titleIndex = allLines.findIndex((line) => /^tax invoice$/i.test(line));
  const preferredGstinIndex = preferredGstin ? allLines.findIndex((line) => line.includes(preferredGstin)) : -1;
  const supplierGstinIndex =
    preferredGstinIndex !== -1
      ? preferredGstinIndex
      : allLines.findIndex((line, index) => (titleIndex === -1 || index < titleIndex) && extractGstins(line).length > 0);

  if (supplierGstinIndex === -1) {
    return [];
  }

  let start = supplierGstinIndex;

  while (start > 0) {
    const previous = allLines[start - 1]!;

    if (
      /^(make all payments to:|account number:|ifsc code:|branch\b|authorized signature\b|total in words\b|sub total\b|igst\b|rounding\b|total\b|balance due\b|tax invoice\b|document no\b)/i.test(
        previous
      ) ||
      /bank$/i.test(previous)
    ) {
      break;
    }

    start -= 1;
  }

  return allLines.slice(start, supplierGstinIndex + 1);
}

function parseInvoiceDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const raw = value.trim();
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

  const textMonthMatch = raw.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})[-,\s]+(\d{2,4})$/);

  if (textMonthMatch) {
    const [, day, monthText, year] = textMonthMatch;
    const monthIndex = new Date(`${monthText} 1, 2000`).getMonth();

    if (!Number.isNaN(monthIndex)) {
      const normalizedYear = year!.length === 2 ? `20${year}` : year!;
      return `${normalizedYear}-${String(monthIndex + 1).padStart(2, "0")}-${day!.padStart(2, "0")}`;
    }
  }

  const monthFirstMatch = raw.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),\s*(\d{4})$/);

  if (monthFirstMatch) {
    const [, monthText, day, year] = monthFirstMatch;
    const monthIndex = new Date(`${monthText} 1, 2000`).getMonth();

    if (!Number.isNaN(monthIndex)) {
      return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day!.padStart(2, "0")}`;
    }
  }

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
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
  const strictMatches = text.match(gstinPattern) ?? [];
  const looseMatches = text.match(/\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]/gi) ?? [];
  return Array.from(new Set([...strictMatches, ...looseMatches]));
}

function firstGstinInLines(sectionLines: string[]) {
  const blockText = sectionLines.join("\n");
  const values = extractGstins(blockText);
  return values[0];
}

function lastGstinInText(text: string) {
  const values = extractGstins(text);
  return values[values.length - 1];
}

function extractBankDetails(text: string, section?: InvoiceDetectedSection): InvoiceBankDetails | undefined {
  const paymentSectionLines = mergeSectionLines(
    section?.lines ?? [],
    extractSectionLines(
      text,
      [
        /^make all payments to:/i,
        /^bank details$/i,
        /^payment details$/i,
        /^amount to be credited/i,
        /^amounttobecredited/i,
        /^company'?s bank details/i,
        /^remittance detail$/i
      ],
      [/^tax invoice$/i, /^document no/i, /^invoice date/i, /^[A-Z].*private limited$/i],
      10
    )
  );
  const bankName =
    extractMultilineValue(
      section,
      paymentSectionLines,
      [/^bank ?name\s*[:\s-]*(.*)$/i, /^bankname\s*[:\s-]*(.*)$/i, /^banker\s*:\s*(.*)$/i],
      {
        lookaheadLines: 2,
        stopMatchers: [/^a\/c no/i, /^account/i, /^beneficiary account/i, /^ifsc/i, /^branch/i],
        skipMatchers: [/^:?$/]
      }
    ) ??
    extractInlineValue(text, [/^bank ?name\s*[:\s-]*(.+)$/i, /^bankname\s*[:\s-]*(.+)$/i, /^banker\s*:\s*(.+)$/i]) ??
    paymentSectionLines.find((line) => /bank/i.test(line) && !/^make all payments to:/i.test(line));
  const nextLineBankName = paymentSectionLines.find((line, index) => /^bank ?name:?$/i.test(line)) ?
    paymentSectionLines[paymentSectionLines.findIndex((line) => /^bank ?name:?$/i.test(line)) + 1]
    : text.match(/bank ?name\s*:?\s*\n([^\n]+)/i)?.[1];
  const accountNumber = extractMultilineValue(
    section,
    paymentSectionLines,
    [
      /^accountno\s*[:\s-]*(.*)$/i,
      /^account(?:\s+(?:no|number))\s*[:\s-]*(.*)$/i,
      /^bank account no\.?\s*[:\s-]*(.*)$/i,
      /^beneficiary account number\s*:\s*(.*)$/i,
      /^a\/c no\s*[:\s-]*(.*)$/i
    ],
    {
      lookaheadLines: 2,
      stopMatchers: [/^branch/i, /^ifsc/i],
      skipMatchers: [/^:?$/]
    }
  ) ??
    extractInlineValue(text, [
      /^accountno\s*[:\s-]*(.+)$/i,
      /^account(?:\s+(?:no|number))\s*[:\s-]*(.+)$/i,
      /^bank account no\.?\s*[:\s-]*(.+)$/i,
      /^beneficiary account number\s*:\s*(.+)$/i,
      /^a\/c no\s*[:\s-]*(.+)$/i
    ]) ??
    text.match(/(?:a\/c no\.?|beneficiary account number)\s*:?\s*\n([^\n]+)/i)?.[1] ??
    extractLabeledValue(text, ["account number", "account no", "accountno", "bank account no.", "beneficiary account number", "a/c no"]);
  const ifsc = extractMultilineValue(
    section,
    paymentSectionLines,
    [/^ifsc ?code\s*[:\s-]*(.*)$/i, /^ifsccode\s*[:\s-]*(.*)$/i, /^ifsc\s*[:\s-]*(.*)$/i],
    {
      lookaheadLines: 2,
      stopMatchers: [/^branch/i],
      skipMatchers: [/^:?$/]
    }
  ) ??
    extractInlineValue(text, [/^ifsc ?code\s*[:\s-]*(.+)$/i, /^ifsccode\s*[:\s-]*(.+)$/i, /^ifsc\s*[:\s-]*(.+)$/i]) ??
    extractLabeledValue(text, ["ifsc code", "ifsccode", "ifsc"]) ??
    paymentSectionLines.join(" ").match(/[A-Z]{4}0[A-Z0-9]{6}/i)?.[0] ??
    text.match(/[A-Z]{4}0[A-Z0-9]{6}/i)?.[0];
  const branch =
    extractMultilineValue(section, paymentSectionLines, [/^branch(?:\s*&\s*ifs code)?\s*[:\s-]*(.*)$/i], {
      lookaheadLines: 2,
      allowJoin: true,
      stopMatchers: [/^ifsc/i],
      skipMatchers: [/^:?$/]
    }) ??
    extractInlineValue(text, [/^branch\s*[:\s-]*(.+)$/i]) ??
    extractLabeledValue(text, ["branch"]);
  const nextLineBranch = paymentSectionLines.find((line) => /^branch(?:\s*&\s*ifs code)?\s*:?\s*$/i.test(line))
    ? paymentSectionLines[paymentSectionLines.findIndex((line) => /^branch(?:\s*&\s*ifs code)?\s*:?\s*$/i.test(line)) + 1]
    : text.match(/branch(?:\s*&\s*ifs code)?\s*:?\s*\n([^\n]+)/i)?.[1];
  const rawText =
    normalizedValue(paymentSectionLines.join(", ")) ??
    extractBlock(text, [/^bank details$/i, /^payment details$/i], [/^invoice total/i, /^grand total/i, /^payment terms/i], 5);

  if (!bankName && !accountNumber && !ifsc && !branch && !rawText) {
    return undefined;
  }

  return {
    bankName: formatOcrName(
      meaningfulValue(bankName)
        ?.replace(/^bank ?name\s*:\s*/i, "")
        ?.replace(/^banker\s*:\s*/i, "")
        .replace(/\s+account[-:\s].*$/i, "")
    ) ?? formatOcrName(normalizedValue(nextLineBankName)?.replace(/\s+account[-:\s].*$/i, "")),
    accountNumber: normalizeBankAccountNumber(accountNumber),
    ifsc: normalizedValue(ifsc)?.match(/[A-Z]{4}0[A-Z0-9]{6}/i)?.[0] ?? normalizedValue(ifsc),
    branch:
      formatOcrAddress(
        normalizedValue(branch)
          ?.replace(/^&\s*ifs?\s*code:?$/i, "")
          .replace(/&\s*[A-Z]{4}0[A-Z0-9]{6}$/i, "")
          .trim()
      ) ?? formatOcrAddress(normalizedValue(nextLineBranch)?.replace(/&\s*[A-Z]{4}0[A-Z0-9]{6}$/i, "").trim()),
    rawText: formatCompressedOcrText(rawText)
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

function parseMergedServiceMetricBlob(blob: string) {
  const compact = blob.replace(/\s+/g, "");
  const sacMatch = compact.match(/^(\d{6})(.+)$/);
  const sac = sacMatch?.[1];
  const remainder = sacMatch?.[2] ?? compact;
  const lineAmount = extractLastMoneyToken(compact);
  const beforeTax = remainder.split(/18%|12%|5%|28%/)[0] ?? remainder;
  let quantity: number | undefined;
  let unitPrice: number | undefined;

  const qtyRatePattern = beforeTax.match(/^(\d+\.\d{2,3})(\d{1,3},\d{3}(?:,\d{3})*\.\d+)$/);
  const quantityRatePattern = beforeTax.match(/^(\d{1,3},\d{3}(?:,\d{3})*\.\d+)(\d+\.\d{1,3})$/);

  if (qtyRatePattern) {
    quantity = parseMoney(qtyRatePattern[1]);
    unitPrice = parseMoney(qtyRatePattern[2]);
  } else if (quantityRatePattern) {
    const firstValue = parseMoney(quantityRatePattern[1]);
    const secondValue = parseMoney(quantityRatePattern[2]);

    if (firstValue !== undefined && secondValue !== undefined) {
      if (secondValue <= 1000) {
        quantity = firstValue;
        unitPrice = secondValue;
      } else {
        unitPrice = firstValue;
        quantity = secondValue;
      }
    }
  }

  return {
    sac,
    quantity,
    unitPrice,
    lineAmount
  };
}

function parseMergedServiceLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const allLines = lines(text);
  const tableHeaderIndex = allLines.findIndex((line) => /item.*description.*(?:sac|hsn).*qty.*rate/i.test(line));

  if (tableHeaderIndex === -1) {
    return [];
  }

  const tableTailIndex = allLines.findIndex(
    (line, index) => index > tableHeaderIndex && (/^IRN\b/i.test(line) || /^Ack\b/i.test(line) || /^e-Invoicing\b/i.test(line))
  );
  const tableLines = allLines.slice(tableHeaderIndex + 1, tableTailIndex === -1 ? allLines.length : tableTailIndex);
  const items: InvoiceLineItem[] = [];

  for (let index = 0; index < tableLines.length; index += 1) {
    const line = tableLines[index]!;
    const rowStart = line.match(/^(\d+)(?!st\b|nd\b|rd\b|th\b)([A-Za-z#].*)$/i);

    if (!rowStart) {
      continue;
    }

    const rowNumber = Number(rowStart[1]);
    const rowLines = [rowStart[2].trim()];

    for (let cursor = index + 1; cursor < tableLines.length; cursor += 1) {
      const next = tableLines[cursor]!;

      if (/^\d+(?!st\b|nd\b|rd\b|th\b)[A-Za-z#]/i.test(next)) {
        index = cursor - 1;
        break;
      }

      rowLines.push(next);
      index = cursor;
    }

    const metricIndex = rowLines.findIndex((candidate) => /^\d{6}/.test(candidate) || /\d+%/.test(candidate));
    const descriptionParts = (metricIndex === -1 ? rowLines : rowLines.slice(0, metricIndex)).filter(Boolean);
    const metricLines = metricIndex === -1 ? [] : rowLines.slice(metricIndex);
    const metricBlob = metricLines.join("");
    const metrics = parseMergedServiceMetricBlob(metricBlob);
    const description = normalizedValue(descriptionParts.join(" "));

    if (!description && !metrics.lineAmount) {
      continue;
    }

    items.push({
      lineNumber: Number.isFinite(rowNumber) ? rowNumber : items.length + 1,
      description,
      quantity: metrics.quantity,
      unitPrice: metrics.unitPrice,
      taxableValue: metrics.lineAmount,
      lineAmount: metrics.lineAmount,
      hsnSac: metrics.sac,
      confidence: Number(Math.max(0.52, Math.min(0.9, ocrConfidence - 0.04)).toFixed(2)),
      rawTextSnippet: rowLines.join(" | ")
    });
  }

  return items;
}

function parseCompressedParticularLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const allLines = lines(text);
  const headerIndex = allLines.findIndex((line) => /^particulars/i.test(line));

  if (headerIndex === -1) {
    return [];
  }

  const items: InvoiceLineItem[] = [];

  for (let index = headerIndex + 1; index < allLines.length; index += 1) {
    const line = allLines[index]!;

    if (/^:?(?:cgst|sgst|igst)\b/i.test(line) || /^total/i.test(line) || /^totalamount/i.test(line)) {
      break;
    }

    const amountMatch = line.match(/(\d{1,2},\d{2},\d{3}\.\d{2})$/);

    if (!amountMatch) {
      continue;
    }

    const amount = parseMoney(amountMatch[1]);
    const beforeAmount = line.slice(0, amountMatch.index).trim();
    const quantityMatch = beforeAmount.match(/(\d+)$/);
    const descriptionRaw = quantityMatch ? beforeAmount.slice(0, quantityMatch.index).trim() : beforeAmount;
    const quantity = quantityMatch ? parseMoney(quantityMatch[1]) : undefined;
    const description = formatCompressedOcrText(descriptionRaw);

    if (!description || amount === undefined) {
      continue;
    }

    items.push({
      lineNumber: items.length + 1,
      description,
      quantity,
      taxableValue: amount,
      lineAmount: amount,
      confidence: Number(Math.max(0.58, Math.min(0.88, ocrConfidence - 0.02)).toFixed(2)),
      rawTextSnippet: line
    });
  }

  return items;
}

function parsePineLabsStyleLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const rowMatch = text.match(/^(\d+)(.+?)(\d{6})(\d+)([A-Z]{2,5})([\d,]+\.\d{2})([\d,]+\.\d{2})(\d+\.\d{2})([\d,]+\.\d{2})$/m);

  if (!rowMatch) {
    return [];
  }

  const [, rowNumber, description, hsnSac, quantity, unit, unitPrice, taxableValue, , taxAmount] = rowMatch;

  return [
    {
      lineNumber: Number(rowNumber),
      description: formatCompressedOcrText(description),
      quantity: parseMoney(quantity),
      unit: normalizedValue(unit),
      unitPrice: parseMoney(unitPrice),
      taxableValue: parseMoney(taxableValue),
      lineAmount: parseMoney(taxableValue),
      hsnSac,
      confidence: Number(Math.max(0.62, Math.min(0.9, ocrConfidence - 0.03)).toFixed(2)),
      rawTextSnippet: rowMatch[0]
    }
  ];
}

function parseTruecallerStyleLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const allLines = lines(text);
  const headerIndex = allLines.findIndex((line) => /^descriptionperiodhsn\/sacqtyunitpricetaxrate/i.test(line.replace(/\s+/g, "").toLowerCase()));

  if (headerIndex === -1) {
    return [];
  }

  const amountIndex = allLines.findIndex((line, index) => index > headerIndex && /^amount in words:/i.test(line));

  if (amountIndex === -1 || amountIndex <= headerIndex + 2) {
    return [];
  }

  const itemLines = allLines.slice(headerIndex + 2, amountIndex);
  const descriptionLine = itemLines[0];
  const hsnSac = itemLines.find((line) => /^\d{6}$/.test(line));
  const pricingLine = itemLines.find((line) => /\d[\d,]*\s*18%\s*\d[\d,]*\.\d{2}/i.test(line.replace(/\s+/g, "")));
  const pricingMatch = pricingLine?.replace(/\s+/g, "").match(/^([\d,]+)(?:18%)((?:\d[\d,]*\.\d{2}))$/i);

  if (!descriptionLine || !pricingLine || !pricingMatch) {
    return [];
  }

  const unitPrice = parseMoney(pricingMatch[1]);
  const taxableValue = parseMoney(pricingMatch[2]);

  return [
    {
      lineNumber: 1,
      description: formatCompressedOcrText(descriptionLine.replace(/\d{4}-\d{2}-\d{2}.*/g, "").trim()),
      unitPrice,
      taxableValue,
      lineAmount: taxableValue,
      hsnSac,
      confidence: Number(Math.max(0.58, Math.min(0.88, ocrConfidence - 0.04)).toFixed(2)),
      rawTextSnippet: itemLines.join(" | ")
    }
  ];
}

function parsePayuStyleLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const allLines = lines(text);
  const headerIndex = allLines.findIndex((line) => /^s\.?no\.?descriptionofservice:hsn/i.test(line.replace(/\s+/g, "").toLowerCase()));

  if (headerIndex === -1) {
    return [];
  }

  const totalIndex = allLines.findIndex((line, index) => index > headerIndex && /^total0grossamount/i.test(line.replace(/\s+/g, "").toLowerCase()));

  if (totalIndex === -1) {
    return [];
  }

  const firstRowIndex = allLines.findIndex((line, index) => index > headerIndex && /^\d+$/.test(line));

  if (firstRowIndex === -1 || firstRowIndex >= totalIndex) {
    return [];
  }

  const itemLines = allLines.slice(firstRowIndex + 1, totalIndex);
  const descriptionLines = itemLines.filter(
    (line) =>
      !/^\d+$/.test(line) &&
      !/^\d{6}$/.test(line) &&
      !/^\d[\d,]*\.\d{2}$/.test(line) &&
      !/^(fixed|fee of|month)$/i.test(line) &&
      !/^rs\./i.test(line)
  );
  const hsnSac = itemLines.find((line) => /^\d{6}$/.test(line));
  const amountLine = itemLines.find((line) => /^\d[\d,]*\.\d{2}$/.test(line));

  if (!amountLine) {
    return [];
  }

  const amount = parseMoney(amountLine);

  return [
    {
      lineNumber: 1,
      description: formatCompressedOcrText(descriptionLines.join(" ")),
      taxableValue: amount,
      lineAmount: amount,
      hsnSac,
      confidence: Number(Math.max(0.58, Math.min(0.88, ocrConfidence - 0.04)).toFixed(2)),
      rawTextSnippet: itemLines.join(" | ")
    }
  ];
}

function parseBvaluePartnerLineItems(text: string, ocrConfidence: number): InvoiceLineItem[] {
  const allLines = lines(text);
  const headerIndex = allLines.findIndex((line) => /^sl$/i.test(line));
  const isRowMarker = (value: string) => /^\d{1,3}$/.test(value);

  if (headerIndex === -1 || !/description of.*hsn\/sac/i.test(allLines.slice(headerIndex, headerIndex + 4).join(" "))) {
    return [];
  }

  const stopIndex = allLines.findIndex(
    (line, index) =>
      index > headerIndex &&
      (/^continued to page number/i.test(line) || /^round off$/i.test(line) || /^amount chargeable/i.test(line) || /^igst$/i.test(line))
  );
  const tableLines = allLines.slice(headerIndex + 1, stopIndex === -1 ? allLines.length : stopIndex);
  const items: InvoiceLineItem[] = [];

  for (let index = 0; index < tableLines.length; index += 1) {
    const rowMarker = tableLines[index]!;

    if (!isRowMarker(rowMarker)) {
      continue;
    }

    const rowLines: string[] = [];

    for (let cursor = index + 1; cursor < tableLines.length; cursor += 1) {
      const next = tableLines[cursor]!;

      if (isRowMarker(next)) {
        index = cursor - 1;
        break;
      }

      rowLines.push(next);
      index = cursor;
    }

    const descriptionAmountLine = rowLines.find((line) => /^cost per/i.test(line));
    const hsnSac = rowLines.find((line) => /^\d{6}$/.test(line));
    const periodLine = rowLines.find((line) => /\|/.test(line));
    const quantityUnitLine = rowLines.find((line) => /^\d+(?:\.\d+)?\s*[A-Za-z]{2,6}$/i.test(line));
    const rateLine = rowLines.find((line) => /@\s*\d+(?:\.\d+)?%?$/i.test(line));
    const unitPriceLine = rowLines.find((line) => /^[A-Za-z]{2,6}\d[\d,]*\.\d{2}$/i.test(line));
    const lineAmount = descriptionAmountLine ? extractLastMoneyToken(descriptionAmountLine) : undefined;
    const description = normalizedValue(
      [
        descriptionAmountLine?.replace(/\d[\d,]*\.\d{2}\s*$/g, "").trim(),
        periodLine
      ]
        .filter(Boolean)
        .join(" - ")
    );
    const quantity = quantityUnitLine
      ? parseMoney(quantityUnitLine.match(/^(\d+(?:\.\d+)?)/)?.[1])
      : rateLine
        ? parseMoney(rateLine.match(/^(\d[\d,]*)\s*@/)?.[1])
        : undefined;
    const unit = quantityUnitLine?.match(/[A-Za-z]{2,6}$/)?.[0];
    const unitPrice =
      unitPriceLine
        ? parseMoney(unitPriceLine.match(/(\d[\d,]*\.\d{2})$/)?.[1])
        : undefined;

    if (!description && !lineAmount) {
      continue;
    }

    items.push({
      lineNumber: Number(rowMarker),
      description,
      quantity,
      unit,
      unitPrice,
      taxableValue: lineAmount,
      lineAmount,
      hsnSac,
      confidence: Number(Math.max(0.56, Math.min(0.9, ocrConfidence - 0.03)).toFixed(2)),
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
  const partnerItems = parseBvaluePartnerLineItems(text, ocrConfidence);

  if (partnerItems.length) {
    return partnerItems;
  }

  const structured = parseStructuredLineItems(text, ocrConfidence);

  if (structured.length) {
    return structured;
  }

  const mergedService = parseMergedServiceLineItems(text, ocrConfidence);

  if (mergedService.length) {
    return mergedService;
  }

  const compressedParticulars = parseCompressedParticularLineItems(text, ocrConfidence);

  if (compressedParticulars.length) {
    return compressedParticulars;
  }

  const pineLabsItems = parsePineLabsStyleLineItems(text, ocrConfidence);

  if (pineLabsItems.length) {
    return pineLabsItems;
  }

  const truecallerItems = parseTruecallerStyleLineItems(text, ocrConfidence);

  if (truecallerItems.length) {
    return truecallerItems;
  }

  const payuItems = parsePayuStyleLineItems(text, ocrConfidence);

  if (payuItems.length) {
    return payuItems;
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

      if (
        !companyNamePattern.test(candidate) ||
        !nearby.includes(supplierGstin) ||
        /^(pan|gstin|state code|registered address|sales office|details of receiver|details of customer)\b/i.test(candidate)
      ) {
        continue;
      }

      const cleaned = candidate.replace(/^for\s+/i, "").trim();

      if (cleaned && cleaned !== buyerName) {
        return formatOcrName(cleaned);
      }
    }
  }

  return allLines
    .map((line) => line.replace(/^for\s+/i, "").trim())
    .find(
      (line) =>
        companyNamePattern.test(line) &&
        line !== buyerName &&
        !/^(authorized signatory|designated partner|pan:|gstin:|registered address|sales office|details of receiver|details of customer)\b/i.test(
          line
        )
    );
}

function extractBuyerName(text: string) {
  const explicit =
    extractInlineValue(text, [
      /^buyer name\s*:\s*(.+)$/i,
      /^buyer\s*:\s*(.+)$/i,
      /^buyer \(bill to\)\s*:?(.+)?$/i,
      /^bill to\s*:\s*(?!address\b)(.+)$/i,
      /^consignee\s*:\s*(.+)$/i,
      /^consignee \(ship to\)\s*:?(.+)?$/i
    ]) ??
    lines(text).find((line) => /^buyer\s*:/i.test(line))?.replace(/^buyer\s*:\s*/i, "").trim();

  if (explicit) {
    return explicit;
  }

  const allLines = lines(text);
  const billToIndex = allLines.findIndex((line) => /^bill to$/i.test(line));

  if (billToIndex !== -1) {
    return formatOcrName(meaningfulValue(allLines[billToIndex + 1]));
  }

  const buyerHeaderIndex = allLines.findIndex((line) => /^buyer \(bill to\)$/i.test(line) || /^consignee \(ship to\)$/i.test(line));

  if (buyerHeaderIndex !== -1) {
    return formatOcrName(meaningfulValue(allLines[buyerHeaderIndex + 1]));
  }

  const detailedCustomerName = extractAnywhereValue(text, [/legal name\s*:\s*([^\n]+?)(?=address:|city:|gst no:|$)/i]);

  if (detailedCustomerName) {
    return formatOcrName(detailedCustomerName);
  }

  return undefined;
}

function hasZeroTaxSignal(text: string) {
  return /@\s*0(?:\.0+)?%|0(?:\.0+)?%/i.test(text);
}

function buildExtractionDiagnostics(input: {
  rawText: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  buyerName?: string;
  totalAmount?: number;
  taxableValue?: number;
  amountInWords?: string;
  bankDetails?: InvoiceBankDetails;
}) {
  const evidenceSignals: string[] = [];
  const parserMissSignals: string[] = [];

  const evidenceChecks: Array<[string, RegExp, boolean]> = [
    ["invoice_number", /\binvoice no\.?\b|\binvoice number\b|\bdocument no\b/i, Boolean(input.invoiceNumber)],
    ["invoice_date", /^dated$|\binvoice date\b|\bdate of invoice\b/im, Boolean(input.invoiceDate)],
    ["buyer_name", /\bbuyer \(bill to\)\b|\bconsignee \(ship to\)\b|\bbill to\b/i, Boolean(input.buyerName)],
    ["total_amount", /\btotal invoice amount\b|\btotal invoice value\b|\bamount payable\b|^total$/im, input.totalAmount !== undefined],
    ["taxable_value", /\btaxable amount\b|\btaxable value\b/i, input.taxableValue !== undefined],
    ["amount_in_words", /\bamount chargeable \(in words\)\b|\bamount in words\b/i, Boolean(input.amountInWords)],
    [
      "bank_details",
      /\bcompany'?s bank details\b|\bbank details\b|\bremittance detail\b|\bbank name\b|\ba\/c no\b/i,
      Boolean(input.bankDetails?.bankName || input.bankDetails?.accountNumber || input.bankDetails?.ifsc)
    ]
  ];

  for (const [key, matcher, extracted] of evidenceChecks) {
    if (!matcher.test(input.rawText)) {
      continue;
    }

    evidenceSignals.push(key);

    if (!extracted) {
      parserMissSignals.push(key);
    }
  }

  return {
    parserLowConfidence: parserMissSignals.length >= 2,
    parserMissSignals,
    evidenceSignals
  };
}

export function normalizeInvoiceDocument(ocr: OcrDocumentResult): NormalizedInvoiceDocument {
  const text = ocr.rawText;
  const ocrConfidence = ocr.averageConfidence;
  const allLines = lines(text);
  const structure = analyzeInvoiceStructure(ocr);
  const prefersStructuredFields =
    structure.family === "BVALUE_PARTNER" || structure.family === "SETTLEMENT_STATEMENT";
  const metadataSection = structure.sectionMap["invoice_metadata"];
  const buyerSection = structure.sectionMap["buyer"];
  const taxSummarySection = structure.sectionMap["tax_summary"];
  const bankSection = structure.sectionMap["bank_details"];
  const lineItemsSection = structure.sectionMap["line_items"];
  const bankDetails = extractBankDetails(text, bankSection);
  const legacyPartyDetails = extractLegacyPartyDetails(text);
  const embeddedInvoiceTuple = extractEmbeddedInvoiceTuple(text);
  const buyerSectionLines = prefersStructuredFields
    ? mergeSectionLines(sectionLines(structure, "buyer"), extractBuyerSectionLines(text))
    : extractBuyerSectionLines(text);
  const sectionBuyerDetails = extractBuyerDetailsFromSection(buyerSectionLines);
  const footerSupplierName = extractSupplierNameFromFooter(text);
  const bankSupplierName = extractSupplierNameFromBankDetails(bankDetails);
  const explicitSupplierSectionLines = extractSectionLines(
    text,
    [/^from address:?$/i, /^supplier address:?$/i, /^seller address:?$/i],
    [/^place of supply\b/i, /^ship to address:?$/i, /^rcm applicable\b/i, /^sr$/i, /^item$/i],
    8
  );
  const buyerGstin =
    sectionBuyerDetails.gstin ??
    firstGstinInLines(buyerSectionLines) ??
    legacyPartyDetails.gstin ??
    extractLabeledGstin(text, [/^buyer gstin\b/i, /^gst no\b/i, /^gstin\/uid\b/i]);
  const preliminarySupplierGstin =
    extractLabeledGstin(text, [/^supplier gstin\b/i, /^gstin\/uin\b/i]) ??
    (() => {
      const fallbackLast = lastGstinInText(text);
      return fallbackLast && fallbackLast !== buyerGstin ? fallbackLast : undefined;
    })();
  const supplierSectionLines = explicitSupplierSectionLines.length
    ? explicitSupplierSectionLines
    : inferSupplierSectionLines(text, preliminarySupplierGstin);
  const supplierGstin =
    preliminarySupplierGstin ??
    (() => {
      const inferred = firstGstinInLines(supplierSectionLines);

      if (inferred && inferred !== buyerGstin) {
        return inferred;
      }

      const fallbackLast = lastGstinInText(text);
      return fallbackLast && fallbackLast !== buyerGstin ? fallbackLast : inferred;
    })();
  const invoiceNumberAfterTitleIndex = allLines.findIndex(
    (line, index) => /^tax invoice$/i.test(line) && Boolean(allLines[index + 1] && /^[A-Z0-9/-]{6,}$/.test(allLines[index + 1]!))
  );
  const invoiceNumber =
    (prefersStructuredFields
      ? extractMultilineValue(
          metadataSection,
          allLines,
          [
            /^invoice number\s*[:#.-]*\s*([A-Z0-9/-]+)?$/i,
            /^invoice no\.?\s*[:#.-]*\s*([A-Z0-9/-]+)?$/i,
            /^document no\.?\s*[:#.-]*\s*([A-Z0-9/-]+)?$/i
          ],
          {
            lookaheadLines: 2,
            stopMatchers: [/^dated$/i, /^date of invoice/i, /^invoice date/i, /^delivery note/i]
          }
        )
      : undefined) ||
    extractAnywhereValue(text, [
      /invoice number\s*:\s*([A-Z0-9/-]+)(?=\s*(?:ack|invoice date|reverse charge|customer order ref|$))/i,
      /document no\s*:\s*([A-Z0-9/-]+)(?=\s*(?:invoice date|document ref|document date|due date|$))/i,
      /invoice no\.?\s*:\s*([A-Z0-9/-]+)(?=\s*(?:invoice date|date of invoice|$))/i
    ]) ||
    extractInlineValue(text, [/^(?:invoice number|invoice no|invoice #|document no\.?|document #)\s*[:#.-]*\s*(.+)$/i]) ||
    extractLabeledValue(text, ["document no.", "document no", "document #", "invoice number", "invoice no", "invoice #"]) ||
    embeddedInvoiceTuple.invoiceNumber ||
    (invoiceNumberAfterTitleIndex === -1 ? undefined : allLines[invoiceNumberAfterTitleIndex + 1]) ||
    text.match(invoiceNumberPattern)?.[1];
  const invoiceDateValue =
    (prefersStructuredFields
      ? extractMultilineValue(
          metadataSection,
          allLines,
          [/^invoice date\s*[:#.-]*\s*(.*)$/i, /^date of invoice\s*[:#.-]*\s*(.*)$/i, /^dated\s*[:#.-]*\s*(.*)$/i, /^date\s*[:#.-]*\s*(.*)$/i],
          {
            lookaheadLines: 2,
            stopMatchers: [/^mode\/terms of payment/i, /^other references/i, /^delivery note/i]
          }
        )
      : undefined) ||
    extractAnywhereValue(text, [
      /invoice date\s*:\s*([^\n]+?)(?=\s*(?:reverse charge|customer order ref|place of supply|$))/i,
      /date of invoice\s*:\s*([^\n]+?)(?=\s*(?:due date|currency|payment terms|$))/i,
      /date of issue\s*([^\n]+?)(?=\s*(?:date due|bill to|$))/i
    ]) ||
    extractLabeledValue(text, ["invoice date", "date of invoice", "date of issue", "date"]) ||
    allLines.find((line) => /invoice date|^date\b/i.test(line) && datePattern.test(line)) ||
    "";
  const invoiceDate = parseInvoiceDate(invoiceDateValue.match(datePattern)?.[1] ?? invoiceDateValue) ?? embeddedInvoiceTuple.invoiceDate;
  const buyerName = formatOcrName(extractBuyerName(text) ?? sectionBuyerDetails.name ?? legacyPartyDetails.name);
  const extractedSupplierName = extractSupplierName(text, supplierGstin, buyerName);
  const normalizedExtractedSupplierName = formatOcrName(extractedSupplierName);
  const normalizedFooterSupplierName = formatOcrName(
    bankSupplierName ?? footerSupplierName ?? extractSupplierNameFromFooter(text, buyerName)
  );
  const supplierName =
    normalizedFooterSupplierName &&
    (!normalizedExtractedSupplierName ||
      normalizedExtractedSupplierName === buyerName ||
      (buyerName ? normalizedExtractedSupplierName.includes(buyerName) : false) ||
      /^(pan:|gstin:|registered address|sales office)/i.test(normalizedExtractedSupplierName))
      ? normalizedFooterSupplierName
      : normalizedExtractedSupplierName;
  const buyerAddress = sectionBuyerDetails.address ?? cleanPartyAddress(buyerSectionLines, buyerName) ?? legacyPartyDetails.address;
  const supplierAddress =
    (explicitSupplierSectionLines.length ? cleanPartyAddress(explicitSupplierSectionLines, supplierName) : undefined) ??
    extractAddressNearGstin(text, supplierGstin, supplierName) ??
    cleanPartyAddress(supplierSectionLines, supplierName) ??
    extractHeaderSupplierAddress(text, supplierName);
  const placeOfSupply = formatOcrAddress(
    extractAnywhereValue(text, [/place of supply(?: \(pos\))?\s*:\s*([^\n]+?)(?=\s*(?:customer order ref|pin code|state code|$))/i]) ||
      sectionBuyerDetails.placeOfSupply ||
      extractLabeledValue(text, ["place of supply"])
  );
  const poNumber =
    extractAnywhereValue(text, [
      /customer order ref\.?#?\s*:\s*([A-Z0-9/-]+)/i,
      /reference\s*:\s*([A-Z0-9/-]+)/i,
      /\bp\.?o\.?#?\b\s*[:#.-]*\s*([A-Z0-9/-]+)/i
    ]) ??
    extractInlineValue(text, [/^p\.?o\.?#?\s*[:#.-]*\s*(.+)$/i, /^(?:po number|po no|purchase order)\s*[:#.-]*\s*(.+)$/i]) ??
    extractLabeledValue(text, ["p.o.#", "p.o.", "po number", "po no", "purchase order"]);
  const vehicleNumber = extractLabeledValue(text, ["vehicle number", "vehicle no"]);
  const eWayBillNumber = extractLabeledValue(text, ["e-way bill number", "eway bill number", "eway bill", "ewaybill"]);
  const paymentTerms =
    (prefersStructuredFields
      ? extractMultilineValue(
          metadataSection,
          allLines,
          [/^mode\/terms of payment\s*[:#.-]*\s*(.*)$/i, /^payment terms?\s*[:#.-]*\s*(.*)$/i, /^terms\s*[:#.-]*\s*(.*)$/i],
          {
            lookaheadLines: 2,
            stopMatchers: [/^other references/i, /^dated$/i, /^delivery note date/i],
            skipMatchers: [/^:?$/i]
          }
        )
      : undefined) ??
    extractAnywhereValue(text, [/payment terms?\s*:\s*([^\n]+?)(?=\s*(?:po|reference|place of supply|$))/i]) ??
    extractInlineValue(text, [/^terms\s*[:#.-]*\s*(.+)$/i]) ??
    extractLabeledValue(text, ["payment terms", "payment term"]);
  const amountInWords =
    formatAmountInWords(
      (prefersStructuredFields
        ? extractMultilineValue(
            taxSummarySection,
            allLines,
            [
              /^amount chargeable \(in words\)\s*[:#.-]*\s*(.*)$/i,
              /^amount in words\s*[:#.-]*\s*(.*)$/i,
              /^total invoice value in words\s*[:#.-]*\s*(.*)$/i
            ],
            {
              lookaheadLines: 3,
              allowJoin: true,
              stopMatchers: [/^tax amount/i, /^company'?s pan/i, /^company'?s bank details/i],
              skipMatchers: [/^e\.?\s*&\s*o\.?\s*e\.?$/i]
            }
          )
        : undefined) ??
      extractAnywhereValue(text, [
        /amount in words\s*:\s*([^\n]+?)(?=\s*(?:total taxable value|total invoice value|bank details|$))/i,
        /total invoice value in words\s*:\s*([^\n]+?)(?=\s*(?:we request|beneficiary|$))/i,
        /(rupees [a-z0-9 ,'-]+ only)(?=total invoice amount|$)/i
      ]) ??
        extractInlineValue(text, [
        /^total in words\s*:?\s*(.+)$/i,
        /^amount in words\s*:\s*(.+)$/i,
        /^in words\s*:\s*(.+)$/i
      ]) ??
        extractBlock(
          text,
          [/^total in words:?$/i, /^amount in words:?$/i, /^in words:?$/i, /^totalamount/i],
          [/^rounded total/i, /^for /i, /^irn:?$/i, /^amount to be credited/i, /^amounttobecredited/i],
          2
        )
    );
  const lineItems = extractLineItems(
    structure.family === "BVALUE_PARTNER" ? lineItemsSection?.text ?? text : text,
    ocrConfidence
  );
  const roundedTotal = extractAmountFromMatchingLine(text, [/^rounded total\b/i]);
  const explicitTaxableValue =
    parseMoney(
      (prefersStructuredFields
        ? extractMultilineValue(
            taxSummarySection,
            allLines,
            [
              /^taxable amount\s*[:#.-]*\s*(.*)$/i,
              /^taxable value\s*[:#.-]*\s*(.*)$/i,
              /^total taxable value\s*[:#.-]*\s*(.*)$/i
            ],
            {
              lookaheadLines: 2,
              stopMatchers: [/^igst$/i, /^cgst$/i, /^sgst$/i, /^total$/i]
            }
          )
        : undefined) ??
      extractAnywhereValue(text, [
        /total taxable value\s*:\s*([\d,]+\.\d{2})/i,
        /taxable amount\s*:?\s*([\d,]+\.\d{2})/i,
        /taxable value\s*:?\s*([\d,]+\.\d{2})/i
      ])
    ) ??
    extractAmountFromMatchingLine(
      text,
      [/^total taxable value/i],
      2
    );
  const condensedTaxableValue =
    taxSummarySection?.lines
      .map((line) => {
        if (!/%/.test(line) || (line.match(/\d[\d,]*\.\d{2}/g) ?? []).length < 2) {
          return undefined;
        }

        return extractLastMoneyToken(line);
      })
      .find((value): value is number => value !== undefined);
  const labeledTaxableValue = explicitTaxableValue ?? extractAmountFromMatchingLine(
    text,
    [/^taxable value/i, /^taxable amount/i, /^sub\s*total/i, /^subtotal/i, /^total taxable value/i],
    2
  );
  const cgst = extractAmountFromMatchingLine(text, [/^cgst/i], 2);
  const sgst = extractAmountFromMatchingLine(text, [/^sgst/i], 2);
  const igst = extractAmountFromMatchingLine(text, [/^:?igst/i], 2);
  const cess = extractAmountFromMatchingLine(text, [/^cess/i], 2);
  const explicitTotalAmount =
    parseMoney(
      (prefersStructuredFields
        ? extractMultilineValue(
            taxSummarySection,
            allLines,
            [
              /^total invoice amount\s*[:#.-]*\s*(.*)$/i,
              /^total invoice value\s*[:#.-]*\s*(.*)$/i,
              /^amount payable\s*[:#.-]*\s*(.*)$/i,
              /^total\s*[:#.-]*\s*(.*)$/i
            ],
            {
              lookaheadLines: 2,
              stopMatchers: [/^amount chargeable/i, /^tax amount/i, /^company'?s bank details/i],
              skipMatchers: [/^:?$/i]
            }
          )
        : undefined) ??
      extractAnywhereValue(text, [
        /total invoice amount\s*([\d,]+\.\d{2})/i,
        /total invoice value\s*([\d,]+\.\d{2})/i,
        /amount payable\s*:\s*([\d,]+\.\d{2})/i
      ])
    ) ??
    extractAmountFromMatchingLine(
      text,
      [/^amount payable/i, /^total invoice amount/i, /^total invoice value/i],
      2
    );
  const labeledTotalAmount = explicitTotalAmount ?? extractAmountFromMatchingLine(
    text,
    [
      /^invoice total/i,
      /^total invoice amount/i,
      /^total invoice value/i,
      /^grand total/i,
      /^total amount/i,
      /^total value/i,
      /^amount payable/i,
      /^balance due/i,
      /^amount due/i,
      /^rounded total/i,
      /^total/i
    ],
    2
  );
  const zeroTaxSignal = hasZeroTaxSignal(text);
  const totalAmount =
    labeledTotalAmount ??
    roundedTotal ??
    (lineItems.length === 1 ? lineItems[0]?.lineAmount : undefined);
  const summedLineTaxableValue =
    structure.family === "BVALUE_PARTNER" &&
    lineItems.length > 1 &&
    lineItems.every((item) => item.lineAmount !== undefined)
      ? Number(
          lineItems.reduce((sum, item) => sum + (item.lineAmount ?? 0), 0).toFixed(2)
        )
      : undefined;
  const taxableValue =
    labeledTaxableValue ??
    condensedTaxableValue ??
    summedLineTaxableValue ??
    (lineItems.length === 1 ? lineItems[0]?.taxableValue : undefined) ??
    ((zeroTaxSignal || (!cgst && !sgst && !igst && !cess)) ? totalAmount : undefined);
  const signatureOrStamp = /authori[sz]ed signatory|authorized signature|stamp|seal/i.test(text)
    ? "present"
    : ocrConfidence < 0.45
      ? "unclear"
      : "not_detected";
  const extractionDiagnostics = buildExtractionDiagnostics({
    rawText: text,
    invoiceNumber: meaningfulValue(invoiceNumber),
    invoiceDate,
    buyerName: meaningfulValue(buyerName),
    totalAmount,
    taxableValue,
    amountInWords: formatAmountInWords(amountInWords),
    bankDetails
  });

  const extractedFields: InvoiceFieldValue[] = [
    field("Invoice metadata", "invoice_number", "Invoice Number", meaningfulValue(invoiceNumber), ocrConfidence, "ocr"),
    field("Invoice metadata", "invoice_date", "Invoice Date", invoiceDate, ocrConfidence, "ocr"),
    field("Supplier details", "supplier_name", "Supplier Name", meaningfulValue(supplierName), ocrConfidence - 0.02, "ocr"),
    field("Supplier details", "supplier_address", "Supplier Address", formatOcrAddress(supplierAddress), ocrConfidence - 0.05, "ocr"),
    field("Supplier details", "supplier_gstin", "Supplier GSTIN", normalizedValue(supplierGstin), ocrConfidence - 0.04, "ocr"),
    field("Buyer details", "buyer_name", "Buyer Name", meaningfulValue(buyerName), ocrConfidence - 0.02, "ocr"),
    field("Buyer details", "buyer_address", "Buyer Address", formatOcrAddress(buyerAddress), ocrConfidence - 0.05, "ocr"),
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
    field("Invoice metadata", "amount_in_words", "Amount In Words", formatAmountInWords(amountInWords), ocrConfidence - 0.06, "ocr"),
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
    family: structure.family,
    supplier: {
      name: meaningfulValue(supplierName),
      address: formatOcrAddress(supplierAddress),
      gstin: normalizedValue(supplierGstin)
    },
    buyer: {
      name: meaningfulValue(buyerName),
      address: formatOcrAddress(buyerAddress),
      gstin: normalizedValue(buyerGstin)
    },
    invoiceNumber: meaningfulValue(invoiceNumber),
    invoiceDate,
    placeOfSupply: normalizedValue(placeOfSupply),
    poNumber: normalizedValue(poNumber)?.length && (normalizedValue(poNumber)?.length ?? 0) > 2 ? normalizedValue(poNumber) : undefined,
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
      amountInWords: formatAmountInWords(amountInWords)
    },
    rawText: text,
    extractedFields,
    sections: structure.sections,
    extractionDiagnostics,
    qualitySignals: ocr.qualitySignals
  };
}

export function averageExtractedFieldConfidence(document: NormalizedInvoiceDocument) {
  return Number(
    averageConfidence(document.extractedFields.filter((item) => item.present).map((item) => item.confidence)).toFixed(2)
  );
}

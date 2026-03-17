import type {
  InvoiceDetectedSection,
  InvoiceDocumentFamily,
  OcrDocumentResult,
  OcrLayoutLine
} from "@/lib/invoice-types";

export interface StructuredInvoiceLine extends OcrLayoutLine {
  pageNumber: number;
  index: number;
}

export interface InvoiceDocumentStructure {
  family: InvoiceDocumentFamily;
  lines: StructuredInvoiceLine[];
  sections: InvoiceDetectedSection[];
  sectionMap: Record<string, InvoiceDetectedSection | undefined>;
}

interface SectionDefinition {
  key: string;
  label: string;
  startMatchers: RegExp[];
  stopMatchers: RegExp[];
  maxLines?: number;
}

const FAMILY_PATTERNS: Array<[InvoiceDocumentFamily, RegExp[]]> = [
  ["PINE_LABS_POS", [/pine labs/i, /customer order ref\.#/i, /payment term/i]],
  ["PAYU_MERCHANT", [/payu/i, /merchant id/i, /description of service/i]],
  ["BVALUE_PARTNER", [/consignee \(ship to\)/i, /mode\/terms of payment/i, /company'?s bank details/i]],
  ["SETTLEMENT_STATEMENT", [/statement of account/i, /merchant settlement/i, /partner payout/i, /settlement/i]],
  ["STANDARD_GST_GOODS", [/\be-?way bill\b/i, /\bvehicle\b/i, /\bqty\b/i, /\bhsn\b/i, /loose raw guar seed/i]],
  ["GST_SERVICE", [/\bsac\b/i, /description of service/i, /campaign/i, /data sharing/i, /growth plan/i]]
];

const SECTION_DEFINITIONS: SectionDefinition[] = [
  {
    key: "buyer",
    label: "Buyer / Consignee",
    startMatchers: [
      /^buyer \(bill to\)/i,
      /^consignee \(ship to\)/i,
      /^bill to$/i,
      /^bill to address:?$/i,
      /^details of receiver\b/i,
      /^details of customer\b/i
    ],
    stopMatchers: [
      /^invoice no/i,
      /^document no/i,
      /^invoice date/i,
      /^dated$/i,
      /^mode\/terms of payment/i,
      /^sl$/i,
      /^description/i,
      /^particulars/i
    ],
    maxLines: 14
  },
  {
    key: "invoice_metadata",
    label: "Invoice metadata",
    startMatchers: [/^invoice no/i, /^document no/i, /^invoice number/i, /^date of invoice/i, /^dated$/i],
    stopMatchers: [/^sl$/i, /^description/i, /^particulars/i, /^continued to page number/i, /^round off$/i],
    maxLines: 20
  },
  {
    key: "line_items",
    label: "Line items",
    startMatchers: [/^sl$/i, /^description of/i, /^#?item\b/i, /^particulars/i],
    stopMatchers: [/^igst$/i, /^cgst$/i, /^sgst$/i, /^round off$/i, /^total$/i, /^amount chargeable/i, /^company'?s bank details/i],
    maxLines: 80
  },
  {
    key: "tax_summary",
    label: "Tax summary",
    startMatchers: [/^igst$/i, /^round off$/i, /^amount chargeable \(in words\)/i, /^taxable amount$/i, /^taxable value$/i],
    stopMatchers: [/^company'?s bank details/i, /^bank details$/i, /^remittance detail$/i, /^declaration$/i],
    maxLines: 80
  },
  {
    key: "bank_details",
    label: "Bank details",
    startMatchers: [/^company'?s bank details/i, /^bank details$/i, /^payment details$/i, /^remittance detail$/i, /^make all payments to:/i],
    stopMatchers: [/^for\b/i, /^authori[sz]ed signatory/i, /^this is a computer generated invoice/i, /^declaration$/i],
    maxLines: 16
  }
];

function normalizedValue(value?: string) {
  return value?.replace(/\s+/g, " ").trim();
}

function flattenLines(ocr: OcrDocumentResult) {
  const flattened: StructuredInvoiceLine[] = [];
  let counter = 0;

  for (const page of ocr.pages) {
    const pageLines = page.text.split(/\r?\n/).map((text, index) => ({
      text,
      x: 0,
      y: 1000 - index * 12,
      width: Math.max(text.length * 6, 0),
      height: 10
    }));

    for (const line of pageLines) {
      const text = normalizedValue(line.text);

      if (!text) {
        continue;
      }

      flattened.push({
        pageNumber: page.pageNumber,
        index: counter,
        text,
        x: line.x,
        y: line.y,
        width: line.width,
        height: line.height
      });
      counter += 1;
    }
  }

  return flattened;
}

function detectFamily(text: string): InvoiceDocumentFamily {
  for (const [family, patterns] of FAMILY_PATTERNS) {
    if (patterns.every((pattern) => pattern.test(text))) {
      return family;
    }
  }

  if (/\bconsignee \(ship to\)\b/i.test(text) || /\bmode\/terms of payment\b/i.test(text)) {
    return "BVALUE_PARTNER";
  }

  if (/\bsac\b/i.test(text) || /\bdescription of service\b/i.test(text)) {
    return "GST_SERVICE";
  }

  return "GENERIC";
}

function buildSection(lines: StructuredInvoiceLine[], definition: SectionDefinition): InvoiceDetectedSection | undefined {
  const startIndex = lines.findIndex((line) => definition.startMatchers.some((matcher) => matcher.test(line.text)));

  if (startIndex === -1) {
    return undefined;
  }

  const collected: StructuredInvoiceLine[] = [];
  const maxLines = definition.maxLines ?? 14;

  for (let index = startIndex; index < lines.length && collected.length < maxLines; index += 1) {
    const line = lines[index]!;

    if (index > startIndex && definition.stopMatchers.some((matcher) => matcher.test(line.text))) {
      break;
    }

    collected.push(line);
  }

  if (!collected.length) {
    return undefined;
  }

  return {
    key: definition.key,
    label: definition.label,
    text: collected.map((line) => line.text).join("\n"),
    lines: collected.map((line) => line.text),
    pageNumber: collected[0]?.pageNumber,
    confidence: 0.82
  };
}

export function analyzeInvoiceStructure(ocr: OcrDocumentResult): InvoiceDocumentStructure {
  const lines = flattenLines(ocr);
  const family = detectFamily(ocr.rawText);
  const sections = SECTION_DEFINITIONS.map((definition) => buildSection(lines, definition)).filter(
    (section): section is InvoiceDetectedSection => Boolean(section)
  );
  const sectionMap = Object.fromEntries(sections.map((section) => [section.key, section])) as Record<
    string,
    InvoiceDetectedSection | undefined
  >;

  return {
    family,
    lines,
    sections,
    sectionMap
  };
}

export interface StructuredFieldOptions {
  lookaheadLines?: number;
  allowJoin?: boolean;
  skipMatchers?: RegExp[];
  stopMatchers?: RegExp[];
}

function isLabelLike(line: string) {
  return line.length <= 36 && /^[A-Za-z][A-Za-z/&() .'-]{2,}:?$/.test(line) && !/\d/.test(line);
}

export function extractStructuredFieldValue(
  lines: string[],
  matchers: RegExp[],
  options: StructuredFieldOptions = {}
) {
  const lookaheadLines = options.lookaheadLines ?? 2;
  const skipMatchers = options.skipMatchers ?? [];
  const stopMatchers = options.stopMatchers ?? [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    for (const matcher of matchers) {
      const match = line.match(matcher);

      if (!match) {
        continue;
      }

      const inlineValue = normalizedValue(match[1] ?? "");

      if (inlineValue) {
        return inlineValue;
      }

      const collected: string[] = [];

      for (let cursor = index + 1; cursor < Math.min(lines.length, index + 1 + lookaheadLines); cursor += 1) {
        const candidate = normalizedValue(lines[cursor]);

        if (!candidate) {
          continue;
        }

        if (skipMatchers.some((skipMatcher) => skipMatcher.test(candidate))) {
          continue;
        }

        if (stopMatchers.some((stopMatcher) => stopMatcher.test(candidate)) || isLabelLike(candidate)) {
          break;
        }

        collected.push(candidate);

        if (!options.allowJoin) {
          break;
        }
      }

      if (collected.length) {
        return normalizedValue(collected.join(" "));
      }
    }
  }

  return undefined;
}

export function sectionLines(structure: InvoiceDocumentStructure, key: string) {
  return structure.sectionMap[key]?.lines ?? [];
}

import type { ExtractedFieldRecord, InvoiceSummary } from "@/lib/types";
import { clamp, safeNumber } from "@/lib/utils";

const gstinPattern = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/gi;

function extractTextValue(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[:\\s-]+(.+)`, "i");
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].split("\n")[0].trim();
    }
  }

  return "";
}

export function parseInvoiceDocument(text: string): {
  invoice: InvoiceSummary;
  extractedFields: ExtractedFieldRecord[];
} {
  const invoiceNumber = extractTextValue(text, ["invoice number", "invoice no", "invoice #"]) || "UNKNOWN-INVOICE";
  const invoiceDate = extractTextValue(text, ["invoice date", "date"]) || new Date().toISOString().slice(0, 10);
  const supplierName = extractTextValue(text, ["supplier name", "seller"]) || "Unknown Supplier";
  const buyerName = extractTextValue(text, ["buyer name", "bill to"]) || "Unknown Buyer";
  const gstins = Array.from(new Set(text.match(gstinPattern) ?? []));
  const supplierGstin = gstins[0];
  const buyerGstin = gstins[1];
  const taxableValue = safeNumber(
    extractTextValue(text, ["taxable value", "subtotal", "taxable amount"]).replace(/[^\d.]/g, "")
  );
  const totalValue = safeNumber(
    extractTextValue(text, ["invoice total", "total value", "grand total"]).replace(/[^\d.]/g, ""),
    taxableValue
  );
  const cgst = safeNumber(extractTextValue(text, ["cgst"]).replace(/[^\d.]/g, ""));
  const sgst = safeNumber(extractTextValue(text, ["sgst"]).replace(/[^\d.]/g, ""));
  const igst = safeNumber(extractTextValue(text, ["igst"]).replace(/[^\d.]/g, ""));
  const vehicleNumber = extractTextValue(text, ["vehicle number", "vehicle no"]);
  const eWayBillNumber = extractTextValue(text, ["e-way bill number", "eway bill", "ewaybill"]);
  const hsnMatches = Array.from(text.matchAll(/\b\d{4,8}\b/g))
    .map((match) => match[0])
    .filter((value) => value.length >= 6)
    .slice(0, 4);
  const taxBreakup = [
    ...(cgst ? [{ label: "CGST", amount: cgst }] : []),
    ...(sgst ? [{ label: "SGST", amount: sgst }] : []),
    ...(igst ? [{ label: "IGST", amount: igst }] : [])
  ];
  const expectedTotal = taxableValue + cgst + sgst + igst;
  const mismatch = Math.abs(expectedTotal - totalValue) > 5;
  const flags = [
    ...(supplierGstin ? [] : ["Missing supplier GSTIN"]),
    ...(buyerGstin ? [] : ["Missing buyer GSTIN"]),
    ...(eWayBillNumber ? [] : ["Missing e-way bill where transport evidence may be expected"]),
    ...(mismatch ? ["Invoice total does not reconcile with taxable value and taxes"] : []),
    ...(/^unknown/i.test(invoiceNumber) ? ["Invoice number not extracted reliably"] : [])
  ];
  const completenessScore = clamp(
    100 -
      (supplierGstin ? 0 : 12) -
      (buyerGstin ? 0 : 12) -
      (vehicleNumber ? 0 : 7) -
      (eWayBillNumber ? 0 : 8) -
      (invoiceNumber !== "UNKNOWN-INVOICE" ? 0 : 15),
    0,
    100
  );
  const authenticityScore = clamp(
    completenessScore - (mismatch ? 18 : 0) - (invoiceNumber === "UNKNOWN-INVOICE" ? 12 : 0),
    0,
    100
  );

  const invoice: InvoiceSummary = {
    invoiceNumber,
    invoiceDate,
    supplierName,
    buyerName,
    supplierGstin,
    buyerGstin,
    taxableValue,
    taxBreakup,
    totalValue,
    hsnSac: hsnMatches,
    lineItems: [],
    vehicleNumber: vehicleNumber || undefined,
    eWayBillNumber: eWayBillNumber || undefined,
    completenessScore,
    authenticityScore,
    flags,
    extractionConfidence: completenessScore > 75 ? 0.87 : 0.58
  };

  const extractedFields: ExtractedFieldRecord[] = [
    { section: "Invoice", field: "Invoice Number", value: invoiceNumber, confidence: 0.94 },
    { section: "Invoice", field: "Invoice Date", value: invoiceDate, confidence: 0.85 },
    { section: "Invoice", field: "Supplier", value: supplierName, confidence: 0.8 },
    { section: "Invoice", field: "Buyer", value: buyerName, confidence: 0.8 },
    { section: "Invoice", field: "Taxable Value", value: String(taxableValue), confidence: 0.86 },
    { section: "Invoice", field: "Total Value", value: String(totalValue), confidence: 0.86 }
  ];

  return { invoice, extractedFields };
}

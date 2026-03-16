import type { GstSummary, InvoiceSummary, TradeCheck, TradeMatchResult } from "@/lib/types";
import { clamp } from "@/lib/utils";

export function computeTradeMatch(input: {
  invoice?: InvoiceSummary;
  gstSummary?: GstSummary;
  buyerLegalName?: string;
  anchorName?: string;
}): TradeMatchResult {
  const checks: TradeCheck[] = [];

  if (!input.invoice) {
    return {
      status: "INSUFFICIENT_DATA",
      score: 0,
      checks: [
        {
          label: "Invoice evidence",
          status: "missing",
          detail: "No invoice has been uploaded yet."
        }
      ],
      routePlausibility: "Cannot assess route without invoice evidence.",
      historicalRelationshipNote: "Cannot assess historical trade without invoice evidence."
    };
  }

  const invoice = input.invoice;
  const identityMatch = input.gstSummary
    ? invoice.buyerGstin === input.gstSummary.gstin || invoice.buyerName.includes(input.gstSummary.legalName)
    : false;
  checks.push({
    label: "Supplier and buyer identity",
    status: input.gstSummary ? (identityMatch ? "match" : "partial") : "missing",
    detail: input.gstSummary
      ? identityMatch
        ? "Buyer invoice identifiers align with GST profile."
        : "Buyer name or GSTIN does not fully align with GST profile."
      : "GST data is unavailable for identity matching."
  });

  const taxReconcile = invoice.taxableValue > 0 && invoice.totalValue >= invoice.taxableValue;
  checks.push({
    label: "Tax and total reconciliation",
    status: taxReconcile ? "match" : "mismatch",
    detail: taxReconcile
      ? "Invoice totals reconcile directionally."
      : "Taxable value exceeds total or tax math appears inconsistent."
  });

  checks.push({
    label: "Transport trace",
    status: invoice.eWayBillNumber || invoice.vehicleNumber ? "partial" : "missing",
    detail:
      invoice.eWayBillNumber || invoice.vehicleNumber
        ? "At least one shipment trace field is present."
        : "Transport trace is missing for this invoice."
  });

  checks.push({
    label: "Commercial relationship",
    status: input.anchorName && invoice.supplierName.toLowerCase().includes(input.anchorName.toLowerCase().split(" ")[0]) ? "match" : "partial",
    detail:
      input.anchorName
        ? `Supplier naming is directionally consistent with anchor ${input.anchorName}.`
        : "No anchor relationship metadata supplied."
  });

  const score = clamp(
    (identityMatch ? 30 : 15) +
      (taxReconcile ? 25 : 5) +
      (invoice.eWayBillNumber ? 15 : 0) +
      (invoice.vehicleNumber ? 10 : 0) +
      (input.anchorName ? 15 : 5),
    0,
    100
  );

  return {
    status: score >= 80 ? "STRONG_MATCH" : score >= 60 ? "PARTIAL_MATCH" : score >= 35 ? "MISMATCH" : "INSUFFICIENT_DATA",
    score,
    checks,
    routePlausibility:
      invoice.vehicleNumber || invoice.eWayBillNumber
        ? "Transport trace is partially present; route plausibility can be extended with e-way bill integration."
        : "No transport trace available, so route plausibility remains weak.",
    historicalRelationshipNote: input.anchorName
      ? `Anchor context ${input.anchorName} improves trade interpretability but should not replace shipment validation.`
      : "Historical relationship evidence is limited in the MVP."
  };
}

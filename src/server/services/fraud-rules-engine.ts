import type {
  BankAnalytics,
  BureauSummary,
  FraudFlag,
  InvoiceSummary,
  TradeMatchResult
} from "@/lib/types";

export function evaluateFraudFlags(input: {
  invoice?: InvoiceSummary;
  tradeMatch?: TradeMatchResult;
  bureauSummary?: BureauSummary;
  bankAnalytics?: BankAnalytics;
  extractionConfidence?: number;
}): FraudFlag[] {
  const flags: FraudFlag[] = [];

  if (input.invoice) {
    if (!input.invoice.supplierGstin || !input.invoice.buyerGstin) {
      flags.push({
        code: "INVOICE_GSTIN_MISSING",
        severity: "RED",
        reason: "Invoice GSTIN fields are incomplete.",
        module: "Invoice"
      });
    }

    if (input.invoice.authenticityScore < 55) {
      flags.push({
        code: "WEAK_INVOICE_AUTHENTICITY",
        severity: "RED",
        reason: "Invoice structure and totals look unreliable.",
        module: "Invoice"
      });
    }

    if (!input.invoice.eWayBillNumber && input.invoice.totalValue > 100000) {
      flags.push({
        code: "HIGH_VALUE_WITHOUT_EWAY",
        severity: "AMBER",
        reason: "High-value invoice does not include e-way bill evidence.",
        module: "Trade"
      });
    }
  }

  if (input.tradeMatch && input.tradeMatch.status === "MISMATCH") {
    flags.push({
      code: "TRADE_MISMATCH",
      severity: "RED",
      reason: "Trade matching engine found material mismatch across available data.",
      module: "Trade"
    });
  }

  if (input.bureauSummary?.writtenOff || input.bureauSummary?.settled) {
    flags.push({
      code: "BUREAU_INTEGRITY_ALERT",
      severity: "AMBER",
      reason: "Bureau history includes written-off or settled exposure.",
      module: "Bureau"
    });
  }

  if ((input.bankAnalytics?.chequeBounceCount ?? 0) >= 2 || (input.bankAnalytics?.emiBounceCount ?? 0) >= 1) {
    flags.push({
      code: "BANK_CONDUCT_STRESS",
      severity: "AMBER",
      reason: "Repeated bounce signals indicate bank conduct stress.",
      module: "Bank"
    });
  }

  if ((input.bankAnalytics?.relatedPartySignals.length ?? 0) > 0) {
    flags.push({
      code: "RELATED_PARTY_PATTERN",
      severity: "AMBER",
      reason: "Transaction descriptions suggest related-party looking behaviour.",
      module: "Bank"
    });
  }

  if ((input.extractionConfidence ?? 1) < 0.55) {
    flags.push({
      code: "LOW_EXTRACTION_CONFIDENCE",
      severity: "AMBER",
      reason: "Critical extraction confidence is too low for straight-through decisioning.",
      module: "Extraction"
    });
  }

  if (!flags.length) {
    flags.push({
      code: "NO_MATERIAL_FRAUD_FLAGS",
      severity: "GREEN",
      reason: "No material fraud or integrity triggers were detected in the current evidence set.",
      module: "System"
    });
  }

  return flags;
}

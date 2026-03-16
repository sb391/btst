import { evaluateFraudFlags } from "@/server/services/fraud-rules-engine";

describe("evaluateFraudFlags", () => {
  it("flags weak invoice authenticity and low extraction confidence", () => {
    const flags = evaluateFraudFlags({
      invoice: {
        invoiceNumber: "INV-1",
        invoiceDate: "2026-03-05",
        supplierName: "Supplier",
        buyerName: "Buyer",
        taxableValue: 150000,
        taxBreakup: [],
        totalValue: 150000,
        hsnSac: [],
        lineItems: [],
        completenessScore: 40,
        authenticityScore: 42,
        flags: [],
        extractionConfidence: 0.4
      },
      extractionConfidence: 0.4
    });

    expect(flags.some((flag) => flag.code === "WEAK_INVOICE_AUTHENTICITY")).toBe(true);
    expect(flags.some((flag) => flag.code === "LOW_EXTRACTION_CONFIDENCE")).toBe(true);
  });
});

import { computeTradeMatch } from "@/server/services/trade-matching-service";

describe("computeTradeMatch", () => {
  it("returns insufficient data when invoice extraction is weak", () => {
    const tradeMatch = computeTradeMatch({
      invoice: {
        invoiceNumber: "UNKNOWN-INVOICE",
        invoiceDate: "2026-03-13",
        supplierName: "Unknown Supplier",
        buyerName: "Unknown Buyer",
        taxableValue: 0,
        taxBreakup: [],
        totalValue: 0,
        hsnSac: [],
        lineItems: [],
        completenessScore: 40,
        authenticityScore: 34,
        flags: ["Invoice number not extracted reliably"],
        extractionConfidence: 0.58
      },
      anchorName: "Britannia"
    });

    expect(tradeMatch.status).toBe("INSUFFICIENT_DATA");
    expect(tradeMatch.score).toBeLessThanOrEqual(45);
    expect(tradeMatch.checks[0]?.label).toBe("Document readability");
  });

  it("keeps a usable match only when invoice evidence is strong enough", () => {
    const tradeMatch = computeTradeMatch({
      invoice: {
        invoiceNumber: "INV-2401",
        invoiceDate: "2026-03-13",
        supplierName: "Britannia Industries Ltd",
        buyerName: "Shree Ganesh Distributors LLP",
        supplierGstin: "29ABCDE1234F1Z5",
        buyerGstin: "27ABAFS1234F1Z6",
        taxableValue: 132800,
        taxBreakup: [
          { label: "CGST", amount: 11952 },
          { label: "SGST", amount: 11952 }
        ],
        totalValue: 156704,
        hsnSac: ["1905"],
        lineItems: [{ description: "Biscuits", quantity: 100, rate: 1328, amount: 132800 }],
        eWayBillNumber: "181000123456",
        completenessScore: 88,
        authenticityScore: 82,
        flags: [],
        extractionConfidence: 0.86
      },
      gstSummary: {
        legalName: "Shree Ganesh Distributors LLP",
        gstin: "27ABAFS1234F1Z6",
        status: "ACTIVE",
        filingFrequency: "Monthly",
        filingRegularity: 92,
        turnoverProxy: 57000000,
        gstrTrends: [],
        taxPaymentConsistency: 88,
        registrationAgeMonths: 60,
        state: "Maharashtra",
        businessType: "Wholesale distributor",
        healthScore: 83,
        rawResponse: {},
        processedResponse: {}
      },
      anchorName: "Britannia"
    });

    expect(tradeMatch.status).not.toBe("INSUFFICIENT_DATA");
    expect(tradeMatch.score).toBeGreaterThan(60);
  });
});

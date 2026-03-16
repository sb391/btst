import { normalizeInvoiceDocument } from "@/server/services/invoice-normalization-service";

const elasticRunStyleOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "Powered By",
    "Tax Invoice",
    "IER2526MNJ000001",
    "Buyer: K C INDIA LIMITED",
    "Bill To Address:",
    "G1-115A , G1- 147A, PLOT NO. G1-112,113,114,115, G1-",
    "147,148,149,150, G1-109,110,111,112A,150A, G1-103 to 108, RIICO",
    "INDUSTRIAL AREA, SARDAR, SARDARSHAHAR, Churu, Rajasthan,",
    "331403",
    "GSTIN: 08AAACK4893N1ZW",
    "Date: 13-03-2026",
    "From Address:",
    "KHASRA NO.-3/4,Village Sarang Basni,Tehsil-Merta, , Dist.-Nagaur",
    "Nagaur, Rajasthan",
    "GSTIN: 08AAUCS5079A1ZZ",
    "Place of Supply: Rajasthan-8",
    "Sr",
    "Item",
    "HSN",
    "Qty",
    "Gross",
    "Amount",
    "Scheme",
    "Amount",
    "Taxable",
    "Amount",
    "Amount",
    "1",
    "Loose Raw Guar Seed",
    "kg=1kg No. Of Bags - 2656",
    "07133910",
    "132800.0",
    "Kg",
    "6391664.00",
    "@ 48.13",
    "0.00",
    "@0.00%",
    "6391664.00",
    "@48.13",
    "6391664.00",
    "Totals",
    "6391664.00",
    "6391664.00",
    "In Words: INR Sixty Three Lakh, Ninety One Thousand, Six Hundred And Sixty Four only.",
    "Rounded Total: 6391664.00",
    "For NTEX Transportation Services Pvt. Ltd.(ElasticRun)",
    "For Authorized Signatory",
    "For K C INDIA LIMITED",
    "NTEX Transportation Services Pvt. Ltd.(ElasticRun)",
    "GSTIN: 08AAUCS5079A1ZZ, PAN: AAUCS5079A"
  ].join("\n"),
  pages: [
    {
      pageNumber: 1,
      text: "Fixture",
      confidence: 0.84
    }
  ],
  averageConfidence: 0.84,
  qualitySignals: {
    lowReadability: false,
    cutOffRisk: false,
    rotated: false,
    overlappingTextRisk: false,
    likelyScanned: false,
    noisyTokenRatio: 0.04
  }
} as const;

describe("normalizeInvoiceDocument", () => {
  it("extracts core invoice fields from OCR text", () => {
    const normalized = normalizeInvoiceDocument({
      providerKey: "test",
      providerMode: "fixture",
      rawText: [
        "Invoice Number: INV-2026-1148",
        "Invoice Date: 13/03/2026",
        "Supplier Name: Deccan Industrial Supplies Pvt Ltd",
        "Buyer Name: Starline Retail Distributors LLP",
        "Supplier GSTIN: 29AACCD1148P1ZX",
        "Buyer GSTIN: 27AATFS6621L1ZB",
        "Taxable Value: 132799.92",
        "CGST: 11952.00",
        "SGST: 11952.00",
        "Grand Total: 156703.92"
      ].join("\n"),
      pages: [
        {
          pageNumber: 1,
          text: "Fixture",
          confidence: 0.9
        }
      ],
      averageConfidence: 0.9,
      qualitySignals: {
        lowReadability: false,
        cutOffRisk: false,
        rotated: false,
        overlappingTextRisk: false,
        likelyScanned: false,
        noisyTokenRatio: 0.02
      }
    });

    expect(normalized.invoiceNumber).toBe("INV-2026-1148");
    expect(normalized.invoiceDate).toBe("2026-03-13");
    expect(normalized.supplier.name).toContain("Deccan Industrial Supplies");
    expect(normalized.buyer.gstin).toBe("27AATFS6621L1ZB");
    expect(normalized.taxDetails.totalAmount).toBe(156703.92);
  });

  it("extracts structured parties, totals, and line items from ElasticRun-style invoice OCR text", () => {
    const normalized = normalizeInvoiceDocument(elasticRunStyleOcr);

    expect(normalized.invoiceNumber).toBe("IER2526MNJ000001");
    expect(normalized.invoiceDate).toBe("2026-03-13");
    expect(normalized.buyer.name).toBe("K C INDIA LIMITED");
    expect(normalized.buyer.gstin).toBe("08AAACK4893N1ZW");
    expect(normalized.supplier.name).toContain("ElasticRun");
    expect(normalized.supplier.gstin).toBe("08AAUCS5079A1ZZ");
    expect(normalized.taxDetails.taxableValue).toBe(6391664);
    expect(normalized.taxDetails.totalAmount).toBe(6391664);
    expect(normalized.taxDetails.amountInWords).toContain("Sixty Three Lakh");
    expect(normalized.lineItems).toHaveLength(1);
    expect(normalized.lineItems[0]?.description).toContain("Loose Raw Guar Seed");
    expect(normalized.lineItems[0]?.description).toContain("No. Of Bags - 2656");
    expect(normalized.lineItems[0]?.quantity).toBe(132800);
    expect(normalized.lineItems[0]?.unit).toBe("Kg");
    expect(normalized.lineItems[0]?.unitPrice).toBe(48.13);
    expect(normalized.lineItems[0]?.lineAmount).toBe(6391664);
    expect(normalized.lineItems[0]?.hsnSac).toBe("07133910");
  });
});

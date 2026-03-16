import { normalizeInvoiceDocument } from "@/server/services/invoice-normalization-service";
import { runInvoiceValidationRules } from "@/server/services/invoice-validation-rules-engine";

const baseOcr = {
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
} as const;

describe("runInvoiceValidationRules", () => {
  it("flags tax arithmetic mismatches", () => {
    const ocr = {
      ...baseOcr,
      rawText: baseOcr.rawText.replace("Grand Total: 156703.92", "Grand Total: 159999.00")
    };
    const document = normalizeInvoiceDocument(ocr);
    const results = runInvoiceValidationRules({ ocr, document });

    expect(results.find((item) => item.checkName === "tax_math_consistent")?.status).toBe("FAIL");
  });

  it("flags invalid GSTIN values", () => {
    const ocr = {
      ...baseOcr,
      rawText: baseOcr.rawText.replace("Buyer GSTIN: 27AATFS6621L1ZB", "Buyer GSTIN: 27BADGSTIN")
    };
    const document = normalizeInvoiceDocument(ocr);
    const results = runInvoiceValidationRules({ ocr, document });

    expect(results.find((item) => item.checkName === "gstin_format_valid")?.status).toBe("FAIL");
  });

  it("does not warn on missing tax breakup when the invoice clearly indicates zero tax", () => {
    const ocr = {
      ...baseOcr,
      rawText: [
        "Invoice Number: IER2526MNJ000001",
        "Date: 13-03-2026",
        "Buyer: K C INDIA LIMITED",
        "Bill To Address:",
        "Industrial Area, Churu, Rajasthan",
        "GSTIN: 08AAACK4893N1ZW",
        "From Address:",
        "Nagaur, Rajasthan",
        "GSTIN: 08AAUCS5079A1ZZ",
        "Place of Supply: Rajasthan-8",
        "Sr",
        "Item",
        "HSN",
        "Qty",
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
        "6391664.00",
        "Totals",
        "6391664.00",
        "Rounded Total: 6391664.00",
        "For NTEX Transportation Services Pvt. Ltd.(ElasticRun)",
        "NTEX Transportation Services Pvt. Ltd.(ElasticRun)",
        "GSTIN: 08AAUCS5079A1ZZ"
      ].join("\n"),
      averageConfidence: 0.84,
      pages: [
        {
          pageNumber: 1,
          text: "Fixture",
          confidence: 0.84
        }
      ],
      qualitySignals: {
        lowReadability: false,
        cutOffRisk: false,
        rotated: false,
        overlappingTextRisk: false,
        likelyScanned: false,
        noisyTokenRatio: 0.04
      }
    };
    const document = normalizeInvoiceDocument(ocr);
    const results = runInvoiceValidationRules({ ocr, document });

    expect(results.find((item) => item.checkName === "tax_fields_present")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "total_amount_present")?.status).toBe("PASS");
  });
});

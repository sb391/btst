import { normalizeInvoiceDocument } from "@/server/services/invoice-normalization-service";
import { computeInvoiceScores } from "@/server/services/invoice-scoring-engine";
import { runInvoiceValidationRules } from "@/server/services/invoice-validation-rules-engine";

describe("computeInvoiceScores", () => {
  it("marks weak OCR outputs as low confidence", () => {
    const ocr = {
      providerKey: "fallback",
      providerMode: "fallback",
      rawText: "File name: test.pdf\nThe local OCR pipeline could not extract readable invoice text from this file.",
      pages: [
        {
          pageNumber: 1,
          text: "Fallback",
          confidence: 0.24
        }
      ],
      averageConfidence: 0.24,
      qualitySignals: {
        lowReadability: true,
        cutOffRisk: true,
        rotated: false,
        overlappingTextRisk: true,
        likelyScanned: true,
        noisyTokenRatio: 0.8
      }
    };
    const document = normalizeInvoiceDocument(ocr);
    const validationResults = runInvoiceValidationRules({ ocr, document });
    const output = computeInvoiceScores({ ocr, document, validationResults });

    expect(output.overallHealthStatus).toBe("LOW_CONFIDENCE");
    expect(output.recommendation).toBe("LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED");
  });

  it("keeps a structured high-value invoice in review rather than low-confidence fallback", () => {
    const ocr = {
      providerKey: "test",
      providerMode: "fixture",
      rawText: [
        "Tax Invoice",
        "IER2526MNJ000001",
        "Buyer: K C INDIA LIMITED",
        "Bill To Address:",
        "Industrial Area, Churu, Rajasthan",
        "GSTIN: 08AAACK4893N1ZW",
        "Date: 13-03-2026",
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
    };
    const document = normalizeInvoiceDocument(ocr);
    const validationResults = runInvoiceValidationRules({ ocr, document });
    const output = computeInvoiceScores({ ocr, document, validationResults });

    expect(output.overallHealthStatus).toBe("NEEDS_REVIEW");
    expect(output.recommendation).toBe("MINOR_ISSUES_REVIEW_RECOMMENDED");
    expect(output.scores.find((item) => item.key === "EXTRACTION_CONFIDENCE")?.score).toBeGreaterThan(70);
    expect(output.scores.find((item) => item.key === "COMPLETENESS")?.score).toBeGreaterThan(80);
  });
});

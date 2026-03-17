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

  it("scores a well-structured service invoice as in order when extraction and math are coherent", () => {
    const ocr = {
      providerKey: "test",
      providerMode: "fixture",
      rawText: [
        "Sub Total10,38,804.96",
        "IGST18 (18%)1,86,984.89",
        "Rounding0.15",
        "Total 12,25,790.00",
        "Total In Words",
        "Indian Rupee Twelve Lakh Twenty-Five Thousand Seven Hundred",
        "Ninety Only",
        "Make all payments to: SquadRun Solutions Private Limited",
        "HDFC Bank",
        "Branch Noida",
        "Account Number: 50200067256901",
        "IFSC Code: HDFC0000088",
        "Squadrun Solutions Private Limited",
        "D-18, 1st & 2nd Floor, Sector 3",
        "Noida Uttar Pradesh 201301, India",
        "GSTIN 09AAUCS6457N1Z6",
        "TAX INVOICE",
        "Document No.: 2025-26/498",
        "Invoice Date: 16/01/2026",
        "Terms: Net 45",
        "P.O.#: BVS/JAN2627/0034",
        "Place Of Supply: Karnataka (29)",
        "Bill To",
        "BValue Services Pvt Ltd",
        "2nd Floor, No 1187, Bhagwati, 5th main, 21st Cross Road",
        "7th sector, HSR Layout",
        "Bangalore",
        "560102 Karnataka",
        "India",
        "GSTIN 29AAICB6391A1ZN",
        "#Item & DescriptionSACQtyRate",
        "1No. Of Seats Utilised - Per",
        "Unit Pricing",
        "Total Login Hrs charged",
        "4710.38 for the month of",
        "Dec-25",
        "99842924.53342,000.0",
        "0",
        "18%1,85,469.4810,30,386.00",
        "2Calling (Bot-AI)",
        "AI Bot charges for the",
        "month of Dec-25",
        "9984294,252.001.9818%1,515.418,418.96",
        "IRN :885a0dbe21720950f327e5cd67abd7db270b22e34b97830d8cbeb1aaef4715b6"
      ].join("\n"),
      pages: [
        {
          pageNumber: 1,
          text: "Fixture",
          confidence: 0.82
        }
      ],
      averageConfidence: 0.82,
      qualitySignals: {
        lowReadability: false,
        cutOffRisk: false,
        rotated: false,
        overlappingTextRisk: false,
        likelyScanned: false,
        noisyTokenRatio: 0.08
      }
    };
    const document = normalizeInvoiceDocument(ocr);
    const validationResults = runInvoiceValidationRules({ ocr, document });
    const output = computeInvoiceScores({ ocr, document, validationResults });

    expect(output.overallHealthStatus).toBe("GOOD");
    expect(output.recommendation).toBe("LOOKS_IN_ORDER");
    expect(output.scores.find((item) => item.key === "RISK")?.score).toBeLessThan(30);
    expect(output.scores.find((item) => item.key === "CONSISTENCY")?.score).toBeGreaterThan(90);
  });

  it("downgrades parser misses with strong OCR evidence to low confidence instead of suspicious risk", () => {
    const ocr = {
      providerKey: "test",
      providerMode: "fixture",
      rawText: [
        "Invoice No.",
        "INV-12345",
        "Buyer (Bill to)",
        "Acme Retail Private Limited",
        "Dated",
        "13-03-2026",
        "Total",
        "1000.00"
      ].join("\n"),
      pages: [
        {
          pageNumber: 1,
          text: "Fixture",
          confidence: 0.88
        }
      ],
      averageConfidence: 0.88,
      qualitySignals: {
        lowReadability: false,
        cutOffRisk: false,
        rotated: false,
        overlappingTextRisk: false,
        likelyScanned: false,
        noisyTokenRatio: 0.01
      }
    };
    const document = normalizeInvoiceDocument(ocr);
    document.extractionDiagnostics = {
      parserLowConfidence: true,
      parserMissSignals: ["invoice_number", "buyer_name", "invoice_date"],
      evidenceSignals: ["invoice_number", "buyer_name", "invoice_date", "total_amount"]
    };
    const validationResults = runInvoiceValidationRules({ ocr, document });
    const output = computeInvoiceScores({ ocr, document, validationResults });

    expect(output.overallHealthStatus).toBe("LOW_CONFIDENCE");
    expect(output.recommendation).toBe("LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED");
  });
});

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

const serviceInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "Sub Total10,38,804.96",
    "IGST18 (18%)1,86,984.89",
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
} as const;

const fcplInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "TAXINVOICE",
    "FINCOOPERSCAPITALPVTLTD",
    "174/3NehruNagarIndore(M.P.)-452001",
    "GSTIN/UIN:23AAACG6273G1ZT",
    "Party",
    "Name:",
    "BVALUESERVICES",
    "PRIVATELIMITED",
    "InvoiceNo.InvoiceDate",
    "Address",
    "2",
    "nd",
    "Floor,No.1187,",
    "Bhagwati,5",
    "th",
    "main,21st",
    "CrossRoad,7",
    "th",
    "Sector,",
    "HSRLayout,Bengaluru",
    "Urban,Karnataka-",
    "560102",
    "00019/2025-2615-01-2026",
    "GSTIN:",
    "29AAICB6391A1ZN",
    "Particulars(Descriptions&Specifications)",
    "DataSharing10000003,63,333.00",
    ":IGST",
    "18%",
    "65,400.00",
    "Total4,28,733.00",
    "TotalAmount(INR-InWords):",
    "FourLakhsTwentyEightThousandSevenHundredThirtyThreeOnly",
    "BankName AxisBankLtd",
    "AccountNo-924020036958406",
    "IFSCCode-UTIB0000043"
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

  it("does not fail GSTIN validation when a valid GSTIN is followed by glued OCR noise", () => {
    const ocr = {
      ...baseOcr,
      rawText: baseOcr.rawText.replace(
        "Buyer GSTIN: 27AATFS6621L1ZB",
        "Buyer GSTIN: 27AATFS6621L1ZBTransaction Type: Services"
      )
    };
    const document = normalizeInvoiceDocument(ocr);
    const results = runInvoiceValidationRules({ ocr, document });

    expect(results.find((item) => item.checkName === "gstin_format_valid")?.status).toBe("PASS");
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

  it("does not require an e-way bill for a service invoice with SAC-based line items", () => {
    const document = normalizeInvoiceDocument(serviceInvoiceOcr);
    const results = runInvoiceValidationRules({ ocr: serviceInvoiceOcr, document });

    expect(results.find((item) => item.checkName === "tax_fields_present")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "eway_bill_present_or_not_required")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "line_items_detected")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "tax_math_consistent")?.status).toBe("PASS");
  });

  it("treats the compressed FCPL invoice as a coherent service invoice once fields are normalized", () => {
    const document = normalizeInvoiceDocument(fcplInvoiceOcr);
    const results = runInvoiceValidationRules({ ocr: fcplInvoiceOcr, document });

    expect(results.find((item) => item.checkName === "invoice_number_present")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "invoice_date_present")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "supplier_name_present")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "buyer_name_present")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "gstin_format_valid")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "tax_math_consistent")?.status).toBe("PASS");
    expect(results.find((item) => item.checkName === "eway_bill_present_or_not_required")?.status).toBe("PASS");
  });

  it("surfaces parser evidence mismatch separately from document fraud risk", () => {
    const document = normalizeInvoiceDocument(baseOcr);
    document.extractionDiagnostics = {
      parserLowConfidence: true,
      parserMissSignals: ["invoice_number", "buyer_name"],
      evidenceSignals: ["invoice_number", "buyer_name", "total_amount"]
    };
    const results = runInvoiceValidationRules({ ocr: baseOcr, document });

    expect(results.find((item) => item.checkName === "parser_evidence_alignment")?.status).toBe("WARN");
  });
});

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

const squadRunServiceInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "1",
    "Sub Total10,38,804.96",
    "IGST18 (18%)1,86,984.89",
    "Rounding0.15",
    "Total 12,25,790.00",
    "Balance Due 12,25,790.00",
    "Authorized Signature",
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
    "Due Date: 02/03/2026",
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
    "IGST",
    "Amount",
    "%Amt",
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

const fcplCompressedInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "TAXINVOICE",
    "FINCOOPERSCAPITALPVTLTD",
    "174/3NehruNagarIndore(M.P.)-452001",
    "GSTIN/UIN:23AAACG6273G1ZT",
    "StateName:MadhyaPradesh,Code:23",
    "EMail:support@fincoopers.com",
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
    "PAN:",
    "29AAICB6391A1ZN",
    "AAICB6391A",
    "Particulars(Descriptions&Specifications)",
    "Volume",
    "Amount",
    "DataSharing10000003,63,333.00",
    ":IGST",
    "18%",
    "65,400.00",
    "Total4,28,733.00",
    "TotalAmount(INR-InWords):",
    "FourLakhsTwentyEightThousandSevenHundredThirtyThreeOnly",
    "Amounttobecreditedingivenbankdetails:",
    "BankName AxisBankLtd",
    "AccountName-FINCOOPERSCAPITALPRIVATE",
    "LIMITEDUnit2.",
    "AccountNo-924020036958406",
    "AuthorizedSignatory",
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

const pineLabsInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "Details of Receiver (Bill To)Details of Consignee (Ship To)",
    "BVALUE SERVICES PRIVATE LIMITEDBVALUE SERVICES PRIVATE LIMITED",
    "2ND FLOOR/NO 11872ND FLOOR/NO 1187",
    "BHAGWATI,5TH MAIN,21ST CROSS ROAD,7TH SECTORBHAGWATI,5TH MAIN,21ST CROSS ROAD,7TH SECTOR",
    "BANGALORE 560102BANGALORE 560102",
    "Karnataka (29) , IndiaKarnataka (29) , India",
    "GSTIN/UID : 29AAICB6391A1ZNGSTIN/UID : 29AAICB6391A1ZN",
    "PAN : AAICB6391A",
    "SL.Description of Goods / ServicesHSN /QtyUOMRateTaxableCGSTSGSTIGST",
    "No.SACAmount",
    "%Amount%Amount%Amount",
    "1Enrich X9983191NOS25000.0025000.0018.004500.00",
    "Period:- Dec 25",
    "Total25000.004500.00",
    "Taxable Amount",
    "25000.00",
    "CGST Amount",
    "0.00",
    "Payment Term : 15 Days",
    "SGST Amount",
    "0.00",
    "IGST Amount",
    "4500.00",
    "Round off",
    "0.00",
    "Rupees Twenty Nine Thousand Five Hundred OnlyTotal Invoice Amount29500.00",
    "Tax Invoice",
    "( Original for Recipient )",
    "IRN : 8c3250fae82290d438d871cb509bc45b56199285111ba11d3b26a36e7a16a2d2 Invoice Number : INV092601268040",
    "Ack No. : 142619282955143Ack Date : 2026-01-13 17:08:00Invoice Date : 13-Jan-26",
    "Reverse Charge : Not Applicable",
    "Customer Order Ref.# : PL2526SO14547009",
    "Place of Supply : Karnataka - 29Customer Order Ref. Date : 13-Jan-26",
    "Candor Techspace, 4th & 5th Floor, Tower # 6,",
    "Plot No. B2, Sector - 62, Noida - 201301, Uttar Pradesh, India",
    "PAN : AACCP7457K",
    "GSTIN : 09AACCP7457K1ZV",
    "(Formerly known as Pine Labs Private Limited)",
    "Pine Labs Limited",
    "Remittance Detail",
    "Beneficiary Name : Pine Labs Limited",
    "Bank Name : HDFC Bank Ltd",
    "Branch : 122, Hargobind Enclave New Delhi 110092",
    "IFSC : HDFC0000481"
  ].join("\n"),
  pages: [
    {
      pageNumber: 1,
      text: "Fixture",
      confidence: 0.85
    }
  ],
  averageConfidence: 0.85,
  qualitySignals: {
    lowReadability: false,
    cutOffRisk: false,
    rotated: false,
    overlappingTextRisk: false,
    likelyScanned: false,
    noisyTokenRatio: 0.03
  }
} as const;

const truecallerInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "Registered Address:",
    "Table Space Two Horizon Centre 10th Floor",
    "DLF Phase V, Sector 43",
    "Gurgaon HR 122002 India",
    "Pan: AAMFT8352J LLPIN: AAK3926",
    "Sales Office:",
    "Table Space Two Horizon Centre 10th Floor",
    "DLF Phase V, Sector 43",
    "Gurgaon HR 122002 India",
    "GSTIN: 06AAMFT8352J1ZN",
    "Invoice no.:CB-202526-4529",
    "Date of Invoice:2026-01-09",
    "Due Date:2026-01-24",
    "Currency:INR",
    "Payment terms:Due on receipt",
    "PO:",
    "Reference:CB-202526-4529",
    "Place of Supply:Karnataka",
    "Details of Receiver (Billed to)",
    "Details of Consignee (Shipped to)",
    "BVALUE SERVICES PRIVATE LIMITED",
    "2ND FLOOR, NO 1187, Bhagwati,",
    "5TH MAIN, 21ST CROSS ROAD, 7TH SECTOR, HSR",
    "LAYOUT",
    "Bengaluru KA 560102",
    "India",
    "29AAICB6391A1ZN",
    "State Code: 29",
    "DescriptionPeriodHSN/SACQtyUnit PriceTax Rate",
    "Taxable Value",
    "Growth Plan - Quarterly2026-01-01 to",
    "2026-03-31",
    "998313",
    "1,50,00018% 75,000.00",
    "Amount in Words: INR Eighty Eight Thousand Five Hundred Only",
    "Total Taxable Value: 75,000.00",
    "IGST:13,500.00",
    "Tax Total: 13,500.00",
    "Less Amount Received: 0.00",
    "Amount Payable: 88,500.00",
    "Bank Details",
    "For Truecaller International LLP",
    "Rishit Jhunjhunwala, Designated Partner",
    "Banker: ICICI Bank Ltd.",
    "Account Name: Truecaller International LLP",
    "Bank Account No.: 000705044996",
    "Type of Bank Account: Current",
    "IFSC: ICIC0000007"
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
    noisyTokenRatio: 0.03
  }
} as const;

const payuInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "PayU India Innovations Private Limited",
    "9th Floor, 1, Bestech Business Tower, Sohna Road, Sector 48, Gurugram",
    "Haryana, 122018",
    "TAX INVOICE",
    "Supplier GSTIN: 06AAMCP8675R1Z7PAN: AAMCP8675RSupplier State Code: 06",
    "Document No:INN-0626-111Invoice Date:30/06/2025",
    "Due Date: 15/07/2025Category:B2B",
    "Details of customer(Billed to):",
    "Legal Name:BValue Services Private Limited",
    "Address:",
    "No. 1187, Bhagwati, 2nd Floor, 5th Main, 21st Cross, HSR Layout, Sector-7,",
    "City:",
    "BengaluruPlace of supply (POS): 29 - KarnatakaPin code:560102",
    "Gst No:",
    "29AAICB6391A1ZNTransaction type:ServicesMerchant Id:",
    "S.No.Description of service:HSN",
    "QTY.UOM",
    "Price per unit",
    "Rs. Ps.",
    "Total value Rs. Ps.",
    "1",
    "Buddy Loan Marketing Campaign Jun'25",
    "998599",
    "0",
    "Fixed",
    "Fee of",
    "Rs.1 L/",
    "Month",
    "1,00,000.00",
    "Total0Gross Amount 1,00,000.00",
    "Taxable Value",
    "1,00,000.00",
    "CGST (9%)",
    "0.00",
    "SGST (9%)",
    "0.00",
    "IGST (18%)",
    "18,000.00",
    "Total Tax Amount",
    "18,000.00",
    "Total Invoice value",
    "1,18,000.00",
    "Total invoice value in words: Rupees One Lakh Eighteen Thousand And Zero Paise Only",
    "Beneficiary Account Number: 50200069567142",
    "Beneficiary Account Name: PayU India Innovations Private",
    "Limited",
    "IFSC Code: HDFC0000622"
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
    noisyTokenRatio: 0.03
  }
} as const;

const earlySalaryPartnerInvoiceOcr = {
  providerKey: "test",
  providerMode: "fixture",
  rawText: [
    "Tax Invoice",
    "IRN:",
    "13800977e5ef9a6d2a652699cb66675f18a7d966b-",
    "b055246c0e5ab5e9f8d3b09",
    "Ack Date :",
    "7-Nov-25",
    "e-Invoice",
    "Bvalue Services Private Limited - (from 1-Apr-23)",
    "2ND FLOOR, NO 1187, Bhagwati, 5TH MAIN,",
    "21ST CROSS ROAD, 7TH SECTOR,",
    "HSR LAYOUT,Bangalore - 560102",
    "GSTIN/UIN: 29AAICB6391A1ZN",
    "State Name : Karnataka, Code : 29",
    "Consignee (Ship to)",
    "EARLYSALARY SERVICES PRIVATE LIMITED",
    "Fourth Floor, Office No 404, Viman Nagar,",
    "Lohgaon, Pune,",
    "GSTIN/UIN :27AACCA1425E1Z9",
    "State Name :Maharashtra, Code : 27",
    "Buyer (Bill to)",
    "EARLYSALARY SERVICES PRIVATE LIMITED",
    "Fourth Floor, Office No 404, Viman Nagar,",
    "Lohgaon, Pune,",
    "GSTIN/UIN :27AACCA1425E1Z9",
    "State Name :Maharashtra, Code : 27",
    "Invoice No.",
    "BL/NOV013/25-26",
    "Dated",
    "7-Nov-25",
    "Mode/Terms of Payment",
    "45 Days",
    "Sl",
    "Description ofAmountperRateQuantityHSN/SAC",
    "No.",
    "Services",
    "1",
    "Cost Per Sale6,18,085.00",
    "998399",
    "Fibe | October 2025",
    "19018000 @ 3.25%",
    "2",
    "Cost Per Sale5,13,180.00",
    "998399",
    "Fibe | October 2025",
    "17106000 @ 3%",
    "3",
    "Cost Per Registration2,200.00",
    "Nos2,200.00",
    "1.0000 Nos",
    "998399",
    "Fibe | October 2025",
    "4",
    "Cost Per Registration6,53,400.00",
    "Nos2,200.00",
    "297.0000 Nos",
    "998399",
    "Fibe | October 2025",
    "5",
    "Cost Per Registration27,000.00",
    "Nos1,000.00",
    "27.0000 Nos",
    "998399",
    "Fibe | October 2025",
    "18,13,865.00",
    "IGST",
    "3,26,495.70",
    "%18",
    "Round Off",
    "0.30",
    "Total",
    "21,40,361.00",
    "Amount Chargeable (in words)",
    "E. & O.E",
    "INR Twenty One Lakh Forty Thousand Three Hundred Sixty One Only",
    "Company's Bank Details",
    "A/c Holder's Name:",
    "Bvalue Services Private Limited",
    "Bank Name:",
    "HDFC Bank Account-50200048938768",
    "A/c No.:",
    "50200048938768",
    "Branch & IFS Code:",
    "HSR Layout & HDFC0004094",
    "for Bvalue Services Private Limited - (from 1-Apr-23)",
    "Authorised Signatory"
  ].join("\n"),
  pages: [
    {
      pageNumber: 1,
      text: "Fixture",
      confidence: 0.85
    }
  ],
  averageConfidence: 0.85,
  qualitySignals: {
    lowReadability: false,
    cutOffRisk: false,
    rotated: false,
    overlappingTextRisk: false,
    likelyScanned: false,
    noisyTokenRatio: 0.01
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

  it("extracts structured service invoice data from SquadRun/BValue-style OCR text", () => {
    const normalized = normalizeInvoiceDocument(squadRunServiceInvoiceOcr);

    expect(normalized.invoiceNumber).toBe("2025-26/498");
    expect(normalized.invoiceDate).toBe("2026-01-16");
    expect(normalized.supplier.name).toBe("Squadrun Solutions Private Limited");
    expect(normalized.supplier.address).toBe("D-18, 1st & 2nd Floor, Sector 3, Noida Uttar Pradesh 201301, India");
    expect(normalized.supplier.gstin).toBe("09AAUCS6457N1Z6");
    expect(normalized.buyer.name).toBe("BValue Services Pvt Ltd");
    expect(normalized.buyer.address).toBe(
      "2nd Floor, No 1187, Bhagwati, 5th main, 21st Cross Road, 7th sector, HSR Layout, Bangalore, 560102 Karnataka, India"
    );
    expect(normalized.buyer.gstin).toBe("29AAICB6391A1ZN");
    expect(normalized.poNumber).toBe("BVS/JAN2627/0034");
    expect(normalized.paymentTerms).toBe("Net 45");
    expect(normalized.bankDetails?.bankName).toBe("HDFC Bank");
    expect(normalized.bankDetails?.accountNumber).toBe("50200067256901");
    expect(normalized.bankDetails?.ifsc).toBe("HDFC0000088");
    expect(normalized.taxDetails.taxableValue).toBe(1038804.96);
    expect(normalized.taxDetails.igst).toBe(186984.89);
    expect(normalized.taxDetails.totalAmount).toBe(1225790);
    expect(normalized.taxDetails.amountInWords).toContain("Twelve Lakh Twenty-Five Thousand");
    expect(normalized.lineItems).toHaveLength(2);
    expect(normalized.lineItems[0]).toMatchObject({
      lineNumber: 1,
      hsnSac: "998429",
      quantity: 24.533,
      unitPrice: 42000,
      lineAmount: 1030386
    });
    expect(normalized.lineItems[1]).toMatchObject({
      lineNumber: 2,
      hsnSac: "998429",
      quantity: 4252,
      unitPrice: 1.98,
      lineAmount: 8418.96
    });
  });

  it("extracts compressed FCPL invoice fields from flattened OCR text", () => {
    const normalized = normalizeInvoiceDocument(fcplCompressedInvoiceOcr);

    expect(normalized.supplier.name).toBe("FIN COOPERS CAPITAL PVT LTD");
    expect(normalized.supplier.address).toBe("174/3 Nehru Nagar Indore (M.P.) - 452001");
    expect(normalized.supplier.gstin).toBe("23AAACG6273G1ZT");
    expect(normalized.buyer.name).toBe("BVALUE SERVICES PRIVATE LIMITED");
    expect(normalized.buyer.address).toContain("2nd Floor, No. 1187");
    expect(normalized.buyer.address).toContain("HSR Layout");
    expect(normalized.buyer.gstin).toBe("29AAICB6391A1ZN");
    expect(normalized.invoiceNumber).toBe("00019/2025-26");
    expect(normalized.invoiceDate).toBe("2026-01-15");
    expect(normalized.taxDetails.taxableValue).toBe(363333);
    expect(normalized.taxDetails.igst).toBe(65400);
    expect(normalized.taxDetails.totalAmount).toBe(428733);
    expect(normalized.taxDetails.amountInWords).toContain("Four Lakhs Twenty Eight Thousand Seven Hundred Thirty Three Only");
    expect(normalized.bankDetails?.bankName).toBe("Axis Bank Ltd");
    expect(normalized.bankDetails?.accountNumber).toBe("924020036958406");
    expect(normalized.bankDetails?.ifsc).toBe("UTIB0000043");
    expect(normalized.lineItems).toHaveLength(1);
    expect(normalized.lineItems[0]).toMatchObject({
      description: "Data Sharing",
      taxableValue: 363333,
      lineAmount: 363333
    });
  });

  it("extracts Pine Labs POS invoice fields from a merged bill-to/service table OCR output", () => {
    const normalized = normalizeInvoiceDocument(pineLabsInvoiceOcr);

    expect(normalized.supplier.name).toBe("Pine Labs Limited");
    expect(normalized.supplier.address).toBe(
      "Candor Techspace, 4th & 5th Floor, Tower # 6, Plot No. B2, Sector - 62, Noida - 201301, Uttar Pradesh, India"
    );
    expect(normalized.supplier.gstin).toBe("09AACCP7457K1ZV");
    expect(normalized.buyer.name).toBe("BVALUE SERVICES PRIVATE LIMITED");
    expect(normalized.buyer.address).toBe(
      "2ND FLOOR/NO 1187, BHAGWATI, 5TH MAIN, 21ST CROSS ROAD, 7TH SECTOR, BANGALORE 560102, Karnataka (29) , India"
    );
    expect(normalized.buyer.gstin).toBe("29AAICB6391A1ZN");
    expect(normalized.invoiceNumber).toBe("INV092601268040");
    expect(normalized.invoiceDate).toBe("2026-01-13");
    expect(normalized.poNumber).toBe("PL2526SO14547009");
    expect(normalized.paymentTerms).toBe("15 Days");
    expect(normalized.placeOfSupply).toBe("Karnataka - 29");
    expect(normalized.taxDetails.amountInWords).toContain("Twenty Nine Thousand Five Hundred");
    expect(normalized.taxDetails.taxableValue).toBe(25000);
    expect(normalized.taxDetails.igst).toBe(4500);
    expect(normalized.taxDetails.totalAmount).toBe(29500);
    expect(normalized.bankDetails?.bankName).toBe("HDFC Bank Ltd");
    expect(normalized.bankDetails?.accountNumber).toBeUndefined();
    expect(normalized.bankDetails?.branch).toBe("122, Hargobind Enclave New Delhi 110092");
    expect(normalized.bankDetails?.ifsc).toBe("HDFC0000481");
    expect(normalized.lineItems).toHaveLength(1);
    expect(normalized.lineItems[0]).toMatchObject({
      description: "Enrich X",
      quantity: 1,
      unit: "NOS",
      unitPrice: 25000,
      taxableValue: 25000,
      hsnSac: "998319"
    });
  });

  it("extracts Truecaller invoice fields from the billed-to footer-heavy OCR format", () => {
    const normalized = normalizeInvoiceDocument(truecallerInvoiceOcr);

    expect(normalized.supplier.name).toBe("Truecaller International LLP");
    expect(normalized.supplier.gstin).toBe("06AAMFT8352J1ZN");
    expect(normalized.buyer.name).toBe("BVALUE SERVICES PRIVATE LIMITED");
    expect(normalized.buyer.gstin).toBe("29AAICB6391A1ZN");
    expect(normalized.invoiceNumber).toBe("CB-202526-4529");
    expect(normalized.invoiceDate).toBe("2026-01-09");
    expect(normalized.paymentTerms).toBe("Due on receipt");
    expect(normalized.placeOfSupply).toBe("Karnataka");
    expect(normalized.taxDetails.taxableValue).toBe(75000);
    expect(normalized.taxDetails.igst).toBe(13500);
    expect(normalized.taxDetails.totalAmount).toBe(88500);
    expect(normalized.taxDetails.amountInWords).toContain("Eighty Eight Thousand Five Hundred");
    expect(normalized.bankDetails?.bankName).toBe("ICICI Bank Ltd.");
    expect(normalized.bankDetails?.accountNumber).toBe("000705044996");
    expect(normalized.bankDetails?.ifsc).toBe("ICIC0000007");
    expect(normalized.lineItems).toHaveLength(1);
    expect(normalized.lineItems[0]).toMatchObject({
      description: "Growth Plan - Quarterly",
      taxableValue: 75000,
      hsnSac: "998313"
    });
  });

  it("extracts PayU merchant invoice fields from a service-style OCR output", () => {
    const normalized = normalizeInvoiceDocument(payuInvoiceOcr);

    expect(normalized.supplier.name).toBe("PayU India Innovations Private Limited");
    expect(normalized.supplier.gstin).toBe("06AAMCP8675R1Z7");
    expect(normalized.buyer.name).toBe("BValue Services Private Limited");
    expect(normalized.buyer.gstin).toBe("29AAICB6391A1ZN");
    expect(normalized.invoiceNumber).toBe("INN-0626-111");
    expect(normalized.invoiceDate).toBe("2025-06-30");
    expect(normalized.placeOfSupply).toBe("29 - Karnataka");
    expect(normalized.taxDetails.taxableValue).toBe(100000);
    expect(normalized.taxDetails.cgst).toBe(0);
    expect(normalized.taxDetails.sgst).toBe(0);
    expect(normalized.taxDetails.igst).toBe(18000);
    expect(normalized.taxDetails.totalAmount).toBe(118000);
    expect(normalized.taxDetails.amountInWords).toContain("One Lakh Eighteen Thousand");
    expect(normalized.bankDetails?.accountNumber).toBe("50200069567142");
    expect(normalized.bankDetails?.ifsc).toBe("HDFC0000622");
    expect(normalized.lineItems).toHaveLength(1);
    expect(normalized.lineItems[0]).toMatchObject({
      description: "Buddy Loan Marketing Campaign Jun'25",
      taxableValue: 100000,
      hsnSac: "998599"
    });
  });

  it("extracts multiline BValue partner invoice fields from a structured GST service invoice", () => {
    const normalized = normalizeInvoiceDocument(earlySalaryPartnerInvoiceOcr);

    expect(normalized.family).toBe("BVALUE_PARTNER");
    expect(normalized.supplier.name).toBe("Bvalue Services Private Limited - (from 1-Apr-23)");
    expect(normalized.supplier.gstin).toBe("29AAICB6391A1ZN");
    expect(normalized.buyer.name).toBe("EARLYSALARY SERVICES PRIVATE LIMITED");
    expect(normalized.buyer.address).toContain("Fourth Floor, Office No 404, Viman Nagar");
    expect(normalized.buyer.address).toContain("Lohgaon, Pune");
    expect(normalized.buyer.gstin).toBe("27AACCA1425E1Z9");
    expect(normalized.invoiceNumber).toBe("BL/NOV013/25-26");
    expect(normalized.invoiceDate).toBe("2025-11-07");
    expect(normalized.paymentTerms).toBe("45 Days");
    expect(normalized.taxDetails.taxableValue).toBe(1813865);
    expect(normalized.taxDetails.igst).toBe(326495.7);
    expect(normalized.taxDetails.totalAmount).toBe(2140361);
    expect(normalized.taxDetails.amountInWords).toContain("Twenty One Lakh Forty Thousand Three Hundred Sixty One");
    expect(normalized.bankDetails?.bankName).toBe("HDFC Bank");
    expect(normalized.bankDetails?.accountNumber).toBe("50200048938768");
    expect(normalized.bankDetails?.ifsc).toBe("HDFC0004094");
    expect(normalized.bankDetails?.branch).toBe("HSR Layout");
    expect(normalized.lineItems).toHaveLength(5);
    expect(normalized.lineItems[0]?.description).toContain("Cost Per Sale");
    expect(normalized.lineItems[0]?.description).toContain("Fibe | October 2025");
    expect(normalized.lineItems[0]?.hsnSac).toBe("998399");
    expect(normalized.lineItems[0]?.lineAmount).toBe(618085);
    expect(normalized.extractionDiagnostics?.parserLowConfidence).toBe(false);
  });
});

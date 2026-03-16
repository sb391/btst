import type {
  AdminIntegrationStatus,
  CaseListItem,
  CaseWorkspaceData,
  PolicyConfigRecord
} from "@/lib/types";
import { scoringWeightsByBorrowerType } from "@/config/policy";

export const demoCaseWorkspace: CaseWorkspaceData = {
  caseId: "case_demo_001",
  caseNumber: "UW-IND-2026-001",
  createdAt: "2026-03-10T10:30:00.000Z",
  borrower: {
    id: "borrower_demo_001",
    legalName: "Shree Ganesh Distributors LLP",
    borrowerType: "DISTRIBUTOR",
    gstin: "27ABAFS1234F1Z6",
    pan: "ABAFS1234F",
    state: "Maharashtra",
    anchorName: "Britannia",
    dealerCode: "BRI-MH-44721",
    customerCode: "CUST-9987",
    metadata: {
      segment: "FMCG distribution",
      branchCount: 3,
      yearsWithAnchor: 5
    }
  },
  documents: [
    {
      id: "doc_bureau_001",
      type: "BUREAU_REPORT",
      name: "cibil-report-march-2026.pdf",
      status: "PROCESSED",
      uploadedAt: "2026-03-10T10:34:00.000Z",
      extractionConfidence: 0.91,
      notes: "Structured fields reviewed by analyst."
    },
    {
      id: "doc_bank_001",
      type: "BANK_STATEMENT",
      name: "bank-statement-oct-mar.csv",
      status: "PROCESSED",
      uploadedAt: "2026-03-10T10:38:00.000Z",
      extractionConfidence: 0.88,
      notes: "6 months parsed from CSV."
    },
    {
      id: "doc_invoice_001",
      type: "INVOICE",
      name: "invoice-440112.pdf",
      status: "PROCESSED",
      uploadedAt: "2026-03-10T10:41:00.000Z",
      extractionConfidence: 0.86,
      notes: "Line items extracted with moderate confidence."
    },
    {
      id: "doc_gst_001",
      type: "GST_PULL",
      name: "gst-api-response.json",
      status: "PROCESSED",
      uploadedAt: "2026-03-10T10:43:00.000Z",
      extractionConfidence: 0.98,
      notes: "Third-party GST API stub."
    }
  ],
  extractedFields: [
    { section: "Bureau", field: "Score", value: "772", confidence: 0.97 },
    { section: "Bureau", field: "Written Off", value: "No", confidence: 0.92 },
    { section: "Bureau", field: "Enquiry Count", value: "3", confidence: 0.91 },
    { section: "GST", field: "Status", value: "ACTIVE", confidence: 0.99 },
    { section: "GST", field: "Filing Regularity", value: "92%", confidence: 0.98 },
    { section: "Bank", field: "Cheque Bounces", value: "1", confidence: 0.87 },
    { section: "Bank", field: "Average Balance", value: "INR 11,20,000", confidence: 0.88 },
    { section: "Invoice", field: "Invoice Number", value: "INV-440112", confidence: 0.95 },
    { section: "Invoice", field: "E-Way Bill", value: "281004455662", confidence: 0.82 }
  ],
  bureauSummary: {
    score: 772,
    activeLoans: 4,
    overdueHistory: 0,
    dpdPatterns: ["000", "000", "030", "000", "000", "000"],
    creditUtilization: 32,
    unsecuredMix: 28,
    securedMix: 72,
    enquiryCount: 3,
    writtenOff: false,
    settled: false,
    loanVintageMonths: 48,
    extractionConfidence: 0.91
  },
  gstSummary: {
    legalName: "Shree Ganesh Distributors LLP",
    gstin: "27ABAFS1234F1Z6",
    status: "ACTIVE",
    filingFrequency: "Monthly",
    filingRegularity: 92,
    turnoverProxy: 5.8e7,
    gstrTrends: [
      { period: "Oct-2025", filed: true, taxableValue: 9200000 },
      { period: "Nov-2025", filed: true, taxableValue: 9100000 },
      { period: "Dec-2025", filed: true, taxableValue: 9800000 },
      { period: "Jan-2026", filed: true, taxableValue: 9400000 },
      { period: "Feb-2026", filed: true, taxableValue: 10200000 },
      { period: "Mar-2026", filed: true, taxableValue: 9950000 }
    ],
    taxPaymentConsistency: 89,
    registrationAgeMonths: 74,
    state: "Maharashtra",
    businessType: "Wholesale distributor",
    healthScore: 84,
    rawResponse: {
      source: "mock-gst-provider",
      pulledAt: "2026-03-10T10:43:00.000Z"
    },
    processedResponse: {
      normalizedTurnoverBand: "High",
      filingGaps: 0
    }
  },
  bankAnalytics: {
    monthlyCredits: [
      { month: "Oct", amount: 10200000 },
      { month: "Nov", amount: 9800000 },
      { month: "Dec", amount: 11200000 },
      { month: "Jan", amount: 10500000 },
      { month: "Feb", amount: 10900000 },
      { month: "Mar", amount: 11700000 }
    ],
    monthlyDebits: [
      { month: "Oct", amount: 9300000 },
      { month: "Nov", amount: 9100000 },
      { month: "Dec", amount: 10800000 },
      { month: "Jan", amount: 9800000 },
      { month: "Feb", amount: 10100000 },
      { month: "Mar", amount: 11200000 }
    ],
    averageBalance: 1120000,
    minBalance: 255000,
    maxBalance: 1870000,
    cashDepositRatio: 7,
    chequeBounceCount: 1,
    emiBounceCount: 0,
    inwardConsistency: 86,
    outwardConsistency: 82,
    topCounterparties: [
      { name: "Britannia Industries Ltd", credits: 0, debits: 16300000 },
      { name: "Metro Cash Buyers Pool", credits: 12200000, debits: 0 },
      { name: "Retailer Cluster - West", credits: 18400000, debits: 0 }
    ],
    abnormalSpikes: ["December inflow spike aligned with seasonal stocking"],
    seasonality: ["Festive quarter uplift visible but not erratic"],
    relatedPartySignals: ["One recurring transfer to promoter-linked entity under review"],
    healthScore: 78,
    extractionConfidence: 0.88
  },
  invoiceSummary: {
    invoiceNumber: "INV-440112",
    invoiceDate: "2026-03-05",
    supplierName: "Britannia Industries Ltd",
    buyerName: "Shree Ganesh Distributors LLP",
    supplierGstin: "29AAACB5382M1ZS",
    buyerGstin: "27ABAFS1234F1Z6",
    taxableValue: 1865000,
    taxBreakup: [
      { label: "CGST", amount: 167850 },
      { label: "SGST", amount: 167850 }
    ],
    totalValue: 2200700,
    hsnSac: ["190531", "190590"],
    lineItems: [
      { description: "Biscuits assorted cartons", quantity: 420, rate: 3200, amount: 1344000 },
      { description: "Cakes and rusks mixed stock", quantity: 155, rate: 3360, amount: 520800 }
    ],
    vehicleNumber: "MH12AB4455",
    eWayBillNumber: "281004455662",
    completenessScore: 91,
    authenticityScore: 81,
    flags: ["Vehicle number present", "Tax totals reconcile", "Invoice numbering consistent with prior pattern"],
    extractionConfidence: 0.86
  },
  tradeMatch: {
    status: "STRONG_MATCH",
    score: 84,
    checks: [
      {
        label: "Supplier and buyer identity",
        status: "match",
        detail: "GSTINs align with invoice and GST profile."
      },
      {
        label: "Taxable value and tax amount",
        status: "match",
        detail: "Invoice tax math reconciles within tolerance."
      },
      {
        label: "Shipment timing",
        status: "partial",
        detail: "Invoice and e-way bill timing align; delivery proof not uploaded."
      },
      {
        label: "Historical trading pattern",
        status: "match",
        detail: "Similar value bands observed in the last four months."
      }
    ],
    routePlausibility: "Supplier dispatch from Bengaluru to Pune is plausible for the anchor distribution network.",
    historicalRelationshipNote: "Anchor relationship and invoice value are consistent with prior seasonal replenishment cycles."
  },
  fraudFlags: [
    {
      code: "RELATED_PARTY_TRANSFER_REVIEW",
      severity: "AMBER",
      reason: "One recurring outward transfer resembles a promoter-linked entity and needs confirmation.",
      module: "Bank"
    },
    {
      code: "SINGLE_MINOR_DPD",
      severity: "GREEN",
      reason: "One historical 30-DPD event exists but was cured quickly.",
      module: "Bureau"
    }
  ],
  scores: [
    {
      key: "BUREAU",
      label: "Bureau Score",
      score: 84,
      weight: 25,
      grade: "B",
      rationale: "Strong bureau score with light enquiry activity and no recent severe delinquency.",
      breakdown: [
        {
          label: "Reported score",
          value: 88,
          weight: 0.45,
          impact: "positive",
          explanation: "Score of 772 sits well above policy comfort range.",
          source: "EXTRACTION"
        },
        {
          label: "DPD conduct",
          value: 72,
          weight: 0.3,
          impact: "positive",
          explanation: "Only one cured minor delinquency in observed history.",
          source: "RULES"
        },
        {
          label: "Credit mix",
          value: 78,
          weight: 0.15,
          impact: "positive",
          explanation: "Secured mix is healthy relative to unsecured exposure.",
          source: "RULES"
        },
        {
          label: "Enquiries",
          value: 80,
          weight: 0.1,
          impact: "neutral",
          explanation: "Enquiry count remains within policy tolerance.",
          source: "RULES"
        }
      ]
    },
    {
      key: "GST",
      label: "GST Health Score",
      score: 84,
      weight: 20,
      grade: "B",
      rationale: "Consistent filings, active GST registration, and healthy taxable value trends.",
      breakdown: [
        {
          label: "Registration status",
          value: 95,
          weight: 0.3,
          impact: "positive",
          explanation: "GSTIN is active and long-tenured.",
          source: "API"
        },
        {
          label: "Filing regularity",
          value: 92,
          weight: 0.35,
          impact: "positive",
          explanation: "No observed gaps in the latest six return periods.",
          source: "API"
        },
        {
          label: "Tax payment consistency",
          value: 89,
          weight: 0.2,
          impact: "positive",
          explanation: "Payments appear steady against declared turnover.",
          source: "API"
        },
        {
          label: "Business profile",
          value: 70,
          weight: 0.15,
          impact: "neutral",
          explanation: "Wholesale business type is acceptable but concentration on one anchor remains relevant.",
          source: "RULES"
        }
      ]
    },
    {
      key: "BANK",
      label: "Bank Statement Score",
      score: 78,
      weight: 25,
      grade: "B",
      rationale: "Cash flow is stable, though one bounce and a related-party looking transfer warrant review.",
      breakdown: [
        {
          label: "Inflow consistency",
          value: 86,
          weight: 0.35,
          impact: "positive",
          explanation: "Credits remain stable with growth into March.",
          source: "EXTRACTION"
        },
        {
          label: "Average balance",
          value: 73,
          weight: 0.2,
          impact: "positive",
          explanation: "Average balance supports a moderate working capital line.",
          source: "EXTRACTION"
        },
        {
          label: "Bounce behaviour",
          value: 64,
          weight: 0.25,
          impact: "negative",
          explanation: "One cheque return lowers the conduct view slightly.",
          source: "RULES"
        },
        {
          label: "Cash deposit dependence",
          value: 82,
          weight: 0.2,
          impact: "positive",
          explanation: "Low cash deposit dependence improves transparency.",
          source: "RULES"
        }
      ]
    },
    {
      key: "BUSINESS_STABILITY",
      label: "Business Stability Score",
      score: 80,
      weight: 15,
      grade: "B",
      rationale: "Anchor tenure, GST age, and repeat trade patterns support operating stability.",
      breakdown: [
        {
          label: "Anchor relationship",
          value: 88,
          weight: 0.4,
          impact: "positive",
          explanation: "Five-year anchor linkage reduces onboarding uncertainty.",
          source: "MANUAL"
        },
        {
          label: "Registration age",
          value: 84,
          weight: 0.25,
          impact: "positive",
          explanation: "GST registration vintage is strong for this borrower type.",
          source: "API"
        },
        {
          label: "Counterparty concentration",
          value: 60,
          weight: 0.35,
          impact: "negative",
          explanation: "Anchor concentration is material and needs exposure caps.",
          source: "RULES"
        }
      ]
    },
    {
      key: "FRAUD_INTEGRITY",
      label: "Fraud / Integrity Score",
      score: 74,
      weight: 15,
      grade: "C",
      rationale: "Core invoice and GST evidence look credible, but there is one related-party style transfer to explain.",
      breakdown: [
        {
          label: "Invoice authenticity",
          value: 81,
          weight: 0.4,
          impact: "positive",
          explanation: "Invoice is structurally consistent and mathematically sound.",
          source: "EXTRACTION"
        },
        {
          label: "Trade match",
          value: 84,
          weight: 0.25,
          impact: "positive",
          explanation: "Supplier and buyer relationship fits historical pattern.",
          source: "RULES"
        },
        {
          label: "Data confidence",
          value: 88,
          weight: 0.15,
          impact: "positive",
          explanation: "Critical document extraction confidence is high.",
          source: "EXTRACTION"
        },
        {
          label: "Integrity alerts",
          value: 52,
          weight: 0.2,
          impact: "negative",
          explanation: "Related-party looking transfer keeps the score below best-in-class.",
          source: "RULES"
        }
      ]
    },
    {
      key: "COMPOSITE",
      label: "Composite Underwriting Score",
      score: 80,
      weight: 100,
      grade: "B",
      rationale: "Balanced profile with good bureau, GST, and bank signals, offset by moderate concentration and one integrity review item.",
      breakdown: []
    },
    {
      key: "INVOICE_AUTHENTICITY",
      label: "Invoice Authenticity Score",
      score: 81,
      weight: 0,
      grade: "B",
      rationale: "Invoice completeness and math are good; delivery proof is still missing.",
      breakdown: []
    },
    {
      key: "TRADE_MATCH",
      label: "Trade Match Score",
      score: 84,
      weight: 0,
      grade: "B",
      rationale: "Trade evidence is directionally strong for this anchor-linked flow.",
      breakdown: []
    }
  ],
  decision: {
    compositeScore: 80,
    riskGrade: "B",
    recommendation: "APPROVE_WITH_CONDITIONS",
    recommendedLimit: 4200000,
    recommendedTenorDays: 45,
    pricingBand: "18.0% - 20.0%",
    collateralRequirement: "PG + transaction-level invoice control",
    confidence: 0.83,
    topPositiveDrivers: [
      {
        label: "Strong bureau score",
        impact: 18,
        explanation: "Score of 772 with no severe overdue history supports baseline repayment ability.",
        source: "RULES"
      },
      {
        label: "GST compliance is consistent",
        impact: 16,
        explanation: "Returns are current and taxable value trend is steady.",
        source: "RULES"
      },
      {
        label: "Anchor-linked trade pattern",
        impact: 12,
        explanation: "Invoice values and counterparty history fit the operating model.",
        source: "RULES"
      }
    ],
    topNegativeDrivers: [
      {
        label: "Counterparty concentration",
        impact: -11,
        explanation: "Large dependence on one anchor should cap facility sizing.",
        source: "RULES"
      },
      {
        label: "Related-party looking transfer",
        impact: -8,
        explanation: "Needs analyst confirmation before clean approval.",
        source: "RULES"
      }
    ],
    missingData: ["Delivery proof / POD not yet uploaded"],
    triggeredRules: [
      "Conditional approval if bank health moderate but anchor strong.",
      "Refer if invoice authenticity weak. Not triggered."
    ]
  },
  llmMemo: {
    summary:
      "The borrower shows a broadly financeable distributor profile with healthy bureau and GST conduct, stable banking trends, and credible anchor-linked trade activity. The recommendation should remain analyst-assisted because one related-party looking transfer and anchor concentration still require human judgment.",
    strengths: [
      "Bureau performance is comfortably above policy threshold.",
      "GST profile is active with regular filings and solid registration vintage.",
      "Bank statement trends support a moderate working-capital facility."
    ],
    risks: [
      "Business concentration around one anchor may amplify disruption risk.",
      "One transaction pattern resembles related-party movement and needs verification."
    ],
    contradictions: [
      "Bank health is strong enough for approval, but invoice evidence is still slightly less complete than the rest of the case."
    ],
    policyExceptions: [
      "Facility sizing should stay below peak monthly credits until related-party transfer explanation is obtained."
    ],
    nextQuestions: [
      "Request clarification and supporting proof for promoter-linked outward transfers.",
      "Confirm whether POD or warehouse receipt is available for the uploaded invoice.",
      "Validate latest stock statement if a higher limit is requested."
    ],
    disclaimer:
      "LLM narrative is advisory only. Final recommendation combines deterministic rules, scored variables, and analyst review.",
    modelVersion: "mock-llm-v1",
    promptVersion: "underwriting-memo-v1"
  },
  analystDecision: {
    recommendation: "APPROVE_WITH_CONDITIONS",
    overrideReason: "Limit trimmed below model output pending clarification on related-party transfer.",
    approvedLimit: 4000000,
    approvedTenorDays: 45,
    pricingBand: "18.5%",
    collateralRequirement: "PG + invoice assignment",
    analystNotes: [
      "Need evidence for promoter-linked transfer before first disbursal.",
      "Good candidate for anchor-based daily repayment structure."
    ]
  },
  timeline: [
    {
      timestamp: "2026-03-10T10:34:00.000Z",
      title: "Bureau uploaded",
      detail: "CIBIL report ingested and parsed."
    },
    {
      timestamp: "2026-03-10T10:38:00.000Z",
      title: "Bank analytics complete",
      detail: "6-month statement classified with 88% extraction confidence."
    },
    {
      timestamp: "2026-03-10T10:43:00.000Z",
      title: "GST API pulled",
      detail: "GST health normalized from third-party response."
    },
    {
      timestamp: "2026-03-10T10:47:00.000Z",
      title: "Underwriting memo generated",
      detail: "Composite score and LLM advisory memo refreshed."
    }
  ]
};

export const demoCaseList: CaseListItem[] = [
  {
    caseId: demoCaseWorkspace.caseId,
    caseNumber: demoCaseWorkspace.caseNumber,
    createdAt: demoCaseWorkspace.createdAt,
    borrowerName: demoCaseWorkspace.borrower.legalName,
    borrowerType: demoCaseWorkspace.borrower.borrowerType,
    anchorName: demoCaseWorkspace.borrower.anchorName,
    score: demoCaseWorkspace.decision.compositeScore,
    riskGrade: demoCaseWorkspace.decision.riskGrade,
    recommendation: demoCaseWorkspace.decision.recommendation,
    status: "REVIEW"
  },
  {
    caseId: "case_demo_002",
    caseNumber: "UW-IND-2026-002",
    createdAt: "2026-03-12T09:15:00.000Z",
    borrowerName: "Navkar Retail Ventures",
    borrowerType: "RETAILER",
    anchorName: "HUL",
    score: 66,
    riskGrade: "C",
    recommendation: "REFER_TO_ANALYST",
    status: "PROCESSING"
  },
  {
    caseId: "case_demo_003",
    caseNumber: "UW-IND-2026-003",
    createdAt: "2026-03-13T14:05:00.000Z",
    borrowerName: "Jupiter Industrial Supplies Pvt Ltd",
    borrowerType: "CORPORATE",
    anchorName: "Asian Paints",
    score: 47,
    riskGrade: "D",
    recommendation: "REJECT",
    status: "DECIDED"
  }
];

export const adminIntegrationStatus: AdminIntegrationStatus[] = [
  {
    key: "GST_API_BASE_URL",
    label: "GST Data Provider",
    value: process.env.GST_API_BASE_URL ? "Configured" : "Stub mode",
    description: "Third-party GST pull used to populate profile, filing behaviour, and turnover proxies.",
    status: process.env.GST_API_BASE_URL ? "configured" : "stub"
  },
  {
    key: "LLM_PROVIDER",
    label: "LLM Copilot",
    value: process.env.LLM_PROVIDER ?? "mock",
    description: "Provider abstraction for underwriting memo generation.",
    status: process.env.LLM_PROVIDER && process.env.LLM_PROVIDER !== "mock" ? "configured" : "stub"
  },
  {
    key: "APP_STORAGE_DIR",
    label: "Local File Storage",
    value: process.env.APP_STORAGE_DIR ?? "./storage/uploads",
    description: "Document uploads are persisted locally for the MVP and abstracted for future object storage.",
    status: "configured"
  }
];

export const availablePolicies: PolicyConfigRecord[] = Object.values(scoringWeightsByBorrowerType);

import type {
  AdminIntegrationStatus,
  AnalystDecisionState,
  BankAnalytics,
  BorrowerProfile,
  BureauSummary,
  CaseListItem,
  CaseWorkspaceData,
  DocumentRecord,
  ExtractedFieldRecord,
  GstSummary,
  InvoiceSummary,
  LlmMemo,
  ScoreCard,
  TradeMatchResult
} from "@/lib/types";
import { adminIntegrationStatus, demoCaseList, demoCaseWorkspace } from "@/lib/demo-data";
import { prisma } from "@/server/db";
import {
  getLocalAwareCaseList,
  isLocalDemoCase,
  loadLocalCaseWorkspace
} from "@/server/services/local-case-store";

function parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function mapBorrower(record: {
  id: string;
  legalName: string;
  displayName: string | null;
  borrowerType: "CORPORATE" | "DISTRIBUTOR" | "RETAILER";
  gstin: string | null;
  pan: string | null;
  state: string | null;
  anchorName: string | null;
  dealerCode: string | null;
  customerCode: string | null;
  metadata: unknown;
}): BorrowerProfile {
  return {
    id: record.id,
    legalName: record.legalName,
    displayName: record.displayName ?? undefined,
    borrowerType: record.borrowerType,
    gstin: record.gstin ?? undefined,
    pan: record.pan ?? undefined,
    state: record.state ?? undefined,
    anchorName: record.anchorName ?? undefined,
    dealerCode: record.dealerCode ?? undefined,
    customerCode: record.customerCode ?? undefined,
    metadata:
      typeof record.metadata === "object" && record.metadata !== null
        ? (record.metadata as Record<string, unknown>)
        : undefined
  };
}

function mapDocuments(records: Array<{
  id: string;
  type:
    | "BUREAU_REPORT"
    | "BANK_STATEMENT"
    | "GST_PULL"
    | "INVOICE"
    | "PURCHASE_ORDER"
    | "EWAY_BILL"
    | "OTHER";
  originalFileName: string;
  status: "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  createdAt: Date;
  extractionConfidence: number | null;
}>): DocumentRecord[] {
  return records.map((document) => ({
    id: document.id,
    type: document.type,
    name: document.originalFileName,
    status: document.status,
    uploadedAt: document.createdAt.toISOString(),
    extractionConfidence: document.extractionConfidence ?? undefined
  }));
}

function mapExtractedFields(records: Array<{
  section: string;
  fieldKey: string;
  valueString: string | null;
  valueNumber: number | null;
  confidence: number | null;
  correctedValueString: string | null;
  correctedValueNumber: number | null;
}>): ExtractedFieldRecord[] {
  return records.map((field) => ({
    section: field.section,
    field: field.fieldKey,
    value:
      field.valueString ??
      (field.valueNumber !== null && field.valueNumber !== undefined
        ? String(field.valueNumber)
        : "Not available"),
    confidence: field.confidence ?? 0.5,
    correctedValue:
      field.correctedValueString ??
      (field.correctedValueNumber !== null && field.correctedValueNumber !== undefined
        ? String(field.correctedValueNumber)
        : undefined)
  }));
}

function mapBureauSummary(record: {
  score: number | null;
  activeLoans: number;
  overdueHistory: number;
  dpdPatterns: unknown;
  creditUtilization: number | null;
  unsecuredMix: number;
  securedMix: number;
  enquiryCount: number;
  writtenOff: boolean;
  settled: boolean;
  loanVintageMonths: number;
  extractionConfidence: number;
} | null): BureauSummary | undefined {
  if (!record) {
    return undefined;
  }

  return {
    score: record.score,
    activeLoans: record.activeLoans,
    overdueHistory: record.overdueHistory,
    dpdPatterns: parseJsonArray<string>(record.dpdPatterns, []),
    creditUtilization: record.creditUtilization,
    unsecuredMix: record.unsecuredMix,
    securedMix: record.securedMix,
    enquiryCount: record.enquiryCount,
    writtenOff: record.writtenOff,
    settled: record.settled,
    loanVintageMonths: record.loanVintageMonths,
    extractionConfidence: record.extractionConfidence
  };
}

function mapGstSummary(record: {
  legalName: string;
  gstin: string;
  status: string;
  filingFrequency: string | null;
  filingRegularity: number;
  turnoverProxy: number;
  gstrTrends: unknown;
  taxPaymentConsistency: number;
  registrationAgeMonths: number;
  state: string | null;
  businessType: string | null;
  healthScore: number;
  rawResponse: unknown;
  processedResponse: unknown;
} | null): GstSummary | undefined {
  if (!record) {
    return undefined;
  }

  return {
    legalName: record.legalName,
    gstin: record.gstin,
    status:
      record.status === "ACTIVE" ||
      record.status === "INACTIVE" ||
      record.status === "CANCELLED"
        ? record.status
        : "UNKNOWN",
    filingFrequency: record.filingFrequency ?? "Unknown",
    filingRegularity: record.filingRegularity,
    turnoverProxy: record.turnoverProxy,
    gstrTrends: parseJsonArray(record.gstrTrends, []),
    taxPaymentConsistency: record.taxPaymentConsistency,
    registrationAgeMonths: record.registrationAgeMonths,
    state: record.state ?? "Unknown",
    businessType: record.businessType ?? "Unknown",
    healthScore: record.healthScore,
    rawResponse:
      typeof record.rawResponse === "object" && record.rawResponse !== null
        ? (record.rawResponse as Record<string, unknown>)
        : {},
    processedResponse:
      typeof record.processedResponse === "object" && record.processedResponse !== null
        ? (record.processedResponse as Record<string, unknown>)
        : {}
  };
}

function mapBankAnalytics(record: {
  monthlyCredits: unknown;
  monthlyDebits: unknown;
  averageBalance: number;
  minBalance: number;
  maxBalance: number;
  cashDepositRatio: number;
  chequeBounceCount: number;
  emiBounceCount: number;
  inwardConsistency: number;
  outwardConsistency: number;
  topCounterparties: unknown;
  abnormalSpikes: unknown;
  seasonality: unknown;
  relatedPartySignals: unknown;
  healthScore: number;
  extractionConfidence: number;
} | null): BankAnalytics | undefined {
  if (!record) {
    return undefined;
  }

  return {
    monthlyCredits: parseJsonArray(record.monthlyCredits, []),
    monthlyDebits: parseJsonArray(record.monthlyDebits, []),
    averageBalance: record.averageBalance,
    minBalance: record.minBalance,
    maxBalance: record.maxBalance,
    cashDepositRatio: record.cashDepositRatio,
    chequeBounceCount: record.chequeBounceCount,
    emiBounceCount: record.emiBounceCount,
    inwardConsistency: record.inwardConsistency,
    outwardConsistency: record.outwardConsistency,
    topCounterparties: parseJsonArray(record.topCounterparties, []),
    abnormalSpikes: parseJsonArray(record.abnormalSpikes, []),
    seasonality: parseJsonArray(record.seasonality, []),
    relatedPartySignals: parseJsonArray(record.relatedPartySignals, []),
    healthScore: record.healthScore,
    extractionConfidence: record.extractionConfidence
  };
}

function mapInvoiceSummary(record: {
  invoiceNumber: string;
  invoiceDate: Date | null;
  supplierName: string;
  buyerName: string;
  supplierGstin: string | null;
  buyerGstin: string | null;
  taxableValue: number;
  taxBreakup: unknown;
  totalValue: number;
  hsnSac: unknown;
  lineItems: unknown;
  vehicleNumber: string | null;
  eWayBillNumber: string | null;
  completenessScore: number;
  authenticityScore: number;
  anomalyFlags: unknown;
  processedPayload: unknown;
} | null): InvoiceSummary | undefined {
  if (!record) {
    return undefined;
  }

  return {
    invoiceNumber: record.invoiceNumber,
    invoiceDate: record.invoiceDate?.toISOString() ?? new Date().toISOString(),
    supplierName: record.supplierName,
    buyerName: record.buyerName,
    supplierGstin: record.supplierGstin ?? undefined,
    buyerGstin: record.buyerGstin ?? undefined,
    taxableValue: record.taxableValue,
    taxBreakup: parseJsonArray(record.taxBreakup, []),
    totalValue: record.totalValue,
    hsnSac: parseJsonArray(record.hsnSac, []),
    lineItems: parseJsonArray(record.lineItems, []),
    vehicleNumber: record.vehicleNumber ?? undefined,
    eWayBillNumber: record.eWayBillNumber ?? undefined,
    completenessScore: record.completenessScore,
    authenticityScore: record.authenticityScore,
    flags: parseJsonArray(record.anomalyFlags, []),
    extractionConfidence:
      typeof record.processedPayload === "object" &&
      record.processedPayload !== null &&
      "extractionConfidence" in (record.processedPayload as Record<string, unknown>)
        ? Number((record.processedPayload as Record<string, unknown>).extractionConfidence)
        : 0.75
  };
}

function mapTrade(record: {
  matchStatus: "STRONG_MATCH" | "PARTIAL_MATCH" | "MISMATCH" | "INSUFFICIENT_DATA";
  score: number;
  checks: unknown;
  routePlausibility: string | null;
  historicalNote: string | null;
} | null): TradeMatchResult | undefined {
  if (!record) {
    return undefined;
  }

  return {
    status: record.matchStatus,
    score: record.score,
    checks: parseJsonArray(record.checks, []),
    routePlausibility: record.routePlausibility ?? "No route data available.",
    historicalRelationshipNote: record.historicalNote ?? "No historical relationship note available."
  };
}

function mapScores(records: Array<{
  kind:
    | "BUREAU"
    | "GST"
    | "BANK"
    | "BUSINESS_STABILITY"
    | "CONDUCT"
    | "FRAUD_INTEGRITY"
    | "COMPOSITE"
    | "INVOICE_AUTHENTICITY"
    | "TRADE_MATCH";
  score: number;
  weight: number | null;
  riskGrade: "A" | "B" | "C" | "D" | "E" | null;
  rationale: string | null;
  breakdown: unknown;
}>): ScoreCard[] {
  return records.map((score) => ({
    key: score.kind,
    label: score.kind.replaceAll("_", " "),
    score: score.score,
    weight: score.weight ?? 0,
    grade: score.riskGrade ?? undefined,
    rationale: score.rationale ?? "",
    breakdown: parseJsonArray(score.breakdown, [])
  }));
}

function mapMemo(record: {
  summary: string;
  strengths: unknown;
  risks: unknown;
  contradictions: unknown;
  policyExceptions: unknown;
  nextQuestions: unknown;
  disclaimer: string;
  modelVersion: string;
  promptVersion: string;
} | null): LlmMemo {
  if (!record) {
    return {
      summary: "Underwriting memo has not been generated yet.",
      strengths: [],
      risks: [],
      contradictions: [],
      policyExceptions: [],
      nextQuestions: [],
      disclaimer:
        "LLM output is advisory only. Generate the memo after loading source evidence and scoring.",
      modelVersion: "not-run",
      promptVersion: "not-run"
    };
  }

  return {
    summary: record.summary,
    strengths: parseJsonArray(record.strengths, []),
    risks: parseJsonArray(record.risks, []),
    contradictions: parseJsonArray(record.contradictions, []),
    policyExceptions: parseJsonArray(record.policyExceptions, []),
    nextQuestions: parseJsonArray(record.nextQuestions, []),
    disclaimer: record.disclaimer,
    modelVersion: record.modelVersion,
    promptVersion: record.promptVersion
  };
}

function mapAnalystDecision(record: {
  recommendation:
    | "APPROVE"
    | "APPROVE_WITH_CONDITIONS"
    | "REFER_TO_ANALYST"
    | "REJECT";
  overrideReason: string | null;
  approvedLimit: number | null;
  approvedTenorDays: number | null;
  pricingBand: string | null;
  collateralRequirement: string | null;
} | null, notes: string[]): AnalystDecisionState {
  if (!record) {
    return {
      analystNotes: notes
    };
  }

  return {
    recommendation: record.recommendation,
    overrideReason: record.overrideReason ?? undefined,
    approvedLimit: record.approvedLimit ?? undefined,
    approvedTenorDays: record.approvedTenorDays ?? undefined,
    pricingBand: record.pricingBand ?? undefined,
    collateralRequirement: record.collateralRequirement ?? undefined,
    analystNotes: notes
  };
}

export async function getAllCases(): Promise<CaseListItem[]> {
  if (demoCaseList.length) {
    const fallbackCases = await getLocalAwareCaseList();
    try {
      const cases = await prisma.underwritingCase.findMany({
        include: {
          borrower: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      if (!cases.length) {
        return fallbackCases;
      }

      return cases.map((item) => ({
        caseId: item.id,
        caseNumber: item.caseNumber,
        createdAt: item.createdAt.toISOString(),
        borrowerName: item.borrower.legalName,
        borrowerType: item.borrower.borrowerType,
        anchorName: item.borrower.anchorName ?? undefined,
        score: Math.round(item.compositeScore ?? 0),
        riskGrade: item.riskGrade ?? "E",
        recommendation: item.recommendation ?? "REFER_TO_ANALYST",
        status: item.status
      }));
    } catch {
      return fallbackCases;
    }
  }

  try {
    const cases = await prisma.underwritingCase.findMany({
      include: {
        borrower: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!cases.length) {
      return demoCaseList;
    }

    return cases.map((item) => ({
      caseId: item.id,
      caseNumber: item.caseNumber,
      createdAt: item.createdAt.toISOString(),
      borrowerName: item.borrower.legalName,
      borrowerType: item.borrower.borrowerType,
      anchorName: item.borrower.anchorName ?? undefined,
      score: Math.round(item.compositeScore ?? 0),
      riskGrade: item.riskGrade ?? "E",
      recommendation: item.recommendation ?? "REFER_TO_ANALYST",
      status: item.status
    }));
  } catch {
    return demoCaseList;
  }
}

export async function getCaseWorkspace(caseId: string): Promise<CaseWorkspaceData> {
  if (isLocalDemoCase(caseId)) {
    const localWorkspace = await loadLocalCaseWorkspace(caseId);
    return localWorkspace ?? demoCaseWorkspace;
  }

  try {
    const caseRecord = await prisma.underwritingCase.findUnique({
      where: {
        id: caseId
      },
      include: {
        borrower: true,
        documents: {
          orderBy: {
            createdAt: "desc"
          }
        },
        extractedFields: true,
        bureauSummary: true,
        gstSummary: true,
        bankAnalytics: true,
        invoices: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        tradeChecks: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        fraudFlags: true,
        scores: true,
        llmMemos: {
          orderBy: {
            createdAt: "desc"
          },
          take: 1
        },
        analystDecisions: {
          orderBy: {
            decidedAt: "desc"
          },
          take: 1
        },
        notes: {
          orderBy: {
            createdAt: "desc"
          }
        },
        auditLogs: {
          orderBy: {
            createdAt: "desc"
          },
          take: 10
        }
      }
    });

    if (!caseRecord) {
      return demoCaseWorkspace;
    }

    return {
      caseId: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      createdAt: caseRecord.createdAt.toISOString(),
      borrower: mapBorrower(caseRecord.borrower),
      documents: mapDocuments(caseRecord.documents),
      extractedFields: mapExtractedFields(caseRecord.extractedFields),
      bureauSummary: mapBureauSummary(caseRecord.bureauSummary),
      gstSummary: mapGstSummary(caseRecord.gstSummary),
      bankAnalytics: mapBankAnalytics(caseRecord.bankAnalytics),
      invoiceSummary: mapInvoiceSummary(caseRecord.invoices[0] ?? null),
      tradeMatch: mapTrade(caseRecord.tradeChecks[0] ?? null),
      fraudFlags: caseRecord.fraudFlags.map((flag) => ({
        code: flag.code,
        severity: flag.severity,
        reason: flag.reason,
        module: flag.module
      })),
      scores: mapScores(caseRecord.scores),
      decision: {
        compositeScore: Math.round(caseRecord.compositeScore ?? 0),
        riskGrade: caseRecord.riskGrade ?? "E",
        recommendation: caseRecord.recommendation ?? "REFER_TO_ANALYST",
        recommendedLimit: Number(caseRecord.requestedAmount ?? 0),
        recommendedTenorDays: caseRecord.requestedTenorDays ?? 0,
        pricingBand: caseRecord.analystDecisions[0]?.pricingBand ?? "Pending analysis",
        collateralRequirement:
          caseRecord.analystDecisions[0]?.collateralRequirement ?? "Pending analysis",
        confidence: caseRecord.overallConfidence ?? 0,
        topPositiveDrivers: [],
        topNegativeDrivers: [],
        missingData: [],
        triggeredRules: []
      },
      llmMemo: mapMemo(caseRecord.llmMemos[0] ?? null),
      analystDecision: mapAnalystDecision(
        caseRecord.analystDecisions[0] ?? null,
        caseRecord.notes.map((note) => note.body)
      ),
      timeline: caseRecord.auditLogs.map((log) => ({
        timestamp: log.createdAt.toISOString(),
        title: log.action,
        detail: `${log.entityType} ${log.entityId}`
      }))
    };
  } catch {
    return demoCaseWorkspace;
  }
}

export async function getAdminIntegrationStatus(): Promise<AdminIntegrationStatus[]> {
  return adminIntegrationStatus;
}

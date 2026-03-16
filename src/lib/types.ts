export type BorrowerType = "CORPORATE" | "DISTRIBUTOR" | "RETAILER";
export type RiskGrade = "A" | "B" | "C" | "D" | "E";
export type Recommendation =
  | "APPROVE"
  | "APPROVE_WITH_CONDITIONS"
  | "REFER_TO_ANALYST"
  | "REJECT";
export type ScoreSource =
  | "RULES"
  | "MODEL"
  | "LLM"
  | "EXTRACTION"
  | "API"
  | "MANUAL";
export type DocumentType =
  | "BUREAU_REPORT"
  | "BANK_STATEMENT"
  | "GST_PULL"
  | "INVOICE"
  | "PURCHASE_ORDER"
  | "EWAY_BILL"
  | "OTHER";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
export type TradeMatchStatus =
  | "STRONG_MATCH"
  | "PARTIAL_MATCH"
  | "MISMATCH"
  | "INSUFFICIENT_DATA";
export type FraudSeverity = "RED" | "AMBER" | "GREEN";
export type ScoreKey =
  | "BUREAU"
  | "GST"
  | "BANK"
  | "BUSINESS_STABILITY"
  | "CONDUCT"
  | "FRAUD_INTEGRITY"
  | "COMPOSITE"
  | "INVOICE_AUTHENTICITY"
  | "TRADE_MATCH";

export interface BorrowerProfile {
  id: string;
  legalName: string;
  displayName?: string;
  borrowerType: BorrowerType;
  gstin?: string;
  pan?: string;
  state?: string;
  anchorName?: string;
  dealerCode?: string;
  customerCode?: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentRecord {
  id: string;
  type: DocumentType;
  name: string;
  status: DocumentStatus;
  uploadedAt: string;
  extractionConfidence?: number;
  notes?: string;
}

export interface ExtractedFieldRecord {
  section: string;
  field: string;
  value: string;
  confidence: number;
  correctedValue?: string;
}

export interface ScoreBreakdownItem {
  label: string;
  value: number;
  weight: number;
  impact: "positive" | "negative" | "neutral";
  explanation: string;
  source: ScoreSource;
}

export interface ScoreCard {
  key: ScoreKey;
  label: string;
  score: number;
  weight: number;
  grade?: RiskGrade;
  rationale: string;
  breakdown: ScoreBreakdownItem[];
}

export interface Driver {
  label: string;
  impact: number;
  explanation: string;
  source: ScoreSource;
}

export interface BureauSummary {
  score: number | null;
  activeLoans: number;
  overdueHistory: number;
  dpdPatterns: string[];
  creditUtilization: number | null;
  unsecuredMix: number;
  securedMix: number;
  enquiryCount: number;
  writtenOff: boolean;
  settled: boolean;
  loanVintageMonths: number;
  extractionConfidence: number;
}

export interface GstTrend {
  period: string;
  filed: boolean;
  taxableValue: number;
}

export interface GstSummary {
  legalName: string;
  gstin: string;
  status: "ACTIVE" | "INACTIVE" | "CANCELLED" | "UNKNOWN";
  filingFrequency: string;
  filingRegularity: number;
  turnoverProxy: number;
  gstrTrends: GstTrend[];
  taxPaymentConsistency: number;
  registrationAgeMonths: number;
  state: string;
  businessType: string;
  healthScore: number;
  rawResponse: Record<string, unknown>;
  processedResponse: Record<string, unknown>;
}

export interface MonthlySeriesPoint {
  month: string;
  amount: number;
}

export interface CounterpartySummary {
  name: string;
  credits: number;
  debits: number;
}

export interface BankAnalytics {
  monthlyCredits: MonthlySeriesPoint[];
  monthlyDebits: MonthlySeriesPoint[];
  averageBalance: number;
  minBalance: number;
  maxBalance: number;
  cashDepositRatio: number;
  chequeBounceCount: number;
  emiBounceCount: number;
  inwardConsistency: number;
  outwardConsistency: number;
  topCounterparties: CounterpartySummary[];
  abnormalSpikes: string[];
  seasonality: string[];
  relatedPartySignals: string[];
  healthScore: number;
  extractionConfidence: number;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface TaxBreakupItem {
  label: string;
  amount: number;
}

export interface InvoiceSummary {
  invoiceNumber: string;
  invoiceDate: string;
  supplierName: string;
  buyerName: string;
  supplierGstin?: string;
  buyerGstin?: string;
  taxableValue: number;
  taxBreakup: TaxBreakupItem[];
  totalValue: number;
  hsnSac: string[];
  lineItems: InvoiceLineItem[];
  vehicleNumber?: string;
  eWayBillNumber?: string;
  completenessScore: number;
  authenticityScore: number;
  flags: string[];
  extractionConfidence: number;
}

export interface TradeCheck {
  label: string;
  status: "match" | "partial" | "mismatch" | "missing";
  detail: string;
}

export interface TradeMatchResult {
  status: TradeMatchStatus;
  score: number;
  checks: TradeCheck[];
  routePlausibility: string;
  historicalRelationshipNote: string;
}

export interface FraudFlag {
  code: string;
  severity: FraudSeverity;
  reason: string;
  module: string;
}

export interface LlmMemo {
  summary: string;
  strengths: string[];
  risks: string[];
  contradictions: string[];
  policyExceptions: string[];
  nextQuestions: string[];
  disclaimer: string;
  modelVersion: string;
  promptVersion: string;
}

export interface DecisionRecommendation {
  compositeScore: number;
  riskGrade: RiskGrade;
  recommendation: Recommendation;
  recommendedLimit: number;
  recommendedTenorDays: number;
  pricingBand: string;
  collateralRequirement: string;
  confidence: number;
  topPositiveDrivers: Driver[];
  topNegativeDrivers: Driver[];
  missingData: string[];
  triggeredRules: string[];
}

export interface AnalystDecisionState {
  recommendation?: Recommendation;
  overrideReason?: string;
  approvedLimit?: number;
  approvedTenorDays?: number;
  pricingBand?: string;
  collateralRequirement?: string;
  analystNotes: string[];
}

export interface TimelineItem {
  timestamp: string;
  title: string;
  detail: string;
}

export interface AdminIntegrationStatus {
  key: string;
  label: string;
  value: string;
  description: string;
  status: "configured" | "stub" | "missing";
}

export interface PolicyConfigRecord {
  borrowerType: BorrowerType;
  version: string;
  weights: Record<string, number>;
  rules: string[];
}

export interface CaseWorkspaceData {
  caseId: string;
  caseNumber: string;
  createdAt: string;
  borrower: BorrowerProfile;
  documents: DocumentRecord[];
  extractedFields: ExtractedFieldRecord[];
  bureauSummary?: BureauSummary;
  gstSummary?: GstSummary;
  bankAnalytics?: BankAnalytics;
  invoiceSummary?: InvoiceSummary;
  tradeMatch?: TradeMatchResult;
  fraudFlags: FraudFlag[];
  scores: ScoreCard[];
  decision: DecisionRecommendation;
  llmMemo: LlmMemo;
  analystDecision: AnalystDecisionState;
  timeline: TimelineItem[];
}

export interface CaseListItem {
  caseId: string;
  caseNumber: string;
  createdAt: string;
  borrowerName: string;
  borrowerType: BorrowerType;
  anchorName?: string;
  score: number;
  riskGrade: RiskGrade;
  recommendation: Recommendation;
  status: string;
}

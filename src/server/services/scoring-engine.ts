import { getPolicyConfig } from "@/config/policy";
import type {
  BankAnalytics,
  BorrowerProfile,
  BureauSummary,
  DecisionRecommendation,
  FraudFlag,
  GstSummary,
  InvoiceSummary,
  ScoreBreakdownItem,
  ScoreCard,
  TradeMatchResult
} from "@/lib/types";
import { clamp, gradeFromScore } from "@/lib/utils";

function subScore(label: string, score: number, weight: number, rationale: string, breakdown: ScoreBreakdownItem[]): ScoreCard {
  return {
    key: label as ScoreCard["key"],
    label: label.replaceAll("_", " "),
    score: Math.round(score),
    weight,
    grade: gradeFromScore(score),
    rationale,
    breakdown
  };
}

function bureauScore(summary?: BureauSummary): ScoreCard {
  if (!summary) {
    return subScore("BUREAU", 35, 25, "Bureau report missing; score held conservatively.", [
      {
        label: "Missing bureau evidence",
        value: 35,
        weight: 1,
        impact: "negative",
        explanation: "No bureau report available for structured evaluation.",
        source: "RULES"
      }
    ]);
  }

  const score = clamp(
    (summary.score ?? 600) / 900 * 70 +
      Math.max(0, 10 - summary.overdueHistory * 8) +
      Math.max(0, 8 - summary.enquiryCount) +
      Math.max(0, 12 - (summary.creditUtilization ?? 45) * 0.15) -
      (summary.writtenOff ? 22 : 0) -
      (summary.settled ? 10 : 0),
    0,
    100
  );

  return subScore("BUREAU", score, 25, "Bureau risk reflects score quality, conduct, utilization, and derogatory markers.", [
    {
      label: "Reported bureau score",
      value: clamp((summary.score ?? 600) / 9, 0, 100),
      weight: 0.45,
      impact: "positive",
      explanation: "Higher bureau score improves baseline repayment confidence.",
      source: "EXTRACTION"
    },
    {
      label: "Overdue history",
      value: clamp(100 - summary.overdueHistory * 20, 0, 100),
      weight: 0.25,
      impact: summary.overdueHistory > 0 ? "negative" : "positive",
      explanation: "Recent overdue behaviour directly affects conduct comfort.",
      source: "RULES"
    },
    {
      label: "Utilization",
      value: clamp(100 - (summary.creditUtilization ?? 50), 0, 100),
      weight: 0.2,
      impact: "neutral",
      explanation: "Higher revolving utilization compresses headroom.",
      source: "RULES"
    },
    {
      label: "Derogatory markers",
      value: summary.writtenOff || summary.settled ? 25 : 90,
      weight: 0.1,
      impact: summary.writtenOff || summary.settled ? "negative" : "positive",
      explanation: "Written-off and settled histories trigger material policy concern.",
      source: "RULES"
    }
  ]);
}

function gstScore(summary?: GstSummary): ScoreCard {
  if (!summary) {
    return subScore("GST", 40, 20, "GST data missing; score held conservatively.", [
      {
        label: "Missing GST evidence",
        value: 40,
        weight: 1,
        impact: "negative",
        explanation: "No GST profile available for compliance assessment.",
        source: "RULES"
      }
    ]);
  }

  const score = clamp(
    summary.healthScore * 0.55 +
      summary.filingRegularity * 0.2 +
      summary.taxPaymentConsistency * 0.15 +
      Math.min(summary.registrationAgeMonths, 120) / 120 * 10 -
      (summary.status !== "ACTIVE" ? 30 : 0),
    0,
    100
  );

  return subScore("GST", score, 20, "GST score reflects status, filing discipline, tax consistency, and business tenure.", [
    {
      label: "GST status",
      value: summary.status === "ACTIVE" ? 95 : 20,
      weight: 0.3,
      impact: summary.status === "ACTIVE" ? "positive" : "negative",
      explanation: "Inactive GST status is a hard warning for invoice-backed finance.",
      source: "API"
    },
    {
      label: "Filing regularity",
      value: summary.filingRegularity,
      weight: 0.35,
      impact: "positive",
      explanation: "Regular return filing supports operational discipline.",
      source: "API"
    },
    {
      label: "Tax payment consistency",
      value: summary.taxPaymentConsistency,
      weight: 0.2,
      impact: "positive",
      explanation: "Steady tax payment behaviour reduces reporting concern.",
      source: "API"
    },
    {
      label: "Registration age",
      value: clamp(summary.registrationAgeMonths / 1.2, 0, 100),
      weight: 0.15,
      impact: "neutral",
      explanation: "Longer registration history increases stability confidence.",
      source: "API"
    }
  ]);
}

function bankScore(analytics?: BankAnalytics): ScoreCard {
  if (!analytics) {
    return subScore("BANK", 38, 25, "Bank statement missing; score held conservatively.", [
      {
        label: "Missing bank evidence",
        value: 38,
        weight: 1,
        impact: "negative",
        explanation: "No bank statement available for cash flow analysis.",
        source: "RULES"
      }
    ]);
  }

  const score = clamp(
    analytics.healthScore * 0.55 +
      analytics.inwardConsistency * 0.2 +
      analytics.outwardConsistency * 0.1 +
      Math.min(analytics.averageBalance / 200000, 10) -
      analytics.chequeBounceCount * 6 -
      analytics.emiBounceCount * 8 -
      Math.min(analytics.cashDepositRatio, 25) * 0.5,
    0,
    100
  );

  return subScore("BANK", score, 25, "Bank score reflects cash-flow consistency, liquidity, and conduct flags.", [
    {
      label: "Modelled bank health",
      value: analytics.healthScore,
      weight: 0.4,
      impact: "positive",
      explanation: "Statement-derived health is the base bank underwriting signal.",
      source: "EXTRACTION"
    },
    {
      label: "Liquidity buffer",
      value: clamp(analytics.averageBalance / 25000, 0, 100),
      weight: 0.2,
      impact: "positive",
      explanation: "Average balance contributes to working capital resilience.",
      source: "EXTRACTION"
    },
    {
      label: "Bounce behaviour",
      value: clamp(100 - analytics.chequeBounceCount * 18 - analytics.emiBounceCount * 25, 0, 100),
      weight: 0.25,
      impact: analytics.chequeBounceCount + analytics.emiBounceCount > 0 ? "negative" : "positive",
      explanation: "Return and bounce events materially influence conduct comfort.",
      source: "RULES"
    },
    {
      label: "Cash handling transparency",
      value: clamp(100 - analytics.cashDepositRatio * 2, 0, 100),
      weight: 0.15,
      impact: analytics.cashDepositRatio > 15 ? "negative" : "positive",
      explanation: "Lower cash dependency improves data transparency.",
      source: "RULES"
    }
  ]);
}

function businessStabilityScore(borrower: BorrowerProfile, gstSummary?: GstSummary): ScoreCard {
  const anchorBoost = borrower.anchorName ? 18 : 6;
  const tenureBoost = gstSummary ? Math.min(gstSummary.registrationAgeMonths / 5, 18) : 6;
  const metadataBoost =
    typeof borrower.metadata?.yearsWithAnchor === "number" ? Math.min(Number(borrower.metadata.yearsWithAnchor) * 2, 16) : 6;
  const concentrationPenalty = borrower.anchorName ? 8 : 2;
  const score = clamp(42 + anchorBoost + tenureBoost + metadataBoost - concentrationPenalty, 0, 100);

  return subScore("BUSINESS_STABILITY", score, 15, "Business stability uses anchor context, operating tenure, and concentration heuristics.", [
    {
      label: "Anchor relationship",
      value: borrower.anchorName ? 88 : 55,
      weight: 0.45,
      impact: borrower.anchorName ? "positive" : "neutral",
      explanation: "Known anchor programs can reduce commercial uncertainty.",
      source: "MANUAL"
    },
    {
      label: "Operating vintage",
      value: gstSummary ? clamp(gstSummary.registrationAgeMonths / 1.2, 0, 100) : 45,
      weight: 0.3,
      impact: "positive",
      explanation: "Older operating history improves survival confidence.",
      source: "RULES"
    },
    {
      label: "Concentration risk",
      value: borrower.anchorName ? 62 : 70,
      weight: 0.25,
      impact: borrower.anchorName ? "negative" : "neutral",
      explanation: "Anchor dependence still needs exposure discipline.",
      source: "RULES"
    }
  ]);
}

function fraudIntegrityScore(
  flags: FraudFlag[],
  invoice?: InvoiceSummary,
  tradeMatch?: TradeMatchResult,
  extractionConfidence = 0.8
): ScoreCard {
  const redCount = flags.filter((flag) => flag.severity === "RED").length;
  const amberCount = flags.filter((flag) => flag.severity === "AMBER").length;
  const score = clamp(
    82 +
      ((invoice?.authenticityScore ?? 60) - 60) * 0.3 +
      ((tradeMatch?.score ?? 50) - 50) * 0.25 +
      extractionConfidence * 12 -
      redCount * 20 -
      amberCount * 8,
    0,
    100
  );

  return subScore("FRAUD_INTEGRITY", score, 15, "Fraud and integrity score combines invoice authenticity, trade evidence, extraction confidence, and flags.", [
    {
      label: "Invoice authenticity",
      value: invoice?.authenticityScore ?? 50,
      weight: 0.35,
      impact: invoice && invoice.authenticityScore >= 70 ? "positive" : "negative",
      explanation: "Invoice structure quality is a core integrity control.",
      source: "EXTRACTION"
    },
    {
      label: "Trade match strength",
      value: tradeMatch?.score ?? 40,
      weight: 0.25,
      impact: tradeMatch && tradeMatch.score >= 70 ? "positive" : "negative",
      explanation: "Cross-document consistency improves fraud comfort.",
      source: "RULES"
    },
    {
      label: "Data confidence",
      value: clamp(extractionConfidence * 100, 0, 100),
      weight: 0.15,
      impact: extractionConfidence >= 0.7 ? "positive" : "negative",
      explanation: "Low extraction confidence requires analyst review.",
      source: "EXTRACTION"
    },
    {
      label: "Flag burden",
      value: clamp(100 - redCount * 35 - amberCount * 15, 0, 100),
      weight: 0.25,
      impact: redCount + amberCount > 0 ? "negative" : "positive",
      explanation: "Accumulated fraud and integrity flags reduce straight-through comfort.",
      source: "RULES"
    }
  ]);
}

export function computeUnderwritingDecision(input: {
  borrower: BorrowerProfile;
  bureauSummary?: BureauSummary;
  gstSummary?: GstSummary;
  bankAnalytics?: BankAnalytics;
  invoiceSummary?: InvoiceSummary;
  tradeMatch?: TradeMatchResult;
  fraudFlags: FraudFlag[];
  extractionConfidence?: number;
}): {
  scores: ScoreCard[];
  decision: DecisionRecommendation;
} {
  const policy = getPolicyConfig(input.borrower.borrowerType);
  const bureau = bureauScore(input.bureauSummary);
  const gst = gstScore(input.gstSummary);
  const bank = bankScore(input.bankAnalytics);
  const businessStability = businessStabilityScore(input.borrower, input.gstSummary);
  const fraudIntegrity = fraudIntegrityScore(
    input.fraudFlags,
    input.invoiceSummary,
    input.tradeMatch,
    input.extractionConfidence
  );
  const composite = Math.round(
    bureau.score * 0.25 +
      gst.score * 0.2 +
      bank.score * 0.25 +
      businessStability.score * 0.15 +
      fraudIntegrity.score * 0.15
  );
  const severeOverdue = (input.bureauSummary?.overdueHistory ?? 0) >= 2 || input.bureauSummary?.writtenOff;
  const gstInactive = input.gstSummary && input.gstSummary.status !== "ACTIVE";
  const lowConfidence = (input.extractionConfidence ?? 0.8) < 0.55;
  const weakInvoice = input.invoiceSummary && input.invoiceSummary.authenticityScore < 55;

  let recommendation: DecisionRecommendation["recommendation"] = "REFER_TO_ANALYST";
  const triggeredRules: string[] = [];

  if (severeOverdue) {
    recommendation = "REJECT";
    triggeredRules.push("Auto reject: severe overdue history or written-off indicator.");
  }

  if (gstInactive) {
    recommendation = "REJECT";
    triggeredRules.push("Auto reject: GST inactive or cancelled.");
  }

  if (lowConfidence && recommendation !== "REJECT") {
    recommendation = "REFER_TO_ANALYST";
    triggeredRules.push("Refer: critical extraction confidence too low.");
  }

  if (weakInvoice && recommendation !== "REJECT") {
    recommendation = "REFER_TO_ANALYST";
    triggeredRules.push("Refer: invoice authenticity below threshold.");
  }

  if (recommendation === "REFER_TO_ANALYST") {
    if (composite >= 78) {
      recommendation =
        input.borrower.anchorName && (input.bankAnalytics?.healthScore ?? 0) >= 65
          ? "APPROVE_WITH_CONDITIONS"
          : "REFER_TO_ANALYST";
      if (recommendation === "APPROVE_WITH_CONDITIONS") {
        triggeredRules.push("Conditional approval: anchor strength offsets moderate bank risk.");
      }
    } else if (composite >= 85) {
      recommendation = "APPROVE";
    } else if (composite < 52) {
      recommendation = "REJECT";
    }
  }

  const riskGrade = gradeFromScore(composite);
  const recommendedLimit = Math.round(
    Math.max((input.bankAnalytics?.monthlyCredits[0]?.amount ?? 2500000) * 0.35, 1500000)
  );
  const recommendedTenorDays = riskGrade === "A" ? 60 : riskGrade === "B" ? 45 : riskGrade === "C" ? 30 : 21;
  const pricingBand =
    riskGrade === "A"
      ? "15.0% - 17.0%"
      : riskGrade === "B"
        ? "17.5% - 20.0%"
        : riskGrade === "C"
          ? "20.0% - 24.0%"
          : "Policy exception required";
  const collateralRequirement =
    recommendation === "APPROVE"
      ? "Transactional invoice control"
      : recommendation === "APPROVE_WITH_CONDITIONS"
        ? "PG + invoice / receivable control"
        : recommendation === "REJECT"
          ? "Not applicable"
          : "Analyst to determine";

  const topPositiveDrivers = [
    ...bureau.breakdown,
    ...gst.breakdown,
    ...bank.breakdown,
    ...businessStability.breakdown,
    ...fraudIntegrity.breakdown
  ]
    .filter((item) => item.impact === "positive")
    .sort((left, right) => right.value * right.weight - left.value * left.weight)
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      impact: Math.round(item.value * item.weight),
      explanation: item.explanation,
      source: item.source
    }));

  const topNegativeDrivers = [
    ...bureau.breakdown,
    ...gst.breakdown,
    ...bank.breakdown,
    ...businessStability.breakdown,
    ...fraudIntegrity.breakdown
  ]
    .filter((item) => item.impact === "negative")
    .sort((left, right) => right.weight * (100 - right.value) - left.weight * (100 - left.value))
    .slice(0, 3)
    .map((item) => ({
      label: item.label,
      impact: -Math.round((100 - item.value) * item.weight),
      explanation: item.explanation,
      source: item.source
    }));

  const missingData = [
    ...(input.bureauSummary ? [] : ["Bureau report missing"]),
    ...(input.gstSummary ? [] : ["GST data not yet pulled"]),
    ...(input.bankAnalytics ? [] : ["Bank statement missing"]),
    ...(input.invoiceSummary ? [] : ["Invoice not yet uploaded"])
  ];

  const scores: ScoreCard[] = [
    bureau,
    gst,
    bank,
    businessStability,
    fraudIntegrity,
    {
      key: "COMPOSITE",
      label: "Composite Underwriting Score",
      score: composite,
      weight: 100,
      grade: riskGrade,
      rationale: `Composite decision generated using ${policy.version} policy weights.`,
      breakdown: []
    },
    {
      key: "INVOICE_AUTHENTICITY",
      label: "Invoice Authenticity Score",
      score: input.invoiceSummary?.authenticityScore ?? 0,
      weight: 0,
      grade: gradeFromScore(input.invoiceSummary?.authenticityScore ?? 0),
      rationale: "Invoice-specific authenticity view for the trade module.",
      breakdown: []
    },
    {
      key: "TRADE_MATCH",
      label: "Trade Match Score",
      score: input.tradeMatch?.score ?? 0,
      weight: 0,
      grade: gradeFromScore(input.tradeMatch?.score ?? 0),
      rationale: "Trade matching score does not override underwriting on its own.",
      breakdown: []
    }
  ];

  return {
    scores,
    decision: {
      compositeScore: composite,
      riskGrade,
      recommendation,
      recommendedLimit,
      recommendedTenorDays,
      pricingBand,
      collateralRequirement,
      confidence: clamp((input.extractionConfidence ?? 0.8) * 0.65 + composite / 100 * 0.35, 0.35, 0.96),
      topPositiveDrivers,
      topNegativeDrivers,
      missingData,
      triggeredRules: triggeredRules.length ? triggeredRules : policy.rules.slice(0, 2)
    }
  };
}

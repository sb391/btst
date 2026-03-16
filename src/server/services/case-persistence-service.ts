import type {
  BankAnalytics,
  BureauSummary,
  DecisionRecommendation,
  ExtractedFieldRecord,
  FraudFlag,
  GstSummary,
  InvoiceSummary,
  LlmMemo,
  ScoreCard,
  TradeMatchResult
} from "@/lib/types";
import { prisma } from "@/server/db";
import { toPrismaJson } from "@/server/prisma-json";

export async function persistExtractedFields(
  caseId: string,
  section: string,
  fields: ExtractedFieldRecord[]
) {
  await prisma.extractedField.deleteMany({
    where: {
      caseId,
      section
    }
  });

  if (!fields.length) {
    return;
  }

  await prisma.extractedField.createMany({
    data: fields.map((field) => ({
      caseId,
      section: field.section,
      fieldKey: field.field,
      valueString: field.value,
      confidence: field.confidence
    }))
  });
}

export async function persistBureauSummary(caseId: string, summary: BureauSummary) {
  await prisma.bureauSummary.upsert({
    where: { caseId },
    update: {
      score: summary.score ?? undefined,
      activeLoans: summary.activeLoans,
      overdueHistory: summary.overdueHistory,
      dpdPatterns: toPrismaJson(summary.dpdPatterns),
      creditUtilization: summary.creditUtilization ?? undefined,
      unsecuredMix: summary.unsecuredMix,
      securedMix: summary.securedMix,
      enquiryCount: summary.enquiryCount,
      writtenOff: summary.writtenOff,
      settled: summary.settled,
      loanVintageMonths: summary.loanVintageMonths,
      extractionConfidence: summary.extractionConfidence,
      processedPayload: toPrismaJson(summary)
    },
    create: {
      caseId,
      score: summary.score ?? undefined,
      activeLoans: summary.activeLoans,
      overdueHistory: summary.overdueHistory,
      dpdPatterns: toPrismaJson(summary.dpdPatterns),
      creditUtilization: summary.creditUtilization ?? undefined,
      unsecuredMix: summary.unsecuredMix,
      securedMix: summary.securedMix,
      enquiryCount: summary.enquiryCount,
      writtenOff: summary.writtenOff,
      settled: summary.settled,
      loanVintageMonths: summary.loanVintageMonths,
      extractionConfidence: summary.extractionConfidence,
      rawPayload: toPrismaJson(summary),
      processedPayload: toPrismaJson(summary)
    }
  });
}

export async function persistGstSummary(caseId: string, summary: GstSummary) {
  await prisma.gstSummary.upsert({
    where: { caseId },
    update: {
      legalName: summary.legalName,
      gstin: summary.gstin,
      status: summary.status,
      filingFrequency: summary.filingFrequency,
      filingRegularity: summary.filingRegularity,
      turnoverProxy: summary.turnoverProxy,
      gstrTrends: toPrismaJson(summary.gstrTrends),
      taxPaymentConsistency: summary.taxPaymentConsistency,
      registrationAgeMonths: summary.registrationAgeMonths,
      state: summary.state,
      businessType: summary.businessType,
      healthScore: summary.healthScore,
      rawResponse: toPrismaJson(summary.rawResponse),
      processedResponse: toPrismaJson(summary.processedResponse)
    },
    create: {
      caseId,
      legalName: summary.legalName,
      gstin: summary.gstin,
      status: summary.status,
      filingFrequency: summary.filingFrequency,
      filingRegularity: summary.filingRegularity,
      turnoverProxy: summary.turnoverProxy,
      gstrTrends: toPrismaJson(summary.gstrTrends),
      taxPaymentConsistency: summary.taxPaymentConsistency,
      registrationAgeMonths: summary.registrationAgeMonths,
      state: summary.state,
      businessType: summary.businessType,
      healthScore: summary.healthScore,
      rawResponse: toPrismaJson(summary.rawResponse),
      processedResponse: toPrismaJson(summary.processedResponse)
    }
  });
}

export async function persistBankAnalytics(caseId: string, analytics: BankAnalytics) {
  await prisma.bankAnalytics.upsert({
    where: { caseId },
    update: {
      monthlyCredits: toPrismaJson(analytics.monthlyCredits),
      monthlyDebits: toPrismaJson(analytics.monthlyDebits),
      cashDepositRatio: analytics.cashDepositRatio,
      chequeBounceCount: analytics.chequeBounceCount,
      emiBounceCount: analytics.emiBounceCount,
      averageBalance: analytics.averageBalance,
      minBalance: analytics.minBalance,
      maxBalance: analytics.maxBalance,
      inwardConsistency: analytics.inwardConsistency,
      outwardConsistency: analytics.outwardConsistency,
      topCounterparties: toPrismaJson(analytics.topCounterparties),
      abnormalSpikes: toPrismaJson(analytics.abnormalSpikes),
      seasonality: toPrismaJson(analytics.seasonality),
      relatedPartySignals: toPrismaJson(analytics.relatedPartySignals),
      healthScore: analytics.healthScore,
      extractionConfidence: analytics.extractionConfidence,
      processedPayload: toPrismaJson(analytics)
    },
    create: {
      caseId,
      monthlyCredits: toPrismaJson(analytics.monthlyCredits),
      monthlyDebits: toPrismaJson(analytics.monthlyDebits),
      cashDepositRatio: analytics.cashDepositRatio,
      chequeBounceCount: analytics.chequeBounceCount,
      emiBounceCount: analytics.emiBounceCount,
      averageBalance: analytics.averageBalance,
      minBalance: analytics.minBalance,
      maxBalance: analytics.maxBalance,
      inwardConsistency: analytics.inwardConsistency,
      outwardConsistency: analytics.outwardConsistency,
      topCounterparties: toPrismaJson(analytics.topCounterparties),
      abnormalSpikes: toPrismaJson(analytics.abnormalSpikes),
      seasonality: toPrismaJson(analytics.seasonality),
      relatedPartySignals: toPrismaJson(analytics.relatedPartySignals),
      healthScore: analytics.healthScore,
      extractionConfidence: analytics.extractionConfidence,
      rawPayload: toPrismaJson(analytics),
      processedPayload: toPrismaJson(analytics)
    }
  });
}

export async function persistInvoiceSummary(caseId: string, invoice: InvoiceSummary) {
  await prisma.invoiceRecord.deleteMany({
    where: { caseId }
  });

  await prisma.invoiceRecord.create({
    data: {
      caseId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: new Date(invoice.invoiceDate),
      supplierName: invoice.supplierName,
      buyerName: invoice.buyerName,
      supplierGstin: invoice.supplierGstin,
      buyerGstin: invoice.buyerGstin,
      taxableValue: invoice.taxableValue,
      taxBreakup: toPrismaJson(invoice.taxBreakup),
      totalValue: invoice.totalValue,
      hsnSac: toPrismaJson(invoice.hsnSac),
      lineItems: toPrismaJson(invoice.lineItems),
      vehicleNumber: invoice.vehicleNumber,
      eWayBillNumber: invoice.eWayBillNumber,
      completenessScore: invoice.completenessScore,
      authenticityScore: invoice.authenticityScore,
      anomalyFlags: toPrismaJson(invoice.flags),
      rawPayload: toPrismaJson(invoice),
      processedPayload: toPrismaJson({
        extractionConfidence: invoice.extractionConfidence
      })
    }
  });
}

export async function persistTradeMatch(caseId: string, tradeMatch: TradeMatchResult) {
  await prisma.tradeVerification.deleteMany({
    where: { caseId }
  });

  await prisma.tradeVerification.create({
    data: {
      caseId,
      matchStatus: tradeMatch.status,
      score: tradeMatch.score,
      checks: toPrismaJson(tradeMatch.checks),
      routePlausibility: tradeMatch.routePlausibility,
      historicalNote: tradeMatch.historicalRelationshipNote,
      rawPayload: toPrismaJson(tradeMatch)
    }
  });
}

export async function persistFraudFlags(caseId: string, flags: FraudFlag[]) {
  await prisma.fraudFlag.deleteMany({
    where: { caseId }
  });

  if (!flags.length) {
    return;
  }

  await prisma.fraudFlag.createMany({
    data: flags.map((flag) => ({
      caseId,
      code: flag.code,
      severity: flag.severity,
      reason: flag.reason,
      module: flag.module
    }))
  });
}

export async function persistUnderwritingOutputs(
  caseId: string,
  output: {
    scores: ScoreCard[];
    decision: DecisionRecommendation;
    llmMemo: LlmMemo;
  }
) {
  await prisma.scoreSnapshot.deleteMany({
    where: { caseId }
  });

  await prisma.scoreSnapshot.createMany({
    data: output.scores.map((score) => ({
      caseId,
      kind: score.key,
      score: score.score,
      weight: score.weight,
      riskGrade: score.grade,
      rationale: score.rationale,
      breakdown: toPrismaJson(score.breakdown)
    }))
  });

  await prisma.llmMemo.create({
    data: {
      caseId,
      provider: process.env.LLM_PROVIDER ?? "mock",
      modelVersion: output.llmMemo.modelVersion,
      promptVersion: output.llmMemo.promptVersion,
      summary: output.llmMemo.summary,
      strengths: toPrismaJson(output.llmMemo.strengths),
      risks: toPrismaJson(output.llmMemo.risks),
      contradictions: toPrismaJson(output.llmMemo.contradictions),
      policyExceptions: toPrismaJson(output.llmMemo.policyExceptions),
      nextQuestions: toPrismaJson(output.llmMemo.nextQuestions),
      disclaimer: output.llmMemo.disclaimer
    }
  });

  await prisma.underwritingCase.update({
    where: { id: caseId },
    data: {
      compositeScore: output.decision.compositeScore,
      riskGrade: output.decision.riskGrade,
      recommendation: output.decision.recommendation,
      overallConfidence: output.decision.confidence,
      status: "REVIEW"
    }
  });
}

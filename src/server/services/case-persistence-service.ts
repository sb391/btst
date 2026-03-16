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
      dpdPatterns: summary.dpdPatterns,
      creditUtilization: summary.creditUtilization ?? undefined,
      unsecuredMix: summary.unsecuredMix,
      securedMix: summary.securedMix,
      enquiryCount: summary.enquiryCount,
      writtenOff: summary.writtenOff,
      settled: summary.settled,
      loanVintageMonths: summary.loanVintageMonths,
      extractionConfidence: summary.extractionConfidence,
      processedPayload: summary
    },
    create: {
      caseId,
      score: summary.score ?? undefined,
      activeLoans: summary.activeLoans,
      overdueHistory: summary.overdueHistory,
      dpdPatterns: summary.dpdPatterns,
      creditUtilization: summary.creditUtilization ?? undefined,
      unsecuredMix: summary.unsecuredMix,
      securedMix: summary.securedMix,
      enquiryCount: summary.enquiryCount,
      writtenOff: summary.writtenOff,
      settled: summary.settled,
      loanVintageMonths: summary.loanVintageMonths,
      extractionConfidence: summary.extractionConfidence,
      rawPayload: summary,
      processedPayload: summary
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
      gstrTrends: summary.gstrTrends,
      taxPaymentConsistency: summary.taxPaymentConsistency,
      registrationAgeMonths: summary.registrationAgeMonths,
      state: summary.state,
      businessType: summary.businessType,
      healthScore: summary.healthScore,
      rawResponse: summary.rawResponse,
      processedResponse: summary.processedResponse
    },
    create: {
      caseId,
      legalName: summary.legalName,
      gstin: summary.gstin,
      status: summary.status,
      filingFrequency: summary.filingFrequency,
      filingRegularity: summary.filingRegularity,
      turnoverProxy: summary.turnoverProxy,
      gstrTrends: summary.gstrTrends,
      taxPaymentConsistency: summary.taxPaymentConsistency,
      registrationAgeMonths: summary.registrationAgeMonths,
      state: summary.state,
      businessType: summary.businessType,
      healthScore: summary.healthScore,
      rawResponse: summary.rawResponse,
      processedResponse: summary.processedResponse
    }
  });
}

export async function persistBankAnalytics(caseId: string, analytics: BankAnalytics) {
  await prisma.bankAnalytics.upsert({
    where: { caseId },
    update: {
      monthlyCredits: analytics.monthlyCredits,
      monthlyDebits: analytics.monthlyDebits,
      cashDepositRatio: analytics.cashDepositRatio,
      chequeBounceCount: analytics.chequeBounceCount,
      emiBounceCount: analytics.emiBounceCount,
      averageBalance: analytics.averageBalance,
      minBalance: analytics.minBalance,
      maxBalance: analytics.maxBalance,
      inwardConsistency: analytics.inwardConsistency,
      outwardConsistency: analytics.outwardConsistency,
      topCounterparties: analytics.topCounterparties,
      abnormalSpikes: analytics.abnormalSpikes,
      seasonality: analytics.seasonality,
      relatedPartySignals: analytics.relatedPartySignals,
      healthScore: analytics.healthScore,
      extractionConfidence: analytics.extractionConfidence,
      processedPayload: analytics
    },
    create: {
      caseId,
      monthlyCredits: analytics.monthlyCredits,
      monthlyDebits: analytics.monthlyDebits,
      cashDepositRatio: analytics.cashDepositRatio,
      chequeBounceCount: analytics.chequeBounceCount,
      emiBounceCount: analytics.emiBounceCount,
      averageBalance: analytics.averageBalance,
      minBalance: analytics.minBalance,
      maxBalance: analytics.maxBalance,
      inwardConsistency: analytics.inwardConsistency,
      outwardConsistency: analytics.outwardConsistency,
      topCounterparties: analytics.topCounterparties,
      abnormalSpikes: analytics.abnormalSpikes,
      seasonality: analytics.seasonality,
      relatedPartySignals: analytics.relatedPartySignals,
      healthScore: analytics.healthScore,
      extractionConfidence: analytics.extractionConfidence,
      rawPayload: analytics,
      processedPayload: analytics
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
      taxBreakup: invoice.taxBreakup,
      totalValue: invoice.totalValue,
      hsnSac: invoice.hsnSac,
      lineItems: invoice.lineItems,
      vehicleNumber: invoice.vehicleNumber,
      eWayBillNumber: invoice.eWayBillNumber,
      completenessScore: invoice.completenessScore,
      authenticityScore: invoice.authenticityScore,
      anomalyFlags: invoice.flags,
      rawPayload: invoice,
      processedPayload: {
        extractionConfidence: invoice.extractionConfidence
      }
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
      checks: tradeMatch.checks,
      routePlausibility: tradeMatch.routePlausibility,
      historicalNote: tradeMatch.historicalRelationshipNote,
      rawPayload: tradeMatch
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
      breakdown: score.breakdown
    }))
  });

  await prisma.llmMemo.create({
    data: {
      caseId,
      provider: process.env.LLM_PROVIDER ?? "mock",
      modelVersion: output.llmMemo.modelVersion,
      promptVersion: output.llmMemo.promptVersion,
      summary: output.llmMemo.summary,
      strengths: output.llmMemo.strengths,
      risks: output.llmMemo.risks,
      contradictions: output.llmMemo.contradictions,
      policyExceptions: output.llmMemo.policyExceptions,
      nextQuestions: output.llmMemo.nextQuestions,
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

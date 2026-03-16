import type { CaseWorkspaceData } from "@/lib/types";
import { generateUnderwritingMemo } from "@/server/services/llm-reasoning-service";
import { computeUnderwritingDecision } from "@/server/services/scoring-engine";
import { evaluateFraudFlags } from "@/server/services/fraud-rules-engine";
import { computeTradeMatch } from "@/server/services/trade-matching-service";

export async function runCaseAnalysis(workspace: CaseWorkspaceData) {
  const extractionConfidenceCandidates = [
    workspace.bureauSummary?.extractionConfidence,
    workspace.bankAnalytics?.extractionConfidence,
    workspace.invoiceSummary?.extractionConfidence
  ].filter((value): value is number => typeof value === "number");

  const extractionConfidence = extractionConfidenceCandidates.length
    ? extractionConfidenceCandidates.reduce((sum, value) => sum + value, 0) /
      extractionConfidenceCandidates.length
    : 0.75;

  const tradeMatch = computeTradeMatch({
    invoice: workspace.invoiceSummary,
    gstSummary: workspace.gstSummary,
    buyerLegalName: workspace.borrower.legalName,
    anchorName: workspace.borrower.anchorName
  });

  const fraudFlags = evaluateFraudFlags({
    invoice: workspace.invoiceSummary,
    tradeMatch,
    bureauSummary: workspace.bureauSummary,
    bankAnalytics: workspace.bankAnalytics,
    extractionConfidence
  });

  const { scores, decision } = computeUnderwritingDecision({
    borrower: workspace.borrower,
    bureauSummary: workspace.bureauSummary,
    gstSummary: workspace.gstSummary,
    bankAnalytics: workspace.bankAnalytics,
    invoiceSummary: workspace.invoiceSummary,
    tradeMatch,
    fraudFlags,
    extractionConfidence
  });

  const llmMemo = await generateUnderwritingMemo({
    borrower: workspace.borrower,
    bureauSummary: workspace.bureauSummary,
    gstSummary: workspace.gstSummary,
    bankAnalytics: workspace.bankAnalytics,
    invoiceSummary: workspace.invoiceSummary,
    tradeMatch,
    fraudFlags,
    decision
  });

  return {
    tradeMatch,
    fraudFlags,
    scores,
    decision,
    llmMemo
  };
}

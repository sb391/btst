import { NextResponse } from "next/server";

import { getCaseWorkspace } from "@/server/repositories/case-repository";
import { createAuditLog } from "@/server/services/audit-log-service";
import { persistFraudFlags, persistTradeMatch } from "@/server/services/case-persistence-service";
import { evaluateFraudFlags } from "@/server/services/fraud-rules-engine";
import { computeTradeMatch } from "@/server/services/trade-matching-service";

export async function POST(
  _request: Request,
  { params }: { params: { caseId: string } }
) {
  const workspace = await getCaseWorkspace(params.caseId);
  const tradeMatch = computeTradeMatch({
    invoice: workspace.invoiceSummary,
    gstSummary: workspace.gstSummary,
    buyerLegalName: workspace.borrower.legalName,
    anchorName: workspace.borrower.anchorName
  });

  const extractionConfidence =
    ((workspace.invoiceSummary?.extractionConfidence ?? 0.7) +
      (workspace.bankAnalytics?.extractionConfidence ?? 0.7)) /
    2;

  const fraudFlags = evaluateFraudFlags({
    invoice: workspace.invoiceSummary,
    tradeMatch,
    bureauSummary: workspace.bureauSummary,
    bankAnalytics: workspace.bankAnalytics,
    extractionConfidence
  });

  try {
    await persistTradeMatch(params.caseId, tradeMatch);
    await persistFraudFlags(params.caseId, fraudFlags);
    await createAuditLog({
      caseId: params.caseId,
      action: "TRADE_VERIFICATION_REFRESHED",
      entityType: "UnderwritingCase",
      entityId: params.caseId,
      metadata: {
        tradeScore: tradeMatch.score,
        tradeStatus: tradeMatch.status
      }
    });
  } catch {
    // Best effort persistence only.
  }

  return NextResponse.json({
    tradeMatch,
    fraudFlags
  });
}

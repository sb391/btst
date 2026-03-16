import { NextResponse } from "next/server";

import { getCaseWorkspace } from "@/server/repositories/case-repository";
import { prisma } from "@/server/db";
import { createAuditLog } from "@/server/services/audit-log-service";
import {
  persistFraudFlags,
  persistGstSummary,
  persistTradeMatch,
  persistUnderwritingOutputs
} from "@/server/services/case-persistence-service";
import { fetchGstSummary } from "@/server/services/gst-integration-service";
import { runCaseAnalysis } from "@/server/services/underwriting-orchestrator";

export async function POST(
  _request: Request,
  { params }: { params: { caseId: string } }
) {
  const workspace = await getCaseWorkspace(params.caseId);

  let gstSummary = workspace.gstSummary;
  if (workspace.borrower.gstin) {
    gstSummary = await fetchGstSummary(workspace.borrower.gstin, workspace.borrower.legalName);
    try {
      await persistGstSummary(params.caseId, gstSummary);
    } catch {
      // Best effort persistence only.
    }
  }

  const output = await runCaseAnalysis({
    ...workspace,
    gstSummary
  });

  try {
    await persistTradeMatch(params.caseId, output.tradeMatch);
    await persistFraudFlags(params.caseId, output.fraudFlags);
    await persistUnderwritingOutputs(params.caseId, {
      scores: output.scores,
      decision: output.decision,
      llmMemo: output.llmMemo
    });
    await prisma.underwritingCase.update({
      where: { id: params.caseId },
      data: {
        compositeScore: output.decision.compositeScore,
        riskGrade: output.decision.riskGrade,
        recommendation: output.decision.recommendation
      }
    });
    await createAuditLog({
      caseId: params.caseId,
      action: "UNDERWRITING_REFRESHED",
      entityType: "UnderwritingCase",
      entityId: params.caseId,
      metadata: {
        compositeScore: output.decision.compositeScore,
        recommendation: output.decision.recommendation
      }
    });
  } catch {
    // Best effort persistence only.
  }

  return NextResponse.json(output);
}

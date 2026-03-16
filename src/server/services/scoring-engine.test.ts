import { demoCaseWorkspace } from "@/lib/demo-data";
import { computeUnderwritingDecision } from "@/server/services/scoring-engine";

describe("computeUnderwritingDecision", () => {
  it("returns conditional approval for the demo distributor case", () => {
    const output = computeUnderwritingDecision({
      borrower: demoCaseWorkspace.borrower,
      bureauSummary: demoCaseWorkspace.bureauSummary,
      gstSummary: demoCaseWorkspace.gstSummary,
      bankAnalytics: demoCaseWorkspace.bankAnalytics,
      invoiceSummary: demoCaseWorkspace.invoiceSummary,
      tradeMatch: demoCaseWorkspace.tradeMatch,
      fraudFlags: demoCaseWorkspace.fraudFlags,
      extractionConfidence: 0.86
    });

    expect(output.decision.compositeScore).toBeGreaterThanOrEqual(70);
    expect(output.decision.recommendation).toBe("APPROVE_WITH_CONDITIONS");
  });

  it("auto rejects when severe overdue and inactive GST coexist", () => {
    const output = computeUnderwritingDecision({
      borrower: demoCaseWorkspace.borrower,
      bureauSummary: {
        ...demoCaseWorkspace.bureauSummary!,
        overdueHistory: 3,
        writtenOff: true
      },
      gstSummary: {
        ...demoCaseWorkspace.gstSummary!,
        status: "INACTIVE"
      },
      bankAnalytics: demoCaseWorkspace.bankAnalytics,
      fraudFlags: demoCaseWorkspace.fraudFlags,
      extractionConfidence: 0.9
    });

    expect(output.decision.recommendation).toBe("REJECT");
    expect(output.decision.triggeredRules.join(" ")).toContain("Auto reject");
  });
});

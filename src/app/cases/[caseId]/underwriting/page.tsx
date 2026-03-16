import { BankTrendChart } from "@/components/shared/bank-trend-chart";
import { InternalBanner } from "@/components/shared/internal-banner";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { DecisionOverridePanel } from "@/components/cases/decision-override-panel";
import { LlmMemoPanel } from "@/components/cases/llm-memo-panel";
import { RefreshAnalysisActions } from "@/components/cases/refresh-analysis-actions";
import { ScoreBreakdownPanel } from "@/components/cases/score-breakdown-panel";
import { ScoreDriverCards } from "@/components/cases/score-driver-cards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayCurrency } from "@/lib/format";
import { getCaseWorkspace } from "@/server/repositories/case-repository";

export default async function UnderwritingPage({
  params
}: {
  params: { caseId: string };
}) {
  const workspace = await getCaseWorkspace(params.caseId);

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow={workspace.caseNumber}
        title="Credit underwriting dashboard"
        description="Deterministic checks, computed scores, policy triggers, and LLM-assisted reasoning shown side by side for explainable credit assessment."
        action={<RefreshAnalysisActions caseId={params.caseId} />}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Composite score" value={String(workspace.decision.compositeScore)} hint="0-100 underwriting score." badge={workspace.decision.riskGrade} />
        <MetricCard label="Recommendation" value={workspace.decision.recommendation.replaceAll("_", " ")} hint="Recommendation is not fully autonomous." />
        <MetricCard label="Recommended limit" value={displayCurrency(workspace.decision.recommendedLimit)} hint="Policy-led first-pass facility sizing." />
        <MetricCard label="Recommended tenor" value={`${workspace.decision.recommendedTenorDays} days`} hint={workspace.decision.pricingBand} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <ScoreBreakdownPanel scores={workspace.scores} />
        <Card>
          <CardHeader>
            <CardTitle>Bank statement intelligence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {workspace.bankAnalytics ? (
              <>
                <BankTrendChart
                  credits={workspace.bankAnalytics.monthlyCredits}
                  debits={workspace.bankAnalytics.monthlyDebits}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-[18px] border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average balance</p>
                    <p className="mt-2 text-xl font-semibold">{displayCurrency(workspace.bankAnalytics.averageBalance)}</p>
                  </div>
                  <div className="rounded-[18px] border border-border/70 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Conduct alerts</p>
                    <p className="mt-2 text-xl font-semibold">
                      {workspace.bankAnalytics.chequeBounceCount + workspace.bankAnalytics.emiBounceCount}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a bank statement to see month-wise trend analysis.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 space-y-6">
        <ScoreDriverCards decision={workspace.decision} />
        <LlmMemoPanel memo={workspace.llmMemo} />
        <DecisionOverridePanel
          caseId={params.caseId}
          defaults={{
            recommendation: workspace.analystDecision.recommendation,
            approvedLimit: workspace.analystDecision.approvedLimit ?? workspace.decision.recommendedLimit,
            approvedTenorDays:
              workspace.analystDecision.approvedTenorDays ?? workspace.decision.recommendedTenorDays,
            pricingBand: workspace.analystDecision.pricingBand ?? workspace.decision.pricingBand,
            collateralRequirement:
              workspace.analystDecision.collateralRequirement ?? workspace.decision.collateralRequirement,
            overrideReason: workspace.analystDecision.overrideReason
          }}
        />
      </div>
    </div>
  );
}

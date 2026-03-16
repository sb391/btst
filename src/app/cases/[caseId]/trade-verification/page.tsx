import { InvoiceSummaryCard } from "@/components/cases/invoice-summary-card";
import { RefreshAnalysisActions } from "@/components/cases/refresh-analysis-actions";
import { TradeCheckList } from "@/components/cases/trade-check-list";
import { InternalBanner } from "@/components/shared/internal-banner";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { getCaseWorkspace } from "@/server/repositories/case-repository";

export default async function TradeVerificationPage({
  params
}: {
  params: { caseId: string };
}) {
  const workspace = await getCaseWorkspace(params.caseId);
  const invoiceScore = workspace.scores.find((score) => score.key === "INVOICE_AUTHENTICITY")?.score ?? 0;
  const tradeScore = workspace.scores.find((score) => score.key === "TRADE_MATCH")?.score ?? workspace.tradeMatch?.score ?? 0;

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow={workspace.caseNumber}
        title="Invoice and trade verification dashboard"
        description="Trade evidence is validated independently through invoice structure checks, historical trade consistency, and fraud-flag rules."
        action={<RefreshAnalysisActions caseId={params.caseId} />}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Invoice authenticity" value={String(invoiceScore)} hint="Structured invoice credibility score." />
        <MetricCard label="Trade match" value={String(tradeScore)} hint="Cross-document match score." />
        <MetricCard label="Fraud flags" value={String(workspace.fraudFlags.length)} hint="Red, amber, and green integrity triggers." />
        <MetricCard label="Evidence confidence" value={`${Math.round((workspace.invoiceSummary?.extractionConfidence ?? 0) * 100)}%`} hint="Invoice extraction confidence." />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <InvoiceSummaryCard invoice={workspace.invoiceSummary} />
        <TradeCheckList tradeMatch={workspace.tradeMatch} flags={workspace.fraudFlags} />
      </div>
    </div>
  );
}

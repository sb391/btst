import Link from "next/link";

import { CaseIntakeForm } from "@/components/cases/case-intake-form";
import { InternalBanner } from "@/components/shared/internal-banner";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { displayCurrency } from "@/lib/format";
import { getAllCases } from "@/server/repositories/case-repository";

export default async function HomePage() {
  const cases = await getAllCases();
  const approvals = cases.filter((item) => item.recommendation.includes("APPROVE")).length;
  const avgScore = Math.round(cases.reduce((sum, item) => sum + item.score, 0) / Math.max(cases.length, 1));

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow="Borrower Intake"
        title="Underwriting Intelligence Workbench"
        description="Local-first internal dashboard for AI-assisted credit underwriting and trade verification. Deterministic rules, scored variables, and LLM narratives remain clearly separated."
        action={
          <Badge variant="secondary">
            Desktop-first analyst workflow
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Open cases" value={String(cases.length)} hint="Demo and persisted cases combined." trend="up" />
        <MetricCard label="Average score" value={String(avgScore)} hint="Composite underwriting score across visible cases." />
        <MetricCard label="Approval bias" value={`${approvals}/${cases.length}`} hint="Approve or approve-with-conditions recommendations." />
        <MetricCard label="Typical limit" value={displayCurrency(4200000)} hint="Seeded demo recommendation level." />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <CaseIntakeForm />
        <Card>
          <CardHeader>
            <CardTitle>Workbench modules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[20px] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">Credit underwriting engine</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Bureau parsing, GST normalization, bank statement analytics, configurable score weights, and LLM memo generation.
              </p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">Invoice / trade verification engine</p>
              <p className="mt-2 text-sm text-muted-foreground">
                OCR-driven invoice extraction, authenticity scoring, trade matching, e-way bill placeholders, and fraud risk logic.
              </p>
            </div>
            <div className="rounded-[20px] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">Auditability and learning hooks</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Case storage, analyst overrides, outcome labels, model versioning, prompt versioning, and future recalibration hooks.
              </p>
            </div>
            <Link href="/cases" className="inline-flex text-sm font-semibold text-primary hover:underline">
              Open case history
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

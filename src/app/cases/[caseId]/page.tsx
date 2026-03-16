import Link from "next/link";

import { AnalystNotesPanel } from "@/components/cases/analyst-notes-panel";
import { BorrowerProfileCard } from "@/components/cases/borrower-profile-card";
import { DocumentUploadCenter } from "@/components/cases/document-upload-center";
import { ExtractedDataTable } from "@/components/cases/extracted-data-table";
import { TimelinePanel } from "@/components/cases/timeline-panel";
import { InternalBanner } from "@/components/shared/internal-banner";
import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { getCaseWorkspace } from "@/server/repositories/case-repository";

export default async function CaseDetailPage({
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
        title="Borrower intake, document uploads, and extracted review"
        description="Structured case workspace for ingesting borrower evidence, validating extraction confidence, and preparing the analyst handoff."
        action={
          <div className="flex flex-wrap gap-3">
            <Link href={`/cases/${params.caseId}/underwriting`}>
              <Badge variant="secondary">Underwriting dashboard</Badge>
            </Link>
            <Link href={`/cases/${params.caseId}/trade-verification`}>
              <Badge variant="outline">Trade verification</Badge>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Composite score" value={String(workspace.decision.compositeScore)} hint="Current computed decision score." badge={workspace.decision.riskGrade} />
        <MetricCard label="Recommendation" value={workspace.decision.recommendation.replaceAll("_", " ")} hint="Deterministic rules remain visible on the underwriting screen." />
        <MetricCard label="Documents" value={String(workspace.documents.length)} hint="Uploaded case evidence across modules." />
        <MetricCard label="Confidence" value={`${Math.round(workspace.decision.confidence * 100)}%`} hint="Evidence confidence across extracted inputs." />
      </div>

      <div className="mt-6 space-y-6">
        <BorrowerProfileCard borrower={workspace.borrower} />
        <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <DocumentUploadCenter caseId={params.caseId} />
          <TimelinePanel items={workspace.timeline} />
        </div>
        <ExtractedDataTable fields={workspace.extractedFields} />
        <AnalystNotesPanel caseId={params.caseId} notes={workspace.analystDecision.analystNotes} />
      </div>
    </div>
  );
}

import { CaseHistoryTable } from "@/components/cases/case-history-table";
import { InternalBanner } from "@/components/shared/internal-banner";
import { PageHeader } from "@/components/shared/page-header";
import { getAllCases } from "@/server/repositories/case-repository";

export default async function CasesPage() {
  const cases = await getAllCases();

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow="Case History"
        title="Search and review borrower cases"
        description="Browse historical cases, current review queues, and demo scenarios seeded for the MVP."
      />
      <CaseHistoryTable cases={cases} />
    </div>
  );
}

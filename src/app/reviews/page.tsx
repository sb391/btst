import { HistoryTable } from "@/components/invoice/history-table";
import { InternalBanner } from "@/components/shared/internal-banner";
import { PageHeader } from "@/components/shared/page-header";
import { Input } from "@/components/ui/input";
import { listInvoiceReviews } from "@/server/repositories/invoice-review-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReviewsPage({
  searchParams
}: {
  searchParams?: { q?: string };
}) {
  const query = searchParams?.q?.trim() ?? "";
  const reviews = await listInvoiceReviews(query || undefined);

  return (
    <div>
      <InternalBanner />
      <PageHeader
        eyebrow="Review History"
        title="Search prior invoice reviews"
        description="Find prior invoice reviews by review number, file name, supplier, or buyer."
      />

      <form className="mb-6">
        <Input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by review number, file name, supplier, or buyer"
          className="max-w-xl"
        />
      </form>

      <HistoryTable reviews={reviews} />
    </div>
  );
}

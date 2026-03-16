import type { BorrowerProfile } from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BorrowerProfileCard({ borrower }: { borrower: BorrowerProfile }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>{borrower.legalName}</CardTitle>
          <Badge variant="secondary">{borrower.borrowerType}</Badge>
          {borrower.anchorName ? <Badge variant="outline">Anchor {borrower.anchorName}</Badge> : null}
        </div>
        <CardDescription>
          Borrower profile and metadata used across underwriting, trade verification, and audit logging.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GSTIN</p>
          <p className="mt-1 font-medium">{borrower.gstin ?? "Not available"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">PAN</p>
          <p className="mt-1 font-medium">{borrower.pan ?? "Not available"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Dealer code</p>
          <p className="mt-1 font-medium">{borrower.dealerCode ?? "Not available"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Customer code</p>
          <p className="mt-1 font-medium">{borrower.customerCode ?? "Not available"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

import type { InvoiceHealthStatus, InvoiceReviewRecommendation } from "@/lib/invoice-types";
import { formatInvoiceHealthStatus, formatInvoiceRecommendation } from "@/lib/invoice-format";
import { Badge } from "@/components/ui/badge";

function healthVariant(status: InvoiceHealthStatus) {
  if (status === "GOOD") return "success" as const;
  if (status === "NEEDS_REVIEW") return "warning" as const;
  if (status === "HIGH_RISK") return "danger" as const;
  return "outline" as const;
}

function recommendationVariant(status: InvoiceReviewRecommendation) {
  if (status === "LOOKS_IN_ORDER") return "success" as const;
  if (status === "MINOR_ISSUES_REVIEW_RECOMMENDED") return "warning" as const;
  if (status === "SUSPICIOUS_OR_INCOMPLETE") return "danger" as const;
  return "outline" as const;
}

export function ReviewHealthBadge({ status }: { status: InvoiceHealthStatus }) {
  return <Badge variant={healthVariant(status)}>{formatInvoiceHealthStatus(status)}</Badge>;
}

export function ReviewRecommendationBadge({
  recommendation
}: {
  recommendation: InvoiceReviewRecommendation;
}) {
  return (
    <Badge variant={recommendationVariant(recommendation)}>
      {formatInvoiceRecommendation(recommendation)}
    </Badge>
  );
}

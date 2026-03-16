import type { InvoiceHealthStatus, InvoiceReviewRecommendation } from "@/lib/invoice-types";
import { displayCurrency, displayDate } from "@/lib/format";
import { toTitleCase } from "@/lib/utils";

export { displayCurrency, displayDate };

export function formatInvoiceHealthStatus(value: InvoiceHealthStatus) {
  return toTitleCase(value.replace(/_/g, " "));
}

export function formatInvoiceRecommendation(value: InvoiceReviewRecommendation) {
  return toTitleCase(value.replace(/_/g, " "));
}

import { z } from "zod";

export const acceptedInvoiceMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg"
] as const;

export const uploadInvoiceSchema = z.object({
  documentType: z.literal("INVOICE").default("INVOICE")
});

export const analystReviewUpdateSchema = z.object({
  analystDecision: z
    .enum([
      "LOOKS_IN_ORDER",
      "MINOR_ISSUES_REVIEW_RECOMMENDED",
      "SUSPICIOUS_OR_INCOMPLETE",
      "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED"
    ])
    .optional(),
  analystDecisionReason: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(4000).optional()
});

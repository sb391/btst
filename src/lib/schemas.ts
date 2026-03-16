import { z } from "zod";

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().positive().optional()
);

const optionalNonNegativeNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().nonnegative().optional()
);

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional()
);

const optionalNonNegativeInteger = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().nonnegative().optional()
);

export const borrowerTypeSchema = z.enum(["CORPORATE", "DISTRIBUTOR", "RETAILER"]);
export const recommendationSchema = z.enum([
  "APPROVE",
  "APPROVE_WITH_CONDITIONS",
  "REFER_TO_ANALYST",
  "REJECT"
]);
export const documentTypeSchema = z.enum([
  "BUREAU_REPORT",
  "BANK_STATEMENT",
  "GST_PULL",
  "INVOICE",
  "PURCHASE_ORDER",
  "EWAY_BILL",
  "OTHER"
]);

export const createCaseSchema = z.object({
  legalName: z.string().min(2),
  borrowerType: borrowerTypeSchema,
  gstin: z.string().trim().optional().or(z.literal("")),
  pan: z.string().trim().optional().or(z.literal("")),
  state: z.string().trim().optional().or(z.literal("")),
  anchorName: z.string().trim().optional().or(z.literal("")),
  dealerCode: z.string().trim().optional().or(z.literal("")),
  customerCode: z.string().trim().optional().or(z.literal("")),
  requestedAmount: optionalPositiveNumber,
  requestedTenorDays: optionalPositiveInteger
});

export const analystDecisionSchema = z.object({
  recommendation: recommendationSchema,
  overrideReason: z.string().trim().optional().or(z.literal("")),
  approvedLimit: optionalNonNegativeNumber,
  approvedTenorDays: optionalNonNegativeInteger,
  pricingBand: z.string().trim().optional().or(z.literal("")),
  collateralRequirement: z.string().trim().optional().or(z.literal(""))
});

export const analystNoteSchema = z.object({
  body: z.string().min(5)
});

import type { BorrowerType, PolicyConfigRecord } from "@/lib/types";

export const scoringWeightsByBorrowerType: Record<BorrowerType, PolicyConfigRecord> = {
  CORPORATE: {
    borrowerType: "CORPORATE",
    version: "v1.0.0",
    weights: {
      BUREAU: 25,
      GST: 20,
      BANK: 25,
      BUSINESS_STABILITY: 15,
      FRAUD_INTEGRITY: 15
    },
    rules: [
      "Auto reject if severe overdue history or written-off indicator is present.",
      "Auto reject if GST status is inactive or cancelled.",
      "Refer to analyst if extraction confidence is below 0.55 across critical documents.",
      "Conditional approval if bank health is moderate but anchor relationship is strong."
    ]
  },
  DISTRIBUTOR: {
    borrowerType: "DISTRIBUTOR",
    version: "v1.0.0",
    weights: {
      BUREAU: 25,
      GST: 20,
      BANK: 25,
      BUSINESS_STABILITY: 15,
      FRAUD_INTEGRITY: 15
    },
    rules: [
      "Emphasize anchor linkage, GST regularity, and distributor cash flow seasonality.",
      "Refer to analyst if invoice authenticity is below 55.",
      "Escalate if dealer code is missing for anchor-linked programs."
    ]
  },
  RETAILER: {
    borrowerType: "RETAILER",
    version: "v1.0.0",
    weights: {
      BUREAU: 25,
      GST: 20,
      BANK: 25,
      BUSINESS_STABILITY: 15,
      FRAUD_INTEGRITY: 15
    },
    rules: [
      "Use conduct and bank volatility signals more conservatively for thin-file retailers.",
      "Refer to analyst if data confidence is low or bureau report is incomplete.",
      "Conditional approval where anchor performance offsets moderate bureau weakness."
    ]
  }
};

export function getPolicyConfig(borrowerType: BorrowerType) {
  return scoringWeightsByBorrowerType[borrowerType];
}

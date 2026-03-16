import type { GstSummary } from "@/lib/types";
import { clamp, safeNumber } from "@/lib/utils";

function mockGstSummary(gstin: string, legalName?: string): GstSummary {
  const gstrTrends = [
    { period: "Oct-2025", filed: true, taxableValue: 9200000 },
    { period: "Nov-2025", filed: true, taxableValue: 9100000 },
    { period: "Dec-2025", filed: true, taxableValue: 9800000 },
    { period: "Jan-2026", filed: true, taxableValue: 9400000 },
    { period: "Feb-2026", filed: true, taxableValue: 10200000 },
    { period: "Mar-2026", filed: true, taxableValue: 9950000 }
  ];

  return {
    legalName: legalName ?? "Borrower Legal Name",
    gstin,
    status: "ACTIVE",
    filingFrequency: "Monthly",
    filingRegularity: 90,
    turnoverProxy: 5.7e7,
    gstrTrends,
    taxPaymentConsistency: 88,
    registrationAgeMonths: 60,
    state: gstin.startsWith("27") ? "Maharashtra" : "Unknown",
    businessType: "Wholesale distributor",
    healthScore: 83,
    rawResponse: {
      provider: "mock",
      gstin,
      gstrTrends
    },
    processedResponse: {
      normalized: true,
      healthFactors: ["filingRegularity", "taxPaymentConsistency", "registrationAge"]
    }
  };
}

function normalizeGstResponse(payload: Record<string, unknown>, gstin: string): GstSummary {
  const trends = Array.isArray(payload.gstrTrends) ? payload.gstrTrends : [];
  const filingRegularity = clamp(
    safeNumber(payload.filingRegularity, safeNumber(payload.filing_score, 70)),
    0,
    100
  );
  const taxPaymentConsistency = clamp(
    safeNumber(payload.taxPaymentConsistency, safeNumber(payload.payment_score, 70)),
    0,
    100
  );
  const registrationAgeMonths = safeNumber(payload.registrationAgeMonths, 24);
  const healthScore = clamp(
    filingRegularity * 0.4 + taxPaymentConsistency * 0.3 + Math.min(registrationAgeMonths, 120) / 120 * 30,
    0,
    100
  );

  return {
    legalName: String(payload.legalName ?? payload.tradeName ?? "Borrower Legal Name"),
    gstin,
    status: String(payload.status ?? "UNKNOWN") as GstSummary["status"],
    filingFrequency: String(payload.filingFrequency ?? "Unknown"),
    filingRegularity,
    turnoverProxy: safeNumber(payload.turnoverProxy, safeNumber(payload.annualTurnover, 0)),
    gstrTrends: trends as GstSummary["gstrTrends"],
    taxPaymentConsistency,
    registrationAgeMonths,
    state: String(payload.state ?? "Unknown"),
    businessType: String(payload.businessType ?? "Unknown"),
    healthScore,
    rawResponse: payload,
    processedResponse: {
      normalizedAt: new Date().toISOString(),
      healthScore
    }
  };
}

export async function fetchGstSummary(gstin: string, legalName?: string): Promise<GstSummary> {
  const baseUrl = process.env.GST_API_BASE_URL;
  const apiKey = process.env.GST_API_KEY;
  const timeoutMs = safeNumber(process.env.GST_API_TIMEOUT_MS, 8000);

  if (!baseUrl || !apiKey) {
    return mockGstSummary(gstin, legalName);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/gst/${gstin}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      return mockGstSummary(gstin, legalName);
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return normalizeGstResponse(payload, gstin);
  } catch {
    return mockGstSummary(gstin, legalName);
  } finally {
    clearTimeout(timeout);
  }
}

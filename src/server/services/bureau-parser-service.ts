import type { BureauSummary, ExtractedFieldRecord } from "@/lib/types";
import { clamp, safeNumber } from "@/lib/utils";

function extractMatchNumber(text: string, patterns: RegExp[], fallback = 0) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return safeNumber(match[1].replace(/,/g, ""), fallback);
    }
  }

  return fallback;
}

export function parseBureauReport(text: string): {
  summary: BureauSummary;
  extractedFields: ExtractedFieldRecord[];
} {
  const score = extractMatchNumber(text, [
    /score[:\s-]+(\d{3})/i,
    /cibil\s+score[:\s-]+(\d{3})/i
  ], 0);
  const activeLoans = extractMatchNumber(text, [
    /active\s+loans?[:\s-]+(\d+)/i,
    /live\s+accounts?[:\s-]+(\d+)/i
  ]);
  const overdueHistory = extractMatchNumber(text, [
    /overdues?[:\s-]+(\d+)/i,
    /delinquent\s+accounts?[:\s-]+(\d+)/i
  ]);
  const creditUtilization = extractMatchNumber(text, [
    /utili[sz]ation[:\s-]+(\d+(?:\.\d+)?)/i,
    /credit\s+utili[sz]ation[:\s-]+(\d+(?:\.\d+)?)/i
  ], 0);
  const enquiryCount = extractMatchNumber(text, [
    /enquir(?:y|ies)\s+count[:\s-]+(\d+)/i,
    /recent\s+enquir(?:y|ies)[:\s-]+(\d+)/i
  ]);
  const loanVintageMonths = extractMatchNumber(text, [
    /loan\s+vintage[:\s-]+(\d+)/i,
    /oldest\s+account\s+age[:\s-]+(\d+)/i
  ]);
  const securedMix = extractMatchNumber(text, [/secured\s+mix[:\s-]+(\d+)/i], 0);
  const unsecuredMix =
    extractMatchNumber(text, [/unsecured\s+mix[:\s-]+(\d+)/i], 0) ||
    clamp(100 - securedMix, 0, 100);
  const writtenOff = /written[\s-]?off/i.test(text);
  const settled = /settled/i.test(text);
  const dpdPatterns = Array.from(text.matchAll(/\b(\d{3})\b/g))
    .map((match) => match[1])
    .filter((value) => ["000", "030", "060", "090", "120"].includes(value))
    .slice(0, 6);

  const summary: BureauSummary = {
    score: score || null,
    activeLoans,
    overdueHistory,
    dpdPatterns,
    creditUtilization: creditUtilization || null,
    unsecuredMix,
    securedMix: securedMix || clamp(100 - unsecuredMix, 0, 100),
    enquiryCount,
    writtenOff,
    settled,
    loanVintageMonths,
    extractionConfidence: score > 0 ? 0.88 : 0.58
  };

  const extractedFields: ExtractedFieldRecord[] = [
    { section: "Bureau", field: "Score", value: summary.score ? String(summary.score) : "N/A", confidence: 0.95 },
    { section: "Bureau", field: "Active Loans", value: String(summary.activeLoans), confidence: 0.82 },
    { section: "Bureau", field: "Overdue History", value: String(summary.overdueHistory), confidence: 0.8 },
    {
      section: "Bureau",
      field: "Credit Utilization",
      value: summary.creditUtilization !== null ? `${summary.creditUtilization}%` : "N/A",
      confidence: 0.78
    },
    { section: "Bureau", field: "Enquiry Count", value: String(summary.enquiryCount), confidence: 0.77 },
    { section: "Bureau", field: "Written Off", value: summary.writtenOff ? "Yes" : "No", confidence: 0.85 }
  ];

  return { summary, extractedFields };
}

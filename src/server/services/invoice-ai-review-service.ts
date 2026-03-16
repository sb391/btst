import type {
  InvoiceAiReview,
  InvoiceReviewRecommendation,
  InvoiceScore,
  InvoiceValidationResult,
  NormalizedInvoiceDocument,
  OcrDocumentResult
} from "@/lib/invoice-types";
import { formatInvoiceRecommendation } from "@/lib/invoice-format";

interface ReviewProvider {
  generate(prompt: string): Promise<{ content: string; model: string; provider: string }>;
}

class TemplateReviewProvider implements ReviewProvider {
  async generate(prompt: string) {
    return {
      content: prompt,
      model: "template-analyst-v1",
      provider: "mock"
    };
  }
}

class OpenAiCompatibleReviewProvider implements ReviewProvider {
  async generate(prompt: string) {
    const baseUrl = process.env.LLM_BASE_URL;
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL ?? "gpt-4.1-mini";

    if (!baseUrl || !apiKey) {
      return new TemplateReviewProvider().generate(prompt);
    }

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You are an internal invoice review assistant. Use only the provided facts, checks, and scores. Never invent missing fields. Return concise, analyst-style JSON."
            },
            {
              role: "user",
              content: prompt
            }
          ]
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        return new TemplateReviewProvider().generate(prompt);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      return {
        content: payload.choices?.[0]?.message?.content ?? prompt,
        model,
        provider: "openai-compatible"
      };
    } catch {
      return new TemplateReviewProvider().generate(prompt);
    }
  }
}

function getProvider(): ReviewProvider {
  return process.env.LLM_PROVIDER && process.env.LLM_PROVIDER !== "mock"
    ? new OpenAiCompatibleReviewProvider()
    : new TemplateReviewProvider();
}

function recommendationSentence(recommendation: InvoiceReviewRecommendation) {
  if (recommendation === "LOOKS_IN_ORDER") return "Looks in order.";
  if (recommendation === "MINOR_ISSUES_REVIEW_RECOMMENDED") return "Minor issues, review recommended.";
  if (recommendation === "SUSPICIOUS_OR_INCOMPLETE") return "Suspicious or incomplete.";
  return "Low-confidence extraction, manual review required.";
}

function buildPrompt(input: {
  ocr: OcrDocumentResult;
  document: NormalizedInvoiceDocument;
  validationResults: InvoiceValidationResult[];
  scores: InvoiceScore[];
  recommendation: InvoiceReviewRecommendation;
}) {
  return JSON.stringify(
    {
      invoiceNumber: input.document.invoiceNumber ?? null,
      invoiceDate: input.document.invoiceDate ?? null,
      supplier: input.document.supplier,
      buyer: input.document.buyer,
      taxDetails: input.document.taxDetails,
      lineItemCount: input.document.lineItems.length,
      visibleFacts: input.document.extractedFields.filter((field) => field.present).map((field) => ({
        label: field.label,
        value: field.value,
        confidence: field.confidence
      })),
      failedChecks: input.validationResults
        .filter((item) => item.status === "FAIL")
        .map((item) => item.message),
      warnings: input.validationResults
        .filter((item) => item.status === "WARN")
        .map((item) => item.message),
      scores: input.scores,
      recommendation: input.recommendation,
      ocrConfidence: input.ocr.averageConfidence
    },
    null,
    2
  );
}

export async function generateInvoiceAiReview(input: {
  ocr: OcrDocumentResult;
  document: NormalizedInvoiceDocument;
  validationResults: InvoiceValidationResult[];
  scores: InvoiceScore[];
  recommendation: InvoiceReviewRecommendation;
}): Promise<InvoiceAiReview> {
  const provider = getProvider();
  const prompt = buildPrompt(input);
  const completion = await provider.generate(prompt);
  const visibleFacts = input.document.extractedFields
    .filter((field) => field.present)
    .slice(0, 10)
    .map((field) => `${field.label}: ${field.value}`);
  const missingFields = input.document.extractedFields
    .filter((field) => !field.present)
    .map((field) => field.label);
  const suspiciousSignals = input.validationResults
    .filter((item) => item.status !== "PASS")
    .map((item) => item.message);
  const uncertaintyNotes = [
    ...(input.ocr.averageConfidence < 0.55 ? ["OCR readability is low, so field visibility is uncertain."] : []),
    ...(input.document.lineItems.length === 0 ? ["Line item extraction is weak or absent."] : []),
    ...(input.document.qualitySignals.cutOffRisk ? ["The document may be cut off or incomplete."] : [])
  ];
  const consistencyScore = input.scores.find((score) => score.key === "CONSISTENCY")?.score ?? 0;

  return {
    provider: "provider" in completion ? completion.provider : "mock",
    model: completion.model,
    promptVersion: "invoice-review-v1",
    visibleFacts,
    missingFields,
    suspiciousSignals,
    uncertaintyNotes,
    internalCoherence:
      consistencyScore >= 75
        ? "The invoice looks internally coherent on visible totals and structure."
        : "The invoice has internal gaps or mismatches that reduce coherence confidence.",
    summary: [
      visibleFacts.length
        ? "Visible invoice facts were extracted and organized for review."
        : "Only limited invoice facts could be extracted.",
      suspiciousSignals.length
        ? `${suspiciousSignals.length} validation issues require analyst attention.`
        : "No material validation issues were detected.",
      recommendationSentence(input.recommendation)
    ].join(" "),
    recommendedAction: formatInvoiceRecommendation(input.recommendation),
    rawResponse: {
      completion: completion.content
    }
  };
}

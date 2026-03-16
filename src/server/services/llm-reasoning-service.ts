import type {
  BankAnalytics,
  BorrowerProfile,
  BureauSummary,
  DecisionRecommendation,
  FraudFlag,
  GstSummary,
  InvoiceSummary,
  LlmMemo,
  TradeMatchResult
} from "@/lib/types";

interface ReasoningProvider {
  generate(prompt: string): Promise<{ content: string; model: string }>;
}

class MockReasoningProvider implements ReasoningProvider {
  async generate(prompt: string) {
    return {
      content: prompt,
      model: "mock-llm-v1"
    };
  }
}

class OpenAiCompatibleProvider implements ReasoningProvider {
  async generate(prompt: string) {
    const baseUrl = process.env.LLM_BASE_URL;
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL ?? "gpt-4.1-mini";

    if (!baseUrl || !apiKey) {
      return new MockReasoningProvider().generate(prompt);
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
          messages: [
            {
              role: "system",
              content:
                "You are an internal underwriting copilot. Return concise, factual JSON-like plain text guidance without pretending to make the final decision."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.2
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        return new MockReasoningProvider().generate(prompt);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      return {
        content: payload.choices?.[0]?.message?.content ?? prompt,
        model
      };
    } catch {
      return new MockReasoningProvider().generate(prompt);
    }
  }
}

function getProvider(): ReasoningProvider {
  return process.env.LLM_PROVIDER && process.env.LLM_PROVIDER !== "mock"
    ? new OpenAiCompatibleProvider()
    : new MockReasoningProvider();
}

function buildPrompt(input: {
  borrower: BorrowerProfile;
  bureauSummary?: BureauSummary;
  gstSummary?: GstSummary;
  bankAnalytics?: BankAnalytics;
  invoiceSummary?: InvoiceSummary;
  tradeMatch?: TradeMatchResult;
  fraudFlags: FraudFlag[];
  decision: DecisionRecommendation;
}) {
  return [
    `Borrower: ${input.borrower.legalName}`,
    `Borrower type: ${input.borrower.borrowerType}`,
    `Anchor: ${input.borrower.anchorName ?? "N/A"}`,
    `Composite score: ${input.decision.compositeScore}`,
    `Recommendation: ${input.decision.recommendation}`,
    `Risk grade: ${input.decision.riskGrade}`,
    `Bureau score: ${input.bureauSummary?.score ?? "N/A"}`,
    `GST status: ${input.gstSummary?.status ?? "N/A"}`,
    `Bank health: ${input.bankAnalytics?.healthScore ?? "N/A"}`,
    `Invoice authenticity: ${input.invoiceSummary?.authenticityScore ?? "N/A"}`,
    `Trade match: ${input.tradeMatch?.status ?? "N/A"} (${input.tradeMatch?.score ?? 0})`,
    `Fraud flags: ${input.fraudFlags.map((flag) => `${flag.code}:${flag.severity}`).join(", ") || "None"}`
  ].join("\n");
}

export async function generateUnderwritingMemo(input: {
  borrower: BorrowerProfile;
  bureauSummary?: BureauSummary;
  gstSummary?: GstSummary;
  bankAnalytics?: BankAnalytics;
  invoiceSummary?: InvoiceSummary;
  tradeMatch?: TradeMatchResult;
  fraudFlags: FraudFlag[];
  decision: DecisionRecommendation;
}): Promise<LlmMemo> {
  const provider = getProvider();
  const prompt = buildPrompt(input);
  const completion = await provider.generate(prompt);
  const strengths = input.decision.topPositiveDrivers.map((driver) => driver.explanation);
  const risks = input.decision.topNegativeDrivers.map((driver) => driver.explanation);
  const contradictions = [
    ...(input.bankAnalytics && input.invoiceSummary && input.bankAnalytics.healthScore > 75 && input.invoiceSummary.authenticityScore < 70
      ? ["Bank evidence is stronger than invoice evidence; analyst should confirm trade proof."]
      : []),
    ...(input.gstSummary && input.gstSummary.status === "ACTIVE" && (input.tradeMatch?.score ?? 0) < 60
      ? ["GST compliance is acceptable but trade-matching evidence remains incomplete."]
      : [])
  ];
  const nextQuestions = [
    ...(input.fraudFlags.some((flag) => flag.code === "RELATED_PARTY_PATTERN")
      ? ["Request supporting explanation for related-party looking bank transfers."]
      : []),
    ...(input.invoiceSummary && !input.invoiceSummary.eWayBillNumber
      ? ["Ask for e-way bill or delivery proof for uploaded invoice."]
      : []),
    ...(input.gstSummary?.status !== "ACTIVE"
      ? ["Confirm the reason for GST status issue before considering further processing."]
      : ["Validate latest sales ageing and stock statement if higher limit is needed."])
  ];

  return {
    summary:
      completion.content.split("\n").slice(0, 3).join(" ") ||
      "Case narrative generated from structured underwriting signals.",
    strengths: strengths.length ? strengths : ["No material strengths extracted."],
    risks: risks.length ? risks : ["No material risks extracted."],
    contradictions: contradictions.length ? contradictions : ["No critical contradictions detected across current evidence."],
    policyExceptions:
      input.decision.recommendation === "APPROVE_WITH_CONDITIONS"
        ? ["Approval should remain conditional until flagged integrity questions are closed."]
        : [],
    nextQuestions,
    disclaimer:
      "LLM output is advisory only. Final underwriting must rely on deterministic checks, scored variables, and analyst review.",
    modelVersion: completion.model,
    promptVersion: "underwriting-memo-v1"
  };
}

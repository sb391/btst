import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import pdfParse from "pdf-parse";

import type {
  OcrDocumentResult,
  OcrPageResult,
  OcrProviderSetting,
  OcrQualitySignals
} from "@/lib/invoice-types";

interface StoredInvoiceFile {
  originalFileName: string;
  mimeType: string;
  storagePath: string;
  checksum: string;
}

interface InvoiceOcrProvider {
  key: string;
  canHandle(file: StoredInvoiceFile): boolean;
  extract(file: StoredInvoiceFile): Promise<OcrDocumentResult | null>;
}

function sanitizeText(raw: string) {
  return raw
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function qualitySignalsFromText(text: string): {
  averageConfidence: number;
  qualitySignals: OcrQualitySignals;
} {
  const alphaCount = (text.match(/[A-Za-z]/g) ?? []).length;
  const numericCount = (text.match(/\d/g) ?? []).length;
  const weirdTokenCount = text
    .split(/\s+/)
    .filter((token) => token.length > 6 && !/[A-Za-z]/.test(token) && /[^A-Za-z0-9]/.test(token)).length;
  const lineCount = text ? text.split("\n").length : 0;
  const hasInvoiceKeywords = /invoice|tax|buyer|supplier|bill to|gstin|total|amount/i.test(text);
  const tokenCount = Math.max(text.split(/\s+/).filter(Boolean).length, 1);
  const noisyTokenRatio = weirdTokenCount / tokenCount;
  const confidence = Math.max(
    0.18,
    Math.min(
      0.96,
      (hasInvoiceKeywords ? 0.32 : 0.12) +
        Math.min(alphaCount / 700, 0.28) +
        Math.min(numericCount / 500, 0.14) +
        Math.min(lineCount / 60, 0.12) -
        noisyTokenRatio * 0.55
    )
  );

  return {
    averageConfidence: Number(confidence.toFixed(2)),
    qualitySignals: {
      lowReadability: confidence < 0.58,
      cutOffRisk: lineCount < 10,
      rotated: false,
      overlappingTextRisk: noisyTokenRatio > 0.12,
      likelyScanned: !hasInvoiceKeywords || confidence < 0.45,
      noisyTokenRatio: Number(noisyTokenRatio.toFixed(2))
    }
  };
}

class PdfTextLayerProvider implements InvoiceOcrProvider {
  key = "pdf-text-layer";

  canHandle(file: StoredInvoiceFile) {
    return file.mimeType.includes("pdf") || file.originalFileName.toLowerCase().endsWith(".pdf");
  }

  async extract(file: StoredInvoiceFile): Promise<OcrDocumentResult | null> {
    try {
      const buffer = await readFile(file.storagePath);
      const parsed = await pdfParse(buffer);
      const text = sanitizeText(parsed.text ?? "");

      if (!text) {
        return null;
      }

      const { averageConfidence, qualitySignals } = qualitySignalsFromText(text);
      const pageCount = Number(parsed.numpages ?? 1) || 1;
      const pages: OcrPageResult[] = Array.from({ length: pageCount }, (_, index) => ({
        pageNumber: index + 1,
        text,
        confidence: averageConfidence
      }));

      return {
        providerKey: this.key,
        providerMode: "text-layer",
        rawText: text,
        pages,
        averageConfidence,
        rawPayload: {
          info: parsed.info ?? {},
          metadata: parsed.metadata ?? null,
          version: parsed.version ?? null
        },
        qualitySignals
      };
    } catch {
      return null;
    }
  }
}

class OpenAiCompatibleVisionProvider implements InvoiceOcrProvider {
  key = "openai-compatible-vision";

  canHandle(file: StoredInvoiceFile) {
    return file.mimeType.startsWith("image/") && Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
  }

  async extract(file: StoredInvoiceFile): Promise<OcrDocumentResult | null> {
    const baseUrl = process.env.LLM_BASE_URL;
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL ?? "gpt-4.1-mini";

    if (!baseUrl || !apiKey) {
      return null;
    }

    try {
      const buffer = await readFile(file.storagePath);
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                "You are an OCR assistant for invoice review. Transcribe only visible text from the invoice. Do not infer missing values."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Read this invoice image carefully and return the visible text in layout order."
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.mimeType};base64,${buffer.toString("base64")}`
                  }
                }
              ]
            }
          ]
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = sanitizeText(payload.choices?.[0]?.message?.content ?? "");

      if (!text) {
        return null;
      }

      const { averageConfidence, qualitySignals } = qualitySignalsFromText(text);

      return {
        providerKey: this.key,
        providerMode: "vision",
        rawText: text,
        pages: [
          {
            pageNumber: 1,
            text,
            confidence: averageConfidence
          }
        ],
        averageConfidence,
        rawPayload: payload as Record<string, unknown>,
        qualitySignals
      };
    } catch {
      return null;
    }
  }
}

class DemoTextFixtureProvider implements InvoiceOcrProvider {
  key = "demo-text-fixture";

  canHandle(file: StoredInvoiceFile) {
    return /demo|sample|mock-invoice/i.test(file.originalFileName);
  }

  async extract(file: StoredInvoiceFile): Promise<OcrDocumentResult | null> {
    const fixturePath = basename(file.storagePath).includes("mock")
      ? "public/demo/mock-invoice.txt"
      : "public/demo/invoice.txt";

    try {
      const text = sanitizeText(await readFile(fixturePath, "utf8"));
      const { averageConfidence, qualitySignals } = qualitySignalsFromText(text);

      return {
        providerKey: this.key,
        providerMode: "fixture",
        rawText: text,
        pages: [
          {
            pageNumber: 1,
            text,
            confidence: averageConfidence
          }
        ],
        averageConfidence,
        rawPayload: {
          fixturePath
        },
        qualitySignals
      };
    } catch {
      return null;
    }
  }
}

class LowConfidenceFallbackProvider implements InvoiceOcrProvider {
  key = "low-confidence-fallback";

  canHandle() {
    return true;
  }

  async extract(file: StoredInvoiceFile): Promise<OcrDocumentResult | null> {
    const rawText = sanitizeText(
      [
        `File name: ${file.originalFileName}`,
        `MIME type: ${file.mimeType}`,
        "The local OCR pipeline could not extract readable invoice text from this file."
      ].join("\n")
    );

    return {
      providerKey: this.key,
      providerMode: "fallback",
      rawText,
      pages: [
        {
          pageNumber: 1,
          text: rawText,
          confidence: 0.24
        }
      ],
      averageConfidence: 0.24,
      rawPayload: {
        reason: "No configured OCR provider could produce structured text."
      },
      qualitySignals: {
        lowReadability: true,
        cutOffRisk: true,
        rotated: false,
        overlappingTextRisk: true,
        likelyScanned: true,
        noisyTokenRatio: 0.8
      }
    };
  }
}

export function getOcrProviderSettings(): OcrProviderSetting[] {
  return [
    {
      key: "pdf-text-layer",
      label: "PDF text-layer extractor",
      description: "Reads embedded text from digital PDFs locally, with no external credentials.",
      configured: true,
      mode: "ready"
    },
    {
      key: "openai-compatible-vision",
      label: "OpenAI-compatible vision OCR",
      description: "Optional image OCR provider for JPG and PNG files when API credentials are configured.",
      configured: Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY),
      mode: process.env.LLM_BASE_URL && process.env.LLM_API_KEY ? "ready" : "stub"
    },
    {
      key: "demo-text-fixture",
      label: "Demo fixture OCR",
      description: "Mock OCR output used for seeded demo reviews and quick local testing.",
      configured: true,
      mode: "ready"
    }
  ];
}

export async function runInvoiceOcr(file: StoredInvoiceFile): Promise<OcrDocumentResult> {
  const providers: InvoiceOcrProvider[] = [
    new DemoTextFixtureProvider(),
    new OpenAiCompatibleVisionProvider(),
    new PdfTextLayerProvider(),
    new LowConfidenceFallbackProvider()
  ];

  for (const provider of providers) {
    if (!provider.canHandle(file)) {
      continue;
    }

    const result = await provider.extract(file);
    if (result) {
      return result;
    }
  }

  return new LowConfidenceFallbackProvider().extract(file) as Promise<OcrDocumentResult>;
}

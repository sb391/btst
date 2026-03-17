import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename } from "node:path";

import type {
  OcrDocumentResult,
  OcrLayoutLine,
  OcrPageResult,
  OcrProviderSetting,
  OcrQualitySignals,
  OcrTextItem
} from "@/lib/invoice-types";

const nodeRequire = createRequire(import.meta.url);

type PdfJsTextContentItem = {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
};

type PdfJsPage = {
  getTextContent(options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PdfJsTextContentItem[] }>;
};

type PdfJsDocument = {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
  getMetadata(): Promise<{
    info?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  } | null>;
  destroy(): void;
};

type PdfJsModule = {
  version: string;
  disableWorker: boolean;
  getDocument(data: Buffer): Promise<PdfJsDocument>;
};

let pdfJsModule: PdfJsModule | null = null;

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

function getPdfJs() {
  if (!pdfJsModule) {
    pdfJsModule = nodeRequire("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js") as PdfJsModule;
  }

  return pdfJsModule;
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

function buildLayoutPage(
  pageNumber: number,
  items: PdfJsTextContentItem[]
): {
  text: string;
  layoutItems: OcrTextItem[];
  layoutLines: OcrLayoutLine[];
} {
  const legacyText = (() => {
    let lastY: number | undefined;
    let text = "";

    for (const item of items) {
      const value = item.str ?? "";

      if (!value.trim()) {
        continue;
      }

      if (lastY === undefined || lastY === item.transform?.[5]) {
        text += value;
      } else {
        text += `\n${value}`;
      }

      lastY = item.transform?.[5];
    }

    return sanitizeText(text);
  })();

  const layoutItems = items
    .map((item) => ({
      text: item.str,
      x: Number((item.transform?.[4] ?? 0).toFixed(2)),
      y: Number((item.transform?.[5] ?? 0).toFixed(2)),
      width: Number((item.width ?? 0).toFixed(2)),
      height: Number(Math.abs(item.height ?? item.transform?.[0] ?? 0).toFixed(2))
    }))
    .filter((item) => Boolean(item.text?.trim()))
    .sort((left, right) => {
      if (Math.abs(left.y - right.y) > 2) {
        return right.y - left.y;
      }

      return left.x - right.x;
    });

  const layoutLines: OcrLayoutLine[] = [];

  for (const item of layoutItems) {
    const previousLine = layoutLines[layoutLines.length - 1];

    if (previousLine && Math.abs(previousLine.y - item.y) <= Math.max(2, item.height * 0.55 || 2)) {
      const currentRight = previousLine.x + previousLine.width;
      const gap = item.x - currentRight;

      if (gap > 72) {
        layoutLines.push({
          text: item.text,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height
        });
        continue;
      }

      previousLine.text += gap > 3 ? ` ${item.text}` : item.text;
      previousLine.width = Number(Math.max(previousLine.width, item.x + item.width - previousLine.x).toFixed(2));
      previousLine.height = Number(Math.max(previousLine.height, item.height).toFixed(2));
      continue;
    }

    layoutLines.push({
      text: item.text,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height
    });
  }

  return {
    text: legacyText,
    layoutItems,
    layoutLines: layoutLines.map((line) => ({
      ...line,
      text: sanitizeText(line.text)
    }))
  };
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
      const PDFJS = getPdfJs();
      PDFJS.disableWorker = true;
      const document = await PDFJS.getDocument(buffer);
      const metadata = await document.getMetadata().catch(() => null);
      const pages: OcrPageResult[] = [];

      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const textContent = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: true
        });
        const builtPage = buildLayoutPage(pageNumber, textContent.items);
        const pageConfidence = qualitySignalsFromText(builtPage.text).averageConfidence;

        pages.push({
          pageNumber,
          text: builtPage.text,
          confidence: pageConfidence,
          layoutItems: builtPage.layoutItems,
          layoutLines: builtPage.layoutLines
        });
      }

      const text = sanitizeText(pages.map((page) => page.text).join("\n\n"));

      if (!text) {
        document.destroy();
        return null;
      }

      const { averageConfidence, qualitySignals } = qualitySignalsFromText(text);
      document.destroy();

      return {
        providerKey: this.key,
        providerMode: "text-layer",
        rawText: text,
        pages,
        averageConfidence,
        rawPayload: {
          info: metadata?.info ?? {},
          metadata: metadata?.metadata ?? null,
          version: PDFJS.version,
          pageCount: pages.length
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

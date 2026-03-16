# Invoice Intelligence Workbench

Internal, local-first analyst workbench for invoice OCR, extraction, validation, scoring, and AI-assisted review.

## What It Does

The app lets an analyst upload an invoice PDF or image and then:

- stores the file locally
- runs OCR behind a provider abstraction
- extracts visible invoice fields into structured data
- shows raw OCR text and structured fields side by side
- runs deterministic validation rules
- computes transparent invoice scores
- generates an analyst-style AI review memo
- stores the review locally for later search and manual analyst notes

This is an analyst-assist tool, not a legal conclusion engine.

## Product Scope

Focused only on invoice intelligence:

- upload and preview invoices
- OCR/document extraction
- structured invoice field extraction
- validation checks and anomaly detection
- explainable scoring
- AI review memo
- analyst notes and manual decision
- local review history

Not included:

- borrower underwriting
- bank statement analysis
- GST API integrations beyond local format logic
- loan decisioning
- trade-finance workflow orchestration

## Architecture

Main modules:

- `src/server/services/invoice-upload-service.ts`
- `src/server/services/invoice-ocr-service.ts`
- `src/server/services/invoice-normalization-service.ts`
- `src/server/services/invoice-validation-rules-engine.ts`
- `src/server/services/invoice-scoring-engine.ts`
- `src/server/services/invoice-ai-review-service.ts`
- `src/server/services/invoice-review-orchestrator.ts`
- `src/server/repositories/invoice-review-repository.ts`

UI routes:

- `/` new invoice review
- `/reviews` review history / search
- `/reviews/[reviewId]` invoice review detail
- `/settings` OCR provider status / config stub

## Tech Stack

- Next.js 14
- React + TypeScript
- Tailwind + lightweight UI primitives
- Prisma
- SQLite for local MVP persistence
- local filesystem for file storage
- Zod for request validation
- Vitest for service tests

## Data Model

SQLite-backed invoice review tables:

- `invoice_reviews`
- `uploaded_files`
- `extracted_fields`
- `extracted_line_items`
- `validation_results`
- `scores`
- `ai_reviews`
- `analyst_notes`
- `audit_logs`

## OCR Approach

OCR is abstracted behind providers:

- `pdf-text-layer`
  - local extractor for digital PDFs with embedded text
- `openai-compatible-vision`
  - optional image OCR path when API credentials are configured
- `demo-text-fixture`
  - seeded demo OCR output for quick local testing
- `low-confidence-fallback`
  - explicit low-confidence fallback when readable text is unavailable

Without external OCR credentials, the app still works locally for:

- digital PDFs with text layers
- seeded demo invoices
- low-confidence fallback review of hard-to-read files

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Prepare local database

```bash
npx prisma generate
npm run db:push
npm run db:seed
```

3. Start the app

```bash
npm run dev
```

4. Open:

- `http://127.0.0.1:3000`

## Environment

Use `.env.example` as the starting point.

Important variables:

- `DATABASE_URL=file:./dev.db`
- `APP_STORAGE_DIR=./storage/uploads`
- `LLM_PROVIDER=mock`
- `LLM_BASE_URL=`
- `LLM_API_KEY=`
- `LLM_MODEL=gpt-4.1-mini`

If `LLM_BASE_URL` and `LLM_API_KEY` are configured, the app can use an OpenAI-compatible endpoint for image OCR and AI review. Otherwise it uses mock/template review output.

## Demo Data

Seeded assets:

- `public/demo/mock-invoice.svg`
- `public/demo/mock-invoice.txt`

Seeded review:

- `INVREV-DEMO-001`

## Tests

Run:

```bash
npm test
```

Current coverage includes:

- field normalization
- validation failures for tax mismatch
- invalid GSTIN detection
- low-confidence score handling

## Docker

Build and run:

```bash
docker compose up --build
```

The container uses SQLite and local storage for the MVP.

## Limitations

- True scanned-PDF OCR quality depends on the configured provider
- Layout understanding is heuristic in the local fallback path
- Signature/stamp detection is keyword-based unless vision OCR is configured
- Table extraction is reliable only when OCR text quality is decent
- AI review defaults to a deterministic template when no LLM credentials are configured

## Future Roadmap

- stronger OCR for scanned PDFs
- better table structure extraction
- bounding-box level field highlighting
- duplicate invoice detection across history
- analyst assignment and RBAC
- side-by-side extraction confidence visualization
- provider-level benchmarking and audit trails

# Underwriting Intelligence Workbench

Internal, local-first web application for AI-assisted credit underwriting and invoice / trade verification in Indian supply-chain finance workflows.

## What it does

- Builds a structured underwriting case file from bureau, GST, bank statement, and invoice evidence.
- Separates extracted facts, deterministic validations, configurable scorecards, and LLM-generated narrative reasoning.
- Supports analyst review workflows with audit logs, notes, overrides, and final decision capture.
- Includes a dedicated invoice / trade verification module with authenticity checks, trade matching, and fraud flags.

## Architecture

- Frontend: Next.js App Router, React, TypeScript, Tailwind, shadcn-style component primitives, Recharts
- Backend: Next.js route handlers with modular domain services
- Database: PostgreSQL + Prisma
- Storage: local filesystem abstraction under `APP_STORAGE_DIR`
- Validation: Zod
- Testing: Vitest

### Service boundaries

- `document-ingestion-service`: local file persistence with checksums
- `ocr-extraction-service`: text extraction fallback for PDFs, CSVs, and images
- `bureau-parser-service`: bureau field extraction
- `gst-integration-service`: env-configured GST provider abstraction with stub mode
- `bank-analytics-service`: transaction parsing and bank health analytics
- `scoring-engine`: configurable underwriting scores and policy rules
- `llm-reasoning-service`: provider abstraction for memo generation
- `invoice-intelligence-service`: invoice extraction, validation, and scoring
- `trade-matching-service`: cross-document trade validation logic
- `fraud-rules-engine`: fraud and integrity flag generation
- `audit-log-service`: auditable event capture

## Data model

Core schema entities:

- `Borrower`
- `UnderwritingCase`
- `UploadedDocument`
- `ExtractedField`
- `BureauSummary`
- `GstSummary`
- `BankAnalytics`
- `InvoiceRecord`
- `TradeVerification`
- `FraudFlag`
- `ScoreSnapshot`
- `LlmMemo`
- `AnalystDecision`
- `RepaymentOutcome`
- `PolicyConfig`
- `ModelVersion`
- `PromptVersion`
- `AuditLog`

## Local setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ or Docker Desktop

### Environment

1. Copy `.env.example` to `.env`
2. Adjust `DATABASE_URL`
3. Optionally configure:
   - `GST_API_BASE_URL`
   - `GST_API_KEY`
   - `LLM_PROVIDER`
   - `LLM_BASE_URL`
   - `LLM_API_KEY`

### Run locally

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Run with Docker

```bash
docker compose up --build
```

## Demo data and sample documents

- Seeded case: `UW-IND-2026-001`
- Sample files:
  - `public/demo/bureau-report.txt`
  - `public/demo/bank-statement.csv`
  - `public/demo/invoice.txt`

## Tests

```bash
pnpm test
```

Included coverage targets:

- scoring engine
- bureau parser
- fraud rules

## Security and compliance notes

- Internal-use warning banner in UI
- Role split placeholder: `ADMIN` vs `ANALYST`
- No hardcoded external secrets
- Local file storage abstraction for future encryption and cloud migration
- Audit trail for uploads, scoring refreshes, notes, and analyst decisions
- Schema is ready for deletion / archival lifecycle flows

## Limitations in this MVP

- OCR is intentionally lightweight and uses fallback extraction heuristics rather than full production OCR
- GST integration defaults to stub mode unless provider env vars are configured
- Authentication is placeholder RBAC rather than full SSO
- E-way bill and PO integrations are scaffolded logically, not fully live-connected
- No production-grade background queue yet; inline queue abstraction is provided

## Future roadmap

- Full OCR stack with document templates and confidence calibration
- SSO + real RBAC + encrypted-at-rest file storage
- Supervisory feature logging pipeline and repayment-outcome based model recalibration
- Live GST, e-way bill, anchor ERP, and bank aggregator connectors
- Manual extraction correction workflow persisted back to `ExtractedField`
- Policy simulator and score-weight tuning console

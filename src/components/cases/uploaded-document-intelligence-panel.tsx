import type { CaseWorkspaceData, DocumentRecord, FraudFlag } from "@/lib/types";
import { displayCurrency, displayDate, displayPercent } from "@/lib/format";
import { toTitleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const trackedInputs = [
  { label: "Bureau report", type: "BUREAU_REPORT" },
  { label: "Bank statement", type: "BANK_STATEMENT" },
  { label: "Invoice", type: "INVOICE" }
] as const;

type InputSourceType = "upload" | "demo" | "system" | "missing";

function latestDocument(documents: DocumentRecord[], type: string) {
  return documents.find((document) => document.type === type);
}

function latestUploadedDocument(documents: DocumentRecord[], type: string) {
  return documents.find((document) => document.type === type && document.id.startsWith("local-"));
}

function sourceBadgeVariant(sourceType: InputSourceType) {
  if (sourceType === "upload") return "success" as const;
  if (sourceType === "demo") return "warning" as const;
  if (sourceType === "system") return "secondary" as const;
  return "outline" as const;
}

function activeSource(workspace: CaseWorkspaceData, type: string) {
  const document = latestDocument(workspace.documents, type);

  if (!document) {
    return {
      sourceType: "missing" as const,
      label: "Missing",
      detail: "This input is not available yet."
    };
  }

  if (document.id.startsWith("local-")) {
    return {
      sourceType: "upload" as const,
      label: "Your upload",
      detail: document.name
    };
  }

  return {
    sourceType: "demo" as const,
    label: "Sample placeholder",
    detail: document.name
  };
}

function gstSource(workspace: CaseWorkspaceData) {
  if (!workspace.gstSummary) {
    return {
      sourceType: "missing" as const,
      label: "Missing",
      detail: "GST has not been pulled yet."
    };
  }

  return {
    sourceType: "system" as const,
    label: "System pull",
    detail: "GST profile was pulled from the configured provider."
  };
}

function formatTradeStatus(value: string) {
  return toTitleCase(value.replaceAll("_", " "));
}

function invoiceExtractedItems(workspace: CaseWorkspaceData) {
  const invoice = workspace.invoiceSummary;

  if (!invoice) {
    return [];
  }

  return [
    {
      label: "Invoice number",
      present: invoice.invoiceNumber !== "UNKNOWN-INVOICE",
      value: invoice.invoiceNumber
    },
    {
      label: "Invoice date",
      present: Boolean(invoice.invoiceDate),
      value: displayDate(invoice.invoiceDate)
    },
    {
      label: "Supplier name",
      present: !/^unknown/i.test(invoice.supplierName),
      value: invoice.supplierName
    },
    {
      label: "Buyer name",
      present: !/^unknown/i.test(invoice.buyerName),
      value: invoice.buyerName
    },
    {
      label: "Supplier GSTIN",
      present: Boolean(invoice.supplierGstin),
      value: invoice.supplierGstin ?? "Not found"
    },
    {
      label: "Buyer GSTIN",
      present: Boolean(invoice.buyerGstin),
      value: invoice.buyerGstin ?? "Not found"
    },
    {
      label: "Taxable value",
      present: invoice.taxableValue > 0,
      value: displayCurrency(invoice.taxableValue)
    },
    {
      label: "Invoice total",
      present: invoice.totalValue > 0,
      value: displayCurrency(invoice.totalValue)
    },
    {
      label: "Tax breakup",
      present: invoice.taxBreakup.length > 0,
      value: invoice.taxBreakup.length
        ? invoice.taxBreakup.map((item) => `${item.label} ${displayCurrency(item.amount)}`).join(", ")
        : "Not found"
    },
    {
      label: "Line items",
      present: invoice.lineItems.length > 0,
      value: invoice.lineItems.length
        ? `${invoice.lineItems.length} extracted`
        : "No line items extracted"
    },
    {
      label: "HSN / SAC",
      present: invoice.hsnSac.length > 0,
      value: invoice.hsnSac.length ? invoice.hsnSac.join(", ") : "Not found"
    },
    {
      label: "Vehicle number",
      present: Boolean(invoice.vehicleNumber),
      value: invoice.vehicleNumber ?? "Not found"
    },
    {
      label: "E-way bill",
      present: Boolean(invoice.eWayBillNumber),
      value: invoice.eWayBillNumber ?? "Not found"
    }
  ];
}

function invoiceSummaryText(workspace: CaseWorkspaceData) {
  const invoice = workspace.invoiceSummary;

  if (!invoice) {
    return "No invoice intelligence is available yet.";
  }

  if (invoice.extractionConfidence < 0.65) {
    return "The system recognized this as an invoice-like document, but the read is weak. Several core fields could not be extracted confidently from your upload.";
  }

  if (invoice.flags.length) {
    return "The invoice was read with moderate confidence, but anomalies or gaps were detected and should be reviewed by an analyst.";
  }

  return "The invoice was read with usable confidence and the extracted fields look directionally consistent for first-pass review.";
}

function fraudBadgeVariant(severity: FraudFlag["severity"]) {
  if (severity === "RED") return "danger" as const;
  if (severity === "AMBER") return "warning" as const;
  return "success" as const;
}

function SmallFact({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function ConfidenceBlock({
  label,
  value,
  hint
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{Math.round(value)} / 100</p>
      </div>
      <Progress value={value} className="mt-3" />
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function UploadedInvoiceCard({
  workspace,
  document
}: {
  workspace: CaseWorkspaceData;
  document: DocumentRecord;
}) {
  const invoice = workspace.invoiceSummary;

  if (!invoice) {
    return null;
  }

  const extracted = invoiceExtractedItems(workspace);
  const extractedNow = extracted.filter((item) => item.present);
  const missing = extracted.filter((item) => !item.present).map((item) => item.label);
  const invoiceFlags = workspace.fraudFlags.filter((flag) => flag.module === "Invoice" || flag.module === "Trade");
  const tradeIsUsable = workspace.tradeMatch && workspace.tradeMatch.status !== "INSUFFICIENT_DATA";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Invoice intelligence from your upload</CardTitle>
          <Badge variant="success">Your upload</Badge>
        </div>
        <CardDescription>
          This section is built from your latest uploaded invoice file only. It does not show demo invoice values.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Latest invoice file used</p>
          <p className="mt-2 text-base font-medium text-slate-900">{document.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{invoiceSummaryText(workspace)}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <ConfidenceBlock
            label="Read confidence"
            value={invoice.extractionConfidence * 100}
            hint="How confidently the parser could read this invoice file."
          />
          <ConfidenceBlock
            label="Completeness score"
            value={invoice.completenessScore}
            hint="How many expected invoice fields were present."
          />
          <ConfidenceBlock
            label="Authenticity score"
            value={invoice.authenticityScore}
            hint="Rule-based view of how internally reliable this invoice looks."
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">What was extracted from your invoice</p>
            <div className="mt-4 grid gap-3">
              {extractedNow.length ? (
                extractedNow.map((item) => (
                  <SmallFact key={item.label} label={item.label} value={item.value} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No critical invoice fields were extracted with usable confidence.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">What was not extracted confidently</p>
            <div className="mt-4 space-y-2">
              {missing.length ? (
                missing.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    - {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No major invoice fields are currently missing from the extract.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">Risk flags raised from this invoice</p>
            <div className="mt-4 space-y-3">
              {invoiceFlags.length ? (
                invoiceFlags.map((flag) => (
                  <div key={flag.code} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant={fraudBadgeVariant(flag.severity)}>{flag.severity}</Badge>
                      <p className="text-sm font-medium text-slate-900">{flag.code}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{flag.reason}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No invoice-specific fraud or integrity flags were triggered.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">What this upload added to the case</p>
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                The invoice module contributed an authenticity score of {Math.round(invoice.authenticityScore)} and a completeness score of {Math.round(invoice.completenessScore)} to the overall case.
              </p>
              <p className="text-sm text-muted-foreground">
                {tradeIsUsable && workspace.tradeMatch
                  ? `The case-level trade cross-check is ${formatTradeStatus(workspace.tradeMatch.status).toLowerCase()} with score ${workspace.tradeMatch.score}. This cross-check uses the invoice plus other case context such as GST and anchor metadata.`
                  : "Case-level trade cross-check is being treated as insufficient because the invoice extraction itself is not strong enough yet."}
              </p>
              <p className="text-sm text-muted-foreground">
                {invoice.flags.length
                  ? `Invoice anomalies detected: ${invoice.flags.join("; ")}.`
                  : "No obvious invoice anomalies were raised by the current rule set."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UploadedBureauCard({
  workspace,
  document
}: {
  workspace: CaseWorkspaceData;
  document: DocumentRecord;
}) {
  const bureau = workspace.bureauSummary;

  if (!bureau) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Bureau intelligence from your upload</CardTitle>
          <Badge variant="success">Your upload</Badge>
        </div>
        <CardDescription>{document.name}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SmallFact label="Bureau score" value={bureau.score ? String(bureau.score) : "Not available"} />
        <SmallFact label="Active loans" value={String(bureau.activeLoans)} />
        <SmallFact label="Overdue history" value={String(bureau.overdueHistory)} />
        <SmallFact
          label="Credit utilization"
          value={bureau.creditUtilization !== null ? displayPercent(bureau.creditUtilization) : "Not available"}
        />
      </CardContent>
    </Card>
  );
}

function UploadedBankCard({
  workspace,
  document
}: {
  workspace: CaseWorkspaceData;
  document: DocumentRecord;
}) {
  const bank = workspace.bankAnalytics;

  if (!bank) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>Bank intelligence from your upload</CardTitle>
          <Badge variant="success">Your upload</Badge>
        </div>
        <CardDescription>{document.name}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SmallFact label="Health score" value={String(Math.round(bank.healthScore))} />
        <SmallFact label="Average balance" value={displayCurrency(bank.averageBalance)} />
        <SmallFact label="Bounce signals" value={String(bank.chequeBounceCount + bank.emiBounceCount)} />
        <SmallFact
          label="Top counterparty"
          value={bank.topCounterparties[0]?.name ?? "Not available"}
        />
      </CardContent>
    </Card>
  );
}

export function UploadedDocumentIntelligencePanel({
  workspace
}: {
  workspace: CaseWorkspaceData;
}) {
  const bureauUpload = latestUploadedDocument(workspace.documents, "BUREAU_REPORT");
  const bankUpload = latestUploadedDocument(workspace.documents, "BANK_STATEMENT");
  const invoiceUpload = latestUploadedDocument(workspace.documents, "INVOICE");
  const activeSources = [
    ...trackedInputs.map((input) => ({
      inputLabel: input.label,
      source: activeSource(workspace, input.type)
    })),
    {
      inputLabel: "GST profile",
      source: gstSource(workspace)
    }
  ];
  const sampleInputs = activeSources.filter((item) => item.source.sourceType === "demo");

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">2. What did your upload actually produce?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This section shows only intelligence created from your own uploaded files. It is the clearest place to see what the app really extracted.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current input reality</CardTitle>
          <CardDescription>
            Each case input is marked as your upload, a sample placeholder, a system pull, or missing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {activeSources.map((item) => (
              <div key={item.inputLabel} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{item.inputLabel}</p>
                  <Badge variant={sourceBadgeVariant(item.source.sourceType)}>{item.source.label}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.source.detail}</p>
              </div>
            ))}
          </div>
          {sampleInputs.length ? (
            <div className="rounded-[22px] border border-warning/20 bg-warning/10 p-4">
              <p className="font-medium text-slate-900">Important</p>
              <p className="mt-2 text-sm text-slate-700">
                This demo case is still using sample placeholders for {sampleInputs.map((item) => item.inputLabel.toLowerCase()).join(", ")}. The cards below focus on your own uploaded files so you can separate real extraction from seeded sample data.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {invoiceUpload ? <UploadedInvoiceCard workspace={workspace} document={invoiceUpload} /> : null}
      {bureauUpload ? <UploadedBureauCard workspace={workspace} document={bureauUpload} /> : null}
      {bankUpload ? <UploadedBankCard workspace={workspace} document={bankUpload} /> : null}

      {!invoiceUpload && !bureauUpload && !bankUpload ? (
        <Card>
          <CardHeader>
            <CardTitle>No uploaded document intelligence yet</CardTitle>
            <CardDescription>
              Upload a bureau report, bank statement, or invoice above and this section will show exactly what was extracted from your file.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}
    </section>
  );
}

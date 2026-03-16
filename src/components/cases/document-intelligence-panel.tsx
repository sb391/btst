import type { CaseWorkspaceData, DocumentRecord } from "@/lib/types";
import { displayCurrency, displayPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function latestDocument(documents: DocumentRecord[], type: string) {
  return documents.find((document) => document.type === type);
}

function sectionFields(workspace: CaseWorkspaceData, section: string) {
  return workspace.extractedFields.filter((field) => field.section === section);
}

function statusVariant(status: string) {
  if (status === "READY" || status === "PROCESSED") return "success" as const;
  if (status === "PROCESSING") return "warning" as const;
  return "outline" as const;
}

function sourceVariant(sourceType: "upload" | "demo" | "system" | "missing") {
  if (sourceType === "upload") return "success" as const;
  if (sourceType === "demo") return "warning" as const;
  if (sourceType === "system") return "outline" as const;
  return "outline" as const;
}

function documentSource(workspace: CaseWorkspaceData, type: string) {
  const document = latestDocument(workspace.documents, type);

  if (!document) {
    return {
      status: "MISSING",
      sourceType: "missing" as const,
      sourceLabel: "Not yet available",
      sourceDetail: "Nothing has been uploaded for this input yet."
    };
  }

  if (document.id.startsWith("local-")) {
    return {
      status: document.status,
      sourceType: "upload" as const,
      sourceLabel: "Your uploaded file",
      sourceDetail: document.name
    };
  }

  return {
    status: document.status,
    sourceType: "demo" as const,
    sourceLabel: "Demo baseline",
    sourceDetail: document.name
  };
}

function gstSource(workspace: CaseWorkspaceData) {
  if (!workspace.gstSummary) {
    return {
      status: "MISSING",
      sourceType: "missing" as const,
      sourceLabel: "Not yet pulled",
      sourceDetail: "GST intelligence has not been pulled yet."
    };
  }

  return {
    status: "READY",
    sourceType: "system" as const,
    sourceLabel: "GST provider pull",
    sourceDetail: "Pulled through the configured GST integration (mock provider in this local MVP)."
  };
}

function InsightRow({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-background/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value}</p>
    </div>
  );
}

function IntelligenceCard({
  title,
  status,
  sourceLabel,
  sourceDetail,
  sourceType,
  summary,
  details,
  extractedFields,
  notes
}: {
  title: string;
  status: string;
  sourceLabel: string;
  sourceDetail: string;
  sourceType: "upload" | "demo" | "system" | "missing";
  summary: string;
  details: Array<{ label: string; value: string }>;
  extractedFields: Array<{ field: string; value: string }>;
  notes: string[];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant={statusVariant(status)}>{status}</Badge>
          <Badge variant={sourceVariant(sourceType)}>{sourceLabel}</Badge>
        </div>
        <CardDescription>{summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">What this card is using</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{sourceDetail}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {details.map((detail) => (
            <InsightRow key={`${title}-${detail.label}`} label={detail.label} value={detail.value} />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">What was actually extracted</p>
          {extractedFields.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {extractedFields.map((field) => (
                <div key={`${title}-${field.field}`} className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{field.field}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{field.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No structured extraction has been created for this input yet.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">What this tells us</p>
          {notes.length ? (
            notes.map((note) => (
              <p key={note} className="text-sm text-muted-foreground">
                - {note}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Upload this document to see the intelligence built from it.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentIntelligencePanel({
  workspace
}: {
  workspace: CaseWorkspaceData;
}) {
  const bureauSource = documentSource(workspace, "BUREAU_REPORT");
  const bankSource = documentSource(workspace, "BANK_STATEMENT");
  const invoiceSource = documentSource(workspace, "INVOICE");
  const gstInsightSource = gstSource(workspace);
  const bureau = workspace.bureauSummary;
  const gst = workspace.gstSummary;
  const bank = workspace.bankAnalytics;
  const invoice = workspace.invoiceSummary;
  const bureauFields = sectionFields(workspace, "Bureau").slice(0, 6);
  const gstFields = sectionFields(workspace, "GST").slice(0, 6);
  const bankFields = sectionFields(workspace, "Bank").slice(0, 6);
  const invoiceFields = sectionFields(workspace, "Invoice").slice(0, 6);

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight text-slate-900">2. Intelligence from each document</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          After each upload, the app extracts structured variables and turns them into an analyst-friendly summary.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source map</CardTitle>
          <CardDescription>
            This tells you which parts of the current screen come from your upload versus the seeded demo baseline.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Bureau", source: bureauSource },
            { label: "GST", source: gstInsightSource },
            { label: "Bank", source: bankSource },
            { label: "Invoice", source: invoiceSource }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900">{item.label}</p>
                <Badge variant={sourceVariant(item.source.sourceType)}>{item.source.sourceLabel}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.source.sourceDetail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <IntelligenceCard
          title="Bureau report"
          status={bureau ? bureauSource.status : "MISSING"}
          sourceLabel={bureauSource.sourceLabel}
          sourceDetail={bureauSource.sourceDetail}
          sourceType={bureauSource.sourceType}
          summary={
            bureau
              ? `We read the bureau report and extracted repayment behaviour, utilization, and derogatory markers.`
              : `Upload the bureau report to extract score, DPD history, utilization, and enquiry behaviour.`
          }
          details={[
            { label: "Bureau score", value: bureau?.score ? String(bureau.score) : "Not available" },
            { label: "Active loans", value: bureau ? String(bureau.activeLoans) : "Not available" },
            { label: "Overdue accounts", value: bureau ? String(bureau.overdueHistory) : "Not available" },
            {
              label: "Credit utilization",
              value: bureau?.creditUtilization !== null && bureau?.creditUtilization !== undefined
                ? displayPercent(bureau.creditUtilization)
                : "Not available"
            }
          ]}
          extractedFields={bureauFields.map((field) => ({
            field: field.field,
            value: field.correctedValue ?? field.value
          }))}
          notes={
            bureau
              ? [
                  bureauSource.sourceType === "demo"
                    ? "These bureau values are pre-filled demo values, not from your own uploaded bureau report."
                    : "These bureau values are from your uploaded bureau report.",
                  bureau.score && bureau.score >= 750
                    ? "Bureau quality looks strong for first-pass underwriting."
                    : "Bureau quality is moderate and needs more analyst attention.",
                  bureau.overdueHistory > 0
                    ? "There is overdue history that can directly affect approval comfort."
                    : "No material overdue history was found in the structured extract.",
                  bureau.writtenOff || bureau.settled
                    ? "Derogatory markers exist and should be treated as a serious policy concern."
                    : "No written-off or settled markers were identified."
                ]
              : []
          }
        />

        <IntelligenceCard
          title="GST profile"
          status={gst ? gstInsightSource.status : "MISSING"}
          sourceLabel={gstInsightSource.sourceLabel}
          sourceDetail={gstInsightSource.sourceDetail}
          sourceType={gstInsightSource.sourceType}
          summary={
            gst
              ? `We pulled GST profile data and summarized compliance, filing behaviour, and business stability indicators.`
              : `Pull GST data to understand compliance regularity, status, turnover proxies, and registration vintage.`
          }
          details={[
            { label: "GST status", value: gst?.status ?? "Not available" },
            { label: "Legal name", value: gst?.legalName ?? "Not available" },
            {
              label: "Filing regularity",
              value: gst ? `${gst.filingRegularity}%` : "Not available"
            },
            {
              label: "Turnover proxy",
              value: gst ? displayCurrency(gst.turnoverProxy) : "Not available"
            }
          ]}
          extractedFields={gstFields.map((field) => ({
            field: field.field,
            value: field.correctedValue ?? field.value
          }))}
          notes={
            gst
              ? [
                  "GST is not a manual upload on this screen. It comes from the configured GST pull.",
                  gst.status === "ACTIVE"
                    ? "The GST registration appears active, which is a strong baseline signal."
                    : "GST status is not active, which can block invoice-backed credit.",
                  gst.filingRegularity >= 85
                    ? "Return filing looks regular and supports operational discipline."
                    : "Return filing behaviour is weaker than the comfort range.",
                  `GST health score currently stands at ${Math.round(gst.healthScore)}.`
                ]
              : []
          }
        />

        <IntelligenceCard
          title="Bank statement"
          status={bank ? bankSource.status : "MISSING"}
          sourceLabel={bankSource.sourceLabel}
          sourceDetail={bankSource.sourceDetail}
          sourceType={bankSource.sourceType}
          summary={
            bank
              ? `We analyzed transaction behaviour to understand liquidity, consistency, bounce events, and cash-flow strength.`
              : `Upload the bank statement to see transaction-level intelligence such as credits, balances, bounces, and counterparties.`
          }
          details={[
            { label: "Bank health score", value: bank ? String(Math.round(bank.healthScore)) : "Not available" },
            { label: "Average balance", value: bank ? displayCurrency(bank.averageBalance) : "Not available" },
            {
              label: "Bounce signals",
              value: bank ? String(bank.chequeBounceCount + bank.emiBounceCount) : "Not available"
            },
            {
              label: "Cash deposit ratio",
              value: bank ? `${bank.cashDepositRatio}%` : "Not available"
            }
          ]}
          extractedFields={bankFields.map((field) => ({
            field: field.field,
            value: field.correctedValue ?? field.value
          }))}
          notes={
            bank
              ? [
                  bankSource.sourceType === "demo"
                    ? "These bank insights are still demo baseline values because you have not uploaded your own bank statement yet."
                    : "These bank insights are from your uploaded statement.",
                  bank.healthScore >= 75
                    ? "Banking behaviour looks reasonably stable for a working-capital style facility."
                    : "Banking behaviour is more volatile than ideal and should be reviewed carefully.",
                  bank.chequeBounceCount + bank.emiBounceCount > 0
                    ? "Bounce or return events were detected and reduce conduct comfort."
                    : "No bounce signals were detected in the parsed statement.",
                  bank.topCounterparties[0]
                    ? `The largest visible counterparty is ${bank.topCounterparties[0].name}.`
                    : "Counterparty concentration is not yet visible."
                ]
              : []
          }
        />

        <IntelligenceCard
          title="Invoice"
          status={invoice ? invoiceSource.status : "MISSING"}
          sourceLabel={invoiceSource.sourceLabel}
          sourceDetail={invoiceSource.sourceDetail}
          sourceType={invoiceSource.sourceType}
          summary={
            invoice
              ? `We extracted invoice fields and checked whether the document looks authentic and internally consistent.`
              : `Upload the invoice to extract core fields and run invoice authenticity checks.`
          }
          details={[
            { label: "Invoice number", value: invoice?.invoiceNumber ?? "Not available" },
            { label: "Supplier", value: invoice?.supplierName ?? "Not available" },
            { label: "Buyer", value: invoice?.buyerName ?? "Not available" },
            {
              label: "Authenticity score",
              value: invoice ? String(Math.round(invoice.authenticityScore)) : "Not available"
            }
          ]}
          extractedFields={invoiceFields.map((field) => ({
            field: field.field,
            value: field.correctedValue ?? field.value
          }))}
          notes={
            invoice
              ? [
                  invoiceSource.sourceType === "upload"
                    ? "These invoice values are from your uploaded invoice file."
                    : "These invoice values are from the demo baseline invoice, not your file.",
                  `The invoice total is ${displayCurrency(invoice.totalValue)} and the taxable value is ${displayCurrency(invoice.taxableValue)}.`,
                  invoice.eWayBillNumber
                    ? "Shipment trace evidence is present through the e-way bill field."
                    : "No e-way bill was found, so shipment trace remains weaker.",
                  invoice.flags.length
                    ? `Detected issues: ${invoice.flags.join("; ")}.`
                    : "No obvious formatting or mathematical anomalies were detected."
                ]
              : []
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Raw extracted fields</CardTitle>
          <CardDescription>
            This is the raw structured data currently extracted from all uploaded documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspace.extractedFields.slice(0, 12).map((field) => (
            <div key={`${field.section}-${field.field}`} className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {field.section}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">{field.field}</p>
              <p className="mt-1 text-sm text-muted-foreground">{field.correctedValue ?? field.value}</p>
            </div>
          ))}
          {workspace.extractedFields.length > 12 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
              + {workspace.extractedFields.length - 12} more extracted fields available in the advanced review pages.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

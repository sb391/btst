import type { CaseWorkspaceData } from "@/lib/types";
import { displayCurrency } from "@/lib/format";
import { toTitleCase } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function recommendationLabel(value: string) {
  return toTitleCase(value.replaceAll("_", " "));
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.6) return "Moderate";
  return "Low";
}

function latestDocumentSource(workspace: CaseWorkspaceData, type: string) {
  const document = workspace.documents.find((item) => item.type === type);

  if (!document) {
    return {
      label: "Missing",
      type: "missing" as const,
      detail: "Not available yet."
    };
  }

  if (document.id.startsWith("local-")) {
    return {
      label: "Your upload",
      type: "upload" as const,
      detail: document.name
    };
  }

  return {
    label: "Demo baseline",
    type: "demo" as const,
    detail: document.name
  };
}

function sourceVariant(type: "upload" | "demo" | "system" | "missing") {
  if (type === "upload") return "success" as const;
  if (type === "demo") return "warning" as const;
  return "outline" as const;
}

export function CombinedIntelligencePanel({
  workspace
}: {
  workspace: CaseWorkspaceData;
}) {
  const bureauSource = latestDocumentSource(workspace, "BUREAU_REPORT");
  const bankSource = latestDocumentSource(workspace, "BANK_STATEMENT");
  const invoiceSource = latestDocumentSource(workspace, "INVOICE");
  const gstSource = workspace.gstSummary
    ? {
        label: "GST pull",
        type: "system" as const,
        detail: "Configured GST provider output"
      }
    : {
        label: "Missing",
        type: "missing" as const,
        detail: "Not pulled yet."
      };
  const mixedInputs = [bureauSource, bankSource, invoiceSource].some((source) => source.type === "demo");

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. If we combine your upload with the full case, what do we get?</CardTitle>
        <CardDescription>
          This is the collective underwriting view created from all currently active inputs in the case, including any sample placeholders that are still present.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-[24px] border border-border/70 bg-background/70 p-5">
          <p className="font-medium text-slate-900">What this combined result is using</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Bureau", source: bureauSource },
              { label: "GST", source: gstSource },
              { label: "Bank", source: bankSource },
              { label: "Invoice", source: invoiceSource }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/70 bg-card/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <Badge variant={sourceVariant(item.source.type)}>{item.source.label}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.source.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-border/70 bg-background/70 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{recommendationLabel(workspace.decision.recommendation)}</Badge>
            <Badge variant="outline">Risk grade {workspace.decision.riskGrade}</Badge>
            <Badge variant="outline">Composite score {workspace.decision.compositeScore}</Badge>
            <Badge variant="outline">
              Confidence {confidenceLabel(workspace.decision.confidence)} ({Math.round(workspace.decision.confidence * 100)}%)
            </Badge>
          </div>
          <p className="mt-4 text-base leading-7 text-slate-800">
            {`The current combined recommendation is ${recommendationLabel(workspace.decision.recommendation).toLowerCase()}. The present structure suggests a limit of ${displayCurrency(workspace.decision.recommendedLimit)} for ${workspace.decision.recommendedTenorDays} days, with pricing in the ${workspace.decision.pricingBand} band.`}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {mixedInputs
              ? "Important: this combined conclusion is still mixing your uploaded invoice with sample bureau and/or bank data. Treat it as a blended demo case result, not as a clean conclusion driven only by your files."
              : "This combined conclusion is based on the currently available uploaded or pulled inputs without relying on seeded demo document placeholders."}
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Suggested limit</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {displayCurrency(workspace.decision.recommendedLimit)}
            </p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Suggested tenor</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {workspace.decision.recommendedTenorDays} days
            </p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Pricing band</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{workspace.decision.pricingBand}</p>
          </div>
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Collateral / conditions</p>
            <p className="mt-2 text-base font-semibold text-slate-900">
              {workspace.decision.collateralRequirement}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">What looks good</p>
            <div className="mt-3 space-y-3">
              {workspace.decision.topPositiveDrivers.length ? (
                workspace.decision.topPositiveDrivers.map((driver) => (
                  <div key={driver.label}>
                    <p className="text-sm font-medium text-slate-900">{driver.label}</p>
                    <p className="text-sm text-muted-foreground">{driver.explanation}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Build collective intelligence to see the strongest supporting signals.</p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">What needs analyst attention</p>
            <div className="mt-3 space-y-3">
              {workspace.decision.topNegativeDrivers.length ? (
                workspace.decision.topNegativeDrivers.map((driver) => (
                  <div key={driver.label}>
                    <p className="text-sm font-medium text-slate-900">{driver.label}</p>
                    <p className="text-sm text-muted-foreground">{driver.explanation}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No major negative drivers are visible yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">Triggered rules</p>
            <div className="mt-3 space-y-2">
              {workspace.decision.triggeredRules.length ? (
                workspace.decision.triggeredRules.map((rule) => (
                  <p key={rule} className="text-sm text-muted-foreground">
                    - {rule}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No policy rule output yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">Missing data</p>
            <div className="mt-3 space-y-2">
              {workspace.decision.missingData.length ? (
                workspace.decision.missingData.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    - {item}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No major missing data items currently flagged.</p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background/70 p-5">
            <p className="font-medium text-slate-900">Next analyst questions</p>
            <div className="mt-3 space-y-2">
              {workspace.llmMemo.nextQuestions.length ? (
                workspace.llmMemo.nextQuestions.map((question) => (
                  <p key={question} className="text-sm text-muted-foreground">
                    - {question}
                  </p>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No follow-up questions generated yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-warning/20 bg-warning/10 p-5">
          <p className="font-medium text-slate-900">Important</p>
          <p className="mt-2 text-sm text-slate-700">
            This is an analyst-assist conclusion, not an automatic lending decision. The final call should still be made by the underwriter after reviewing exceptions, missing data, and any fraud flags.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

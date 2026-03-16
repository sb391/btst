"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, UploadCloud } from "lucide-react";

import type { DocumentRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const uploadRows = [
  {
    label: "Bureau report",
    type: "BUREAU_REPORT",
    accept: ".pdf,.txt",
    extracts: "score, DPD history, overdue flags, utilization, enquiries"
  },
  {
    label: "Bank statement",
    type: "BANK_STATEMENT",
    accept: ".csv,.pdf,.txt",
    extracts: "monthly credits, balance behaviour, bounce signals, counterparties"
  },
  {
    label: "Invoice",
    type: "INVOICE",
    accept: ".pdf,.png,.jpg,.jpeg,.txt",
    extracts: "invoice number, buyer/supplier, GSTINs, values, e-way bill, authenticity"
  }
] as const;

function latestDocument(documents: DocumentRecord[], type: string) {
  return documents.find((document) => document.type === type);
}

function statusBadge(status: string) {
  if (status === "PROCESSED" || status === "READY") {
    return "success" as const;
  }

  if (status === "PROCESSING") {
    return "warning" as const;
  }

  return "outline" as const;
}

function sourceBadge(document?: DocumentRecord) {
  if (!document) {
    return {
      label: "Missing",
      variant: "outline" as const
    };
  }

  if (document.id.startsWith("local-")) {
    return {
      label: "Your upload",
      variant: "success" as const
    };
  }

  return {
    label: "Sample placeholder",
    variant: "warning" as const
  };
}

export function DocumentUploadCenter({
  caseId,
  documents,
  hasGstin,
  hasGstSummary
}: {
  caseId: string;
  documents: DocumentRecord[];
  hasGstin: boolean;
  hasGstSummary: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  function setRef(type: string, node: HTMLInputElement | null) {
    refs.current[type] = node;
  }

  async function handleUpload(documentType: string) {
    const input = refs.current[documentType];
    const file = input?.files?.[0];

    if (!file) {
      setMessages((current) => ({ ...current, [documentType]: "Choose a file first." }));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);

    const response = await fetch(`/api/cases/${caseId}/documents`, {
      method: "POST",
      body: formData
    });
    const data = await response.json();

    if (response.ok) {
      await fetch(`/api/cases/${caseId}/underwrite`, {
        method: "POST"
      });
    }

    setMessages((current) => ({
      ...current,
      [documentType]: response.ok
        ? `Uploaded, parsed, and collective intelligence refreshed with ${(data.extractionConfidence * 100).toFixed(0)}% extraction confidence.`
        : data.error ?? "Upload failed."
    }));

    if (response.ok) {
      router.refresh();
    }
  }

  async function handleGstPull() {
    if (!hasGstin) {
      setMessages((current) => ({
        ...current,
        GST_PULL: "Add a borrower GSTIN first to pull GST intelligence."
      }));
      return;
    }

    const response = await fetch(`/api/cases/${caseId}/underwrite`, {
      method: "POST"
    });
    const data = await response.json();

    setMessages((current) => ({
      ...current,
      GST_PULL: response.ok
        ? `GST profile pulled and collective intelligence rebuilt. Current recommendation: ${String(data.decision?.recommendation ?? "updated").replaceAll("_", " ")}.`
        : data.error ?? "Unable to pull GST data."
    }));

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Upload or pull the required inputs</CardTitle>
        <CardDescription>
          Start here. Once a document is uploaded, the app extracts intelligence from it and refreshes the combined underwriting view automatically. The next section will show only what your upload produced.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadRows.map((row) => (
          <div
            key={row.type}
            className="rounded-[22px] border border-border/80 bg-background/70 p-4"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium">{row.label}</p>
                  <Badge variant={statusBadge(latestDocument(documents, row.type)?.status ?? "MISSING")}>
                    {latestDocument(documents, row.type)?.status ?? "MISSING"}
                  </Badge>
                  <Badge variant={sourceBadge(latestDocument(documents, row.type)).variant}>
                    {sourceBadge(latestDocument(documents, row.type)).label}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Accepts {row.accept.replaceAll(",", ", ")}.
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  Intelligence extracted: {row.extracts}.
                </p>
                {latestDocument(documents, row.type) ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Latest file: {latestDocument(documents, row.type)?.name}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  ref={(node) => setRef(row.type, node)}
                  type="file"
                  accept={row.accept}
                  className="max-w-[240px] text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => startTransition(() => handleUpload(row.type))}
                >
                  <UploadCloud className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
            {messages[row.type] ? <p className="mt-3 text-sm text-muted-foreground">{messages[row.type]}</p> : null}
          </div>
        ))}

        <div className="rounded-[22px] border border-border/80 bg-background/70 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <p className="font-medium">GST profile</p>
                <Badge variant={statusBadge(hasGstSummary ? "READY" : "MISSING")}>
                  {hasGstSummary ? "READY" : "MISSING"}
                </Badge>
                <Badge variant={hasGstSummary ? "secondary" : "outline"}>
                  {hasGstSummary ? "System pull" : "Missing"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                No upload needed. The app pulls GST intelligence from the configured provider using the borrower GSTIN.
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Intelligence extracted: legal name, GST status, filing regularity, turnover proxy, tax consistency.
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {hasGstin ? "GSTIN available for pull." : "Borrower GSTIN missing."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={isPending || !hasGstin}
              onClick={() => startTransition(handleGstPull)}
            >
              <DatabaseZap className="h-4 w-4" />
              Pull GST data
            </Button>
          </div>
          {messages.GST_PULL ? <p className="mt-3 text-sm text-muted-foreground">{messages.GST_PULL}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const uploadRows = [
  { label: "Bureau report", type: "BUREAU_REPORT", accept: ".pdf,.txt" },
  { label: "Bank statement", type: "BANK_STATEMENT", accept: ".csv,.pdf,.txt" },
  { label: "Invoice", type: "INVOICE", accept: ".pdf,.png,.jpg,.jpeg,.txt" }
] as const;

export function DocumentUploadCenter({ caseId }: { caseId: string }) {
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

    setMessages((current) => ({
      ...current,
      [documentType]: response.ok
        ? `Processed with ${(data.extractionConfidence * 100).toFixed(0)}% confidence.`
        : data.error ?? "Upload failed."
    }));

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Upload Center</CardTitle>
        <CardDescription>
          Upload source documents for extraction. Files are stored locally in the MVP and processed through modular parsers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {uploadRows.map((row) => (
          <div
            key={row.type}
            className="rounded-[22px] border border-border/80 bg-background/70 p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-medium">{row.label}</p>
                  <Badge variant="outline">{row.type.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Accepts {row.accept.replaceAll(",", ", ")}. OCR fallback is used when structured extraction is not available.
                </p>
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
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function RefreshAnalysisActions({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function call(endpoint: string, successMessage: string) {
    const response = await fetch(endpoint, {
      method: "POST"
    });
    const data = await response.json();
    setMessage(response.ok ? successMessage : data.error ?? "Request failed.");
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2 lg:items-end">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => call(`/api/cases/${caseId}/underwrite`, "Combined intelligence rebuilt."))}
        >
          Build collective intelligence
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => call(`/api/cases/${caseId}/trade-verify`, "Invoice and trade checks refreshed."))}
        >
          Refresh invoice and trade checks
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

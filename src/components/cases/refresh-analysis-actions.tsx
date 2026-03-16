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
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => startTransition(() => call(`/api/cases/${caseId}/underwrite`, "Underwriting analysis refreshed."))}
        >
          Refresh underwriting
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => startTransition(() => call(`/api/cases/${caseId}/trade-verify`, "Trade verification refreshed."))}
        >
          Refresh trade checks
        </Button>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}

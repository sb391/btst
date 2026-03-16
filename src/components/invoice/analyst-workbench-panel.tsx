"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { InvoiceReviewRecord, InvoiceReviewRecommendation } from "@/lib/invoice-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const decisionOptions: Array<{
  value: InvoiceReviewRecommendation;
  label: string;
}> = [
  { value: "LOOKS_IN_ORDER", label: "Looks in order" },
  { value: "MINOR_ISSUES_REVIEW_RECOMMENDED", label: "Minor issues, review recommended" },
  { value: "SUSPICIOUS_OR_INCOMPLETE", label: "Suspicious / incomplete" },
  { value: "LOW_CONFIDENCE_MANUAL_REVIEW_REQUIRED", label: "Low-confidence extraction, manual review required" }
];

export function AnalystWorkbenchPanel({
  review
}: {
  review: InvoiceReviewRecord;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<InvoiceReviewRecommendation | "">(review.analystDecision ?? "");
  const [reason, setReason] = useState(review.analystDecisionReason ?? "");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setIsSaving(true);
    setMessage(null);

    const response = await fetch(`/api/reviews/${review.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        analystDecision: decision || undefined,
        analystDecisionReason: reason || undefined,
        note: note || undefined
      })
    });

    const payload = (await response.json()) as { error?: string };
    setIsSaving(false);

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to save analyst update.");
      return;
    }

    setMessage("Analyst review saved.");
    setNote("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyst Notes and Manual Decision</CardTitle>
        <CardDescription>
          Analysts can capture a manual conclusion without hiding the structured extraction and validation trail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Manual decision</label>
          <select
            value={decision}
            onChange={(event) => setDecision(event.target.value as InvoiceReviewRecommendation)}
            className="w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm"
          >
            <option value="">No override yet</option>
            {decisionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Decision rationale</label>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why are you keeping or overriding the system recommendation?"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-900">Add analyst note</label>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Capture a review observation, missing proof request, or follow-up action."
          />
        </div>

        <Button type="button" onClick={save} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save analyst review"}
        </Button>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-900">Existing analyst notes</p>
          {review.analystNotes.length ? (
            review.analystNotes.map((item) => (
              <div key={item.id} className="rounded-[22px] border border-border/70 bg-background/70 p-4">
                <p className="text-sm text-slate-900">{item.body}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {item.authorName ?? "Analyst"} • {new Date(item.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No analyst notes yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

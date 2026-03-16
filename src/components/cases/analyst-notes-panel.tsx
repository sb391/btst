"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export function AnalystNotesPanel({
  caseId,
  notes
}: {
  caseId: string;
  notes: string[];
}) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function submitNote() {
    const response = await fetch(`/api/cases/${caseId}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ body: value })
    });

    const data = await response.json();
    setMessage(response.ok ? "Note saved." : data.error ?? "Unable to save note.");
    if (response.ok) {
      setValue("");
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyst Review Notes</CardTitle>
        <CardDescription>Capture follow-up questions, clarifications, and manual review context.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Add analyst review note..."
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{message || "Notes are persisted with audit logging."}</p>
          <Button
            type="button"
            variant="secondary"
            disabled={isPending || value.trim().length < 5}
            onClick={() => startTransition(submitNote)}
          >
            {isPending ? "Saving..." : "Add note"}
          </Button>
        </div>
        <div className="space-y-2">
          {notes.length ? (
            notes.map((note) => (
              <div key={note} className="rounded-[20px] border border-border/70 bg-background/60 p-3 text-sm text-slate-700">
                {note}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No analyst notes captured yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

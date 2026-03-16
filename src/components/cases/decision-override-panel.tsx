"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const recommendations = [
  "APPROVE",
  "APPROVE_WITH_CONDITIONS",
  "REFER_TO_ANALYST",
  "REJECT"
] as const;

export function DecisionOverridePanel({
  caseId,
  defaults
}: {
  caseId: string;
  defaults: {
    recommendation?: string;
    approvedLimit?: number;
    approvedTenorDays?: number;
    pricingBand?: string;
    collateralRequirement?: string;
    overrideReason?: string;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    const payload = Object.fromEntries(formData.entries());
    const response = await fetch(`/api/cases/${caseId}/decision`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    setMessage(response.ok ? "Decision saved." : data.error ?? "Unable to save decision.");

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analyst Override and Final Decision</CardTitle>
        <CardDescription>
          Capture the analyst-approved facility terms and override rationale. This is auditable and distinct from model recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() => handleSubmit(formData));
          }}
        >
          <select
            name="recommendation"
            className="h-11 rounded-2xl border border-border bg-background/70 px-4 text-sm"
            defaultValue={defaults.recommendation ?? "REFER_TO_ANALYST"}
          >
            {recommendations.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Input name="approvedLimit" type="number" defaultValue={defaults.approvedLimit} placeholder="Approved limit" />
          <Input
            name="approvedTenorDays"
            type="number"
            defaultValue={defaults.approvedTenorDays}
            placeholder="Approved tenor"
          />
          <Input name="pricingBand" defaultValue={defaults.pricingBand} placeholder="Pricing band" />
          <Input
            name="collateralRequirement"
            defaultValue={defaults.collateralRequirement}
            placeholder="Collateral / guarantee"
            className="md:col-span-2"
          />
          <Textarea
            name="overrideReason"
            defaultValue={defaults.overrideReason}
            placeholder="Document analyst override reason and conditions."
            className="md:col-span-2"
          />
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{message || "Final decision is stored separately from model output."}</p>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save decision"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

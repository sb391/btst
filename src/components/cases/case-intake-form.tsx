"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const borrowerTypes = ["CORPORATE", "DISTRIBUTOR", "RETAILER"] as const;

export function CaseIntakeForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/cases", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Unable to create case.");
      return;
    }

    router.push(`/cases/${data.caseId}`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borrower Case Intake</CardTitle>
        <CardDescription>
          Start a new internal underwriting case with borrower, anchor, and requested facility details.
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
          <Input name="legalName" placeholder="Legal name" required />
          <select
            name="borrowerType"
            className="h-11 rounded-2xl border border-border bg-background/70 px-4 text-sm"
            defaultValue="DISTRIBUTOR"
          >
            {borrowerTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Input name="gstin" placeholder="GSTIN" />
          <Input name="pan" placeholder="PAN" />
          <Input name="state" placeholder="State" />
          <Input name="anchorName" placeholder="Anchor / Brand name" />
          <Input name="dealerCode" placeholder="Dealer code" />
          <Input name="customerCode" placeholder="Customer code" />
          <Input name="requestedAmount" placeholder="Requested amount" type="number" />
          <Input name="requestedTenorDays" placeholder="Requested tenor (days)" type="number" />
          <div className="md:col-span-2 flex items-center justify-between gap-3">
            {error ? <p className="text-sm text-danger">{error}</p> : <span className="text-sm text-muted-foreground">Creates borrower, case shell, and audit trail entry.</span>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create case"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

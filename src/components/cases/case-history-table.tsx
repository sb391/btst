"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";

import type { CaseListItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function CaseHistoryTable({ cases }: { cases: CaseListItem[] }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = cases.filter((item) => {
    const value = deferredQuery.toLowerCase();
    if (!value) {
      return true;
    }

    return [item.caseNumber, item.borrowerName, item.borrowerType, item.anchorName ?? "", item.status]
      .join(" ")
      .toLowerCase()
      .includes(value);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Case History and Search</CardTitle>
        <CardDescription>
          Search across borrower names, case numbers, borrower type, anchor, and workflow status.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search cases..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="pb-3 font-medium">Case</th>
                <th className="pb-3 font-medium">Borrower</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Score</th>
                <th className="pb-3 font-medium">Decision</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.caseId} className="border-t border-border/60">
                  <td className="py-4">
                    <Link href={`/cases/${item.caseId}`} className="font-medium text-primary hover:underline">
                      {item.caseNumber}
                    </Link>
                  </td>
                  <td className="py-4">{item.borrowerName}</td>
                  <td className="py-4">{item.borrowerType}</td>
                  <td className="py-4">{item.score}</td>
                  <td className="py-4">
                    <Badge variant={item.recommendation.includes("APPROVE") ? "success" : item.recommendation === "REJECT" ? "danger" : "warning"}>
                      {item.recommendation.replaceAll("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-4">
                    <Badge variant="outline">{item.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

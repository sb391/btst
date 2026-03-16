import type { FraudFlag, TradeMatchResult } from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TradeCheckList({
  tradeMatch,
  flags
}: {
  tradeMatch?: TradeMatchResult;
  flags: FraudFlag[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Matching and Fraud Logic</CardTitle>
        <CardDescription>
          Invoice, GST, and transport logic are shown separately from the final underwriting recommendation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={tradeMatch?.status === "STRONG_MATCH" ? "success" : tradeMatch?.status === "MISMATCH" ? "danger" : "warning"}>
            {tradeMatch?.status?.replaceAll("_", " ") ?? "NO TRADE DATA"}
          </Badge>
          <span className="text-sm text-muted-foreground">Trade match score {tradeMatch?.score ?? 0}</span>
        </div>

        <div className="grid gap-3">
          {tradeMatch?.checks.map((check) => (
            <div key={check.label} className="rounded-[18px] border border-border/70 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{check.label}</p>
                <Badge
                  variant={
                    check.status === "match"
                      ? "success"
                      : check.status === "mismatch"
                        ? "danger"
                        : "warning"
                  }
                >
                  {check.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{check.detail}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[18px] border border-border/70 bg-background/70 p-4">
            <p className="font-medium">Route plausibility</p>
            <p className="mt-2 text-sm text-muted-foreground">{tradeMatch?.routePlausibility ?? "No route assessment available."}</p>
          </div>
          <div className="rounded-[18px] border border-border/70 bg-background/70 p-4">
            <p className="font-medium">Relationship history</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {tradeMatch?.historicalRelationshipNote ?? "No relationship note available."}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="font-medium">Fraud and integrity flags</p>
          {flags.map((flag) => (
            <div key={flag.code} className="rounded-[18px] border border-border/70 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{flag.code}</p>
                <Badge
                  variant={
                    flag.severity === "RED"
                      ? "danger"
                      : flag.severity === "AMBER"
                        ? "warning"
                        : "success"
                  }
                >
                  {flag.severity}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{flag.reason}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

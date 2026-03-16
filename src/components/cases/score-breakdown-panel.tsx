import { ChevronDown } from "lucide-react";

import type { ScoreCard } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export function ScoreBreakdownPanel({ scores }: { scores: ScoreCard[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Explainable Score Breakdown</CardTitle>
        <CardDescription>
          Every recommendation remains decomposed into visible weighted drivers. Expand a score to inspect its source logic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scores
          .filter((score) => score.weight > 0 || score.key === "COMPOSITE")
          .map((score) => (
            <details
              key={score.key}
              className="group rounded-[22px] border border-border/70 bg-background/70 p-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-medium">{score.label}</p>
                    <Badge variant="outline">Weight {score.weight}%</Badge>
                    {score.grade ? <Badge variant="secondary">Grade {score.grade}</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{score.rationale}</p>
                  <Progress value={score.score} className="max-w-[280px]" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-3xl font-semibold">{score.score}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Score</p>
                  </div>
                  <ChevronDown className="h-5 w-5 transition group-open:rotate-180" />
                </div>
              </summary>
              {score.breakdown.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {score.breakdown.map((item) => (
                    <div key={`${score.key}-${item.label}`} className="rounded-[18px] border border-border/60 bg-card/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{item.label}</p>
                        <Badge
                          variant={
                            item.impact === "positive"
                              ? "success"
                              : item.impact === "negative"
                                ? "danger"
                                : "outline"
                          }
                        >
                          {item.source}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{item.explanation}</p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span>Value {item.value.toFixed(0)}</span>
                        <span>Weight {(item.weight * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Top-level summary score.</p>
              )}
            </details>
          ))}
      </CardContent>
    </Card>
  );
}

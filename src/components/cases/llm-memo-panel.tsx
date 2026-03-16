import type { LlmMemo } from "@/lib/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LlmMemoPanel({ memo }: { memo: LlmMemo }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Underwriting Copilot</CardTitle>
        <CardDescription>
          Narrative reasoning is advisory only and shown separately from extracted facts and deterministic scores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-[20px] border border-border/70 bg-background/70 p-4">
          <p className="text-sm leading-7 text-slate-700">{memo.summary}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-medium">Strengths</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {memo.strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Risks</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {memo.risks.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Contradictions</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {memo.contradictions.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Next analyst questions</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {memo.nextQuestions.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-[20px] border border-warning/20 bg-warning/10 p-4 text-sm text-slate-700">
          {memo.disclaimer}
        </div>
      </CardContent>
    </Card>
  );
}

import type { DecisionRecommendation } from "@/lib/types";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ScoreDriverCards({ decision }: { decision: DecisionRecommendation }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Top positive drivers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {decision.topPositiveDrivers.length ? (
            decision.topPositiveDrivers.map((driver) => (
              <div key={driver.label} className="rounded-[18px] border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{driver.label}</p>
                  <Badge variant="success">+{driver.impact}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{driver.explanation}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Run underwriting analysis to populate positive score drivers.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Top negative drivers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {decision.topNegativeDrivers.length ? (
            decision.topNegativeDrivers.map((driver) => (
              <div key={driver.label} className="rounded-[18px] border border-border/70 bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{driver.label}</p>
                  <Badge variant="danger">{driver.impact}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{driver.explanation}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Run underwriting analysis to populate negative score drivers.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

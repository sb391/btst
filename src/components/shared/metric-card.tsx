import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  hint,
  trend = "neutral",
  badge
}: {
  label: string;
  value: string;
  hint: string;
  trend?: "up" | "down" | "neutral";
  badge?: string;
}) {
  const Icon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{hint}</span>
      </CardContent>
    </Card>
  );
}

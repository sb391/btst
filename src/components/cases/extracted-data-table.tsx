import type { ExtractedFieldRecord } from "@/lib/types";

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ExtractedDataTable({ fields }: { fields: ExtractedFieldRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Extracted Data Review</CardTitle>
        <CardDescription>
          Analysts can inspect extracted facts, identify weak confidence areas, and manually correct values in a future workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="pb-3 font-medium">Section</th>
              <th className="pb-3 font-medium">Field</th>
              <th className="pb-3 font-medium">Value</th>
              <th className="pb-3 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={`${field.section}-${field.field}`} className="border-t border-border/60">
                <td className="py-3">{field.section}</td>
                <td className="py-3">{field.field}</td>
                <td className="py-3">{field.correctedValue ?? field.value}</td>
                <td className="py-3">
                  <div className="w-32">
                    <Progress value={field.confidence * 100} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Case not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The requested case or dashboard view could not be loaded.
          </p>
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">
            Return to intake dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

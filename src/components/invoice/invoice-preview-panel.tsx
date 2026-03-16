"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InvoicePreviewPanel({
  reviewId,
  mimeType,
  pageCount
}: {
  reviewId: string;
  mimeType: string;
  pageCount?: number | null;
}) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const isPdf = mimeType.includes("pdf");
  const previewUrl = useMemo(() => {
    if (isPdf) {
      return `/api/reviews/${reviewId}/file#page=${page}&zoom=${zoom}`;
    }

    return `/api/reviews/${reviewId}/file`;
  }, [isPdf, page, reviewId, zoom]);

  return (
    <Card className="xl:sticky xl:top-5">
      <CardHeader>
        <CardTitle>Invoice Preview</CardTitle>
        <CardDescription>
          Review the original invoice while comparing it against extracted fields and validation output.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={!isPdf || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isPdf || page >= (pageCount ?? 1)}
            onClick={() => setPage((current) => Math.min(pageCount ?? 1, current + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" onClick={() => setZoom((current) => Math.max(70, current - 10))}>
            <ZoomOut className="h-4 w-4" />
            Zoom Out
          </Button>
          <Button type="button" variant="outline" onClick={() => setZoom((current) => Math.min(180, current + 10))}>
            <ZoomIn className="h-4 w-4" />
            Zoom In
          </Button>
          <p className="text-sm text-muted-foreground">
            {isPdf ? `Page ${page} of ${pageCount ?? 1}` : "Single image preview"} • {zoom}%
          </p>
        </div>

        <div className="overflow-hidden rounded-[26px] border border-border/80 bg-white">
          {isPdf ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Invoice preview"
              className="h-[920px] w-full"
            />
          ) : (
            <div className="overflow-auto bg-[#f4f0e8] p-4">
              <Image
                src={previewUrl}
                alt="Invoice preview"
                className="mx-auto origin-top rounded-[18px] shadow-sm"
                width={1200}
                height={1600}
                unoptimized
                style={{ width: `${zoom}%`, height: "auto" }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

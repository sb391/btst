import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { NextResponse } from "next/server";

import { getInvoiceReview } from "@/server/repositories/invoice-review-repository";

function contentTypeFromPath(path: string, fallback: string) {
  const extension = extname(path).toLowerCase();
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".svg") return "image/svg+xml";
  return fallback;
}

export async function GET(
  _request: Request,
  { params }: { params: { reviewId: string } }
) {
  const review = await getInvoiceReview(params.reviewId);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const buffer = await readFile(review.uploadedFile.storagePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentTypeFromPath(review.uploadedFile.storagePath, review.uploadedFile.mimeType),
      "Cache-Control": "no-store"
    }
  });
}

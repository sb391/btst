import { NextResponse } from "next/server";

import { analystReviewUpdateSchema } from "@/lib/invoice-schemas";
import { getInvoiceReview, updateInvoiceReviewAnalystState } from "@/server/repositories/invoice-review-repository";

export async function PATCH(
  request: Request,
  { params }: { params: { reviewId: string } }
) {
  const payload = await request.json();
  const parsed = analystReviewUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analyst update." }, { status: 400 });
  }

  const updated = await updateInvoiceReviewAnalystState({
    reviewId: params.reviewId,
    analystDecision: parsed.data.analystDecision,
    analystDecisionReason: parsed.data.analystDecisionReason,
    note: parsed.data.note,
    authorName: "Internal Analyst"
  });

  return NextResponse.json({
    review: updated
  });
}

export async function GET(
  _request: Request,
  { params }: { params: { reviewId: string } }
) {
  const review = await getInvoiceReview(params.reviewId);

  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  return NextResponse.json(review);
}

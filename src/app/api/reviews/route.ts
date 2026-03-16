import { NextResponse } from "next/server";

import { acceptedInvoiceMimeTypes } from "@/lib/invoice-schemas";
import { createInvoiceReview } from "@/server/repositories/invoice-review-repository";
import { runInvoiceOcr } from "@/server/services/invoice-ocr-service";
import { runInvoiceReviewPipeline } from "@/server/services/invoice-review-orchestrator";
import { saveInvoiceUpload } from "@/server/services/invoice-upload-service";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Invoice file is required." }, { status: 400 });
  }

  if (!acceptedInvoiceMimeTypes.includes(file.type as (typeof acceptedInvoiceMimeTypes)[number])) {
    return NextResponse.json({ error: "Only PDF, PNG, JPG, and JPEG are supported." }, { status: 400 });
  }

  const savedFile = await saveInvoiceUpload(file);
  const ocr = await runInvoiceOcr({
    originalFileName: savedFile.originalFileName,
    mimeType: savedFile.mimeType,
    storagePath: savedFile.storagePath,
    checksum: savedFile.checksum
  });
  const output = await runInvoiceReviewPipeline(ocr);
  const review = await createInvoiceReview({
    uploadedFile: {
      ...savedFile,
      pageCount: ocr.pages.length
    },
    ocr: {
      providerKey: ocr.providerKey,
      providerMode: ocr.providerMode,
      rawText: ocr.rawText,
      rawPayload: ocr.rawPayload
    },
    output
  });

  return NextResponse.json({
    reviewId: review.id
  });
}

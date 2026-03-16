"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const acceptedFormats = ".pdf,.png,.jpg,.jpeg";

export function UploadReviewPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function upload(file: File) {
    setIsUploading(true);
    setProgress(0);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/reviews");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      setProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      setIsUploading(false);

      if (xhr.status >= 200 && xhr.status < 300) {
        const payload = JSON.parse(xhr.responseText) as { reviewId: string };
        setProgress(100);
        router.push(`/reviews/${payload.reviewId}`);
        router.refresh();
        return;
      }

      try {
        const payload = JSON.parse(xhr.responseText) as { error?: string };
        setMessage(payload.error ?? "Upload failed.");
      } catch {
        setMessage("Upload failed.");
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setMessage("Upload failed.");
    };

    xhr.send(formData);
  }

  function handleDrop(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) {
      return;
    }

    upload(file);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Invoice Review</CardTitle>
        <CardDescription>
          Upload a PDF or image invoice. The app will run OCR, extract fields, score document health, and generate an analyst-ready review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <button
          type="button"
          className={[
            "flex w-full flex-col items-center justify-center rounded-[28px] border border-dashed px-6 py-16 text-center transition",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border/80 bg-background/70 hover:border-primary/40 hover:bg-card/70"
          ].join(" ")}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragging(false);
            handleDrop(event.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
          ) : (
            <FileUp className="h-12 w-12 text-primary" />
          )}
          <p className="mt-5 text-xl font-semibold text-slate-900">Drop invoice here or click to upload</p>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Supports PDF, PNG, JPG, and JPEG. Files are stored locally for the MVP and attached to a single invoice review record.
          </p>
          <p className="mt-5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Accepted formats: {acceptedFormats.split(",").join(", ")}
          </p>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={acceptedFormats}
          className="hidden"
          onChange={(event) => handleDrop(event.target.files)}
        />

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Uploading and processing invoice</span>
              <span className="font-medium text-slate-900">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        ) : null}

        {message ? <p className="text-sm text-danger">{message}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => inputRef.current?.click()}>
            Upload Invoice
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/reviews/review_demo_001")}>
            Open Demo Review
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

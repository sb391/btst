import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

export interface SavedInvoiceUpload {
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  checksum: string;
  previewKind: "pdf" | "image";
}

function storageRoot() {
  return process.env.APP_STORAGE_DIR ?? "./storage/uploads";
}

function previewKindFromMimeType(mimeType: string) {
  return mimeType.includes("pdf") ? "pdf" : "image";
}

export async function saveInvoiceUpload(file: File): Promise<SavedInvoiceUpload> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const extension = extname(file.name) || (file.type.includes("pdf") ? ".pdf" : ".bin");
  const directory = join(storageRoot(), "invoice-reviews");
  const storagePath = join(directory, `${Date.now()}-${checksum.slice(0, 12)}${extension}`);

  await mkdir(directory, { recursive: true });
  await writeFile(storagePath, buffer);

  return {
    originalFileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: buffer.byteLength,
    storagePath,
    checksum,
    previewKind: previewKindFromMimeType(file.type || "")
  };
}

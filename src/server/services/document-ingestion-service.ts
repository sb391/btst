import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

export interface SavedUpload {
  storagePath: string;
  checksum: string;
  sizeBytes: number;
  mimeType: string;
  originalFileName: string;
}

export async function saveUploadedFile(caseId: string, file: File): Promise<SavedUpload> {
  const storageRoot = process.env.APP_STORAGE_DIR ?? "./storage/uploads";
  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(buffer).digest("hex");
  const extension = extname(file.name) || ".bin";
  const directory = join(storageRoot, caseId);
  const storagePath = join(directory, `${Date.now()}-${checksum.slice(0, 10)}${extension}`);

  await mkdir(directory, { recursive: true });
  await writeFile(storagePath, buffer);

  return {
    storagePath,
    checksum,
    sizeBytes: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
    originalFileName: file.name
  };
}

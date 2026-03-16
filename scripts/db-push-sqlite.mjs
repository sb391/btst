import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const entries = {};
  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    entries[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return entries;
}

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Only SQLite file URLs are supported by scripts/db-push-sqlite.mjs");
  }

  const dbReference = databaseUrl.slice("file:".length);

  if (dbReference.startsWith("/")) {
    return dbReference;
  }

  return resolve("prisma", dbReference);
}

function getExistingTableNames(databasePath) {
  if (!existsSync(databasePath)) {
    return new Set();
  }

  const result = execFileSync(
    "sqlite3",
    [databasePath, "SELECT name FROM sqlite_master WHERE type='table';"],
    { encoding: "utf8" }
  );

  return new Set(
    result
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

const env = {
  ...loadEnvFile(".env"),
  ...process.env
};

const databaseUrl = env.DATABASE_URL ?? "file:./dev.db";
const databasePath = resolveSqlitePath(databaseUrl);
const requiredTables = [
  "InvoiceUploadedFile",
  "InvoiceReview",
  "InvoiceExtractedField",
  "InvoiceExtractedLineItem",
  "InvoiceValidationResult",
  "InvoiceReviewScore",
  "InvoiceAiReview",
  "InvoiceReviewNote",
  "InvoiceReviewAuditLog"
];

mkdirSync(dirname(databasePath), { recursive: true });

const existingTables = getExistingTableNames(databasePath);
const missingTables = requiredTables.filter((tableName) => !existingTables.has(tableName));

if (missingTables.length === 0) {
  console.log(`SQLite schema already present at ${databasePath}`);
  process.exit(0);
}

const prismaCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const rawSql = execFileSync(
  prismaCommand,
  [
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "prisma/schema.prisma",
    "--script"
  ],
  {
    encoding: "utf8",
    env: {
      ...process.env,
      ...env
    }
  }
);

const bootstrapSql = rawSql
  .replace(/CREATE TABLE /g, "CREATE TABLE IF NOT EXISTS ")
  .replace(/CREATE UNIQUE INDEX /g, "CREATE UNIQUE INDEX IF NOT EXISTS ");

execFileSync("sqlite3", [databasePath], {
  input: bootstrapSql,
  stdio: ["pipe", "inherit", "inherit"]
});

console.log(`SQLite schema bootstrapped at ${databasePath}`);

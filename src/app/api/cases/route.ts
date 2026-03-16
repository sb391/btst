import { NextResponse } from "next/server";

import { createCaseSchema } from "@/lib/schemas";
import { getAllCases } from "@/server/repositories/case-repository";
import { prisma } from "@/server/db";
import { createAuditLog } from "@/server/services/audit-log-service";

function caseNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const suffix = `${date.getMonth() + 1}`.padStart(2, "0") + `${date.getDate()}`.padStart(2, "0");
  return `UW-IND-${year}-${suffix}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function GET() {
  const cases = await getAllCases();
  return NextResponse.json({ cases });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createCaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid case payload",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const borrower =
      parsed.data.gstin && parsed.data.gstin.trim()
        ? await prisma.borrower.upsert({
            where: {
              gstin: parsed.data.gstin
            },
            update: {
              legalName: parsed.data.legalName,
              borrowerType: parsed.data.borrowerType,
              pan: parsed.data.pan || null,
              state: parsed.data.state || null,
              anchorName: parsed.data.anchorName || null,
              dealerCode: parsed.data.dealerCode || null,
              customerCode: parsed.data.customerCode || null
            },
            create: {
              legalName: parsed.data.legalName,
              borrowerType: parsed.data.borrowerType,
              gstin: parsed.data.gstin,
              pan: parsed.data.pan || null,
              state: parsed.data.state || null,
              anchorName: parsed.data.anchorName || null,
              dealerCode: parsed.data.dealerCode || null,
              customerCode: parsed.data.customerCode || null
            }
          })
        : await prisma.borrower.create({
            data: {
              legalName: parsed.data.legalName,
              borrowerType: parsed.data.borrowerType,
              gstin: null,
              pan: parsed.data.pan || null,
              state: parsed.data.state || null,
              anchorName: parsed.data.anchorName || null,
              dealerCode: parsed.data.dealerCode || null,
              customerCode: parsed.data.customerCode || null
            }
          });

    const createdCase = await prisma.underwritingCase.create({
      data: {
        borrowerId: borrower.id,
        caseNumber: caseNumber(),
        status: "INTAKE",
        requestedAmount: parsed.data.requestedAmount,
        requestedTenorDays: parsed.data.requestedTenorDays
      }
    });

    await createAuditLog({
      caseId: createdCase.id,
      action: "CASE_CREATED",
      entityType: "UnderwritingCase",
      entityId: createdCase.id,
      metadata: {
        borrowerType: parsed.data.borrowerType,
        legalName: parsed.data.legalName
      }
    });

    return NextResponse.json({
      caseId: createdCase.id,
      caseNumber: createdCase.caseNumber
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to create case.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import { analystDecisionSchema } from "@/lib/schemas";
import { prisma } from "@/server/db";
import { createAuditLog } from "@/server/services/audit-log-service";

export async function POST(
  request: Request,
  { params }: { params: { caseId: string } }
) {
  const body = await request.json();
  const parsed = analystDecisionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analyst decision." }, { status: 400 });
  }

  try {
    const analyst = await prisma.user.upsert({
      where: {
        email: "analyst@local.internal"
      },
      update: {},
      create: {
        email: "analyst@local.internal",
        name: "Local Analyst",
        role: "ANALYST"
      }
    });

    const decision = await prisma.analystDecision.create({
      data: {
        caseId: params.caseId,
        analystId: analyst.id,
        recommendation: parsed.data.recommendation,
        overrideReason: parsed.data.overrideReason || null,
        approvedLimit: parsed.data.approvedLimit,
        approvedTenorDays: parsed.data.approvedTenorDays,
        pricingBand: parsed.data.pricingBand || null,
        collateralRequirement: parsed.data.collateralRequirement || null
      }
    });

    await prisma.underwritingCase.update({
      where: { id: params.caseId },
      data: {
        status: "DECIDED",
        recommendation: parsed.data.recommendation
      }
    });

    await createAuditLog({
      caseId: params.caseId,
      actorId: analyst.id,
      action: "ANALYST_DECISION_CAPTURED",
      entityType: "AnalystDecision",
      entityId: decision.id,
      metadata: parsed.data
    });

    return NextResponse.json({ decisionId: decision.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to save analyst decision.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

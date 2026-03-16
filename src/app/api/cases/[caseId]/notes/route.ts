import { NextResponse } from "next/server";

import { analystNoteSchema } from "@/lib/schemas";
import { prisma } from "@/server/db";
import { createAuditLog } from "@/server/services/audit-log-service";

export async function POST(
  request: Request,
  { params }: { params: { caseId: string } }
) {
  const body = await request.json();
  const parsed = analystNoteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid note body." }, { status: 400 });
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

    const note = await prisma.analystNote.create({
      data: {
        caseId: params.caseId,
        authorId: analyst.id,
        body: parsed.data.body
      }
    });

    await createAuditLog({
      caseId: params.caseId,
      actorId: analyst.id,
      action: "ANALYST_NOTE_ADDED",
      entityType: "AnalystNote",
      entityId: note.id
    });

    return NextResponse.json({ noteId: note.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to save note.",
        detail: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

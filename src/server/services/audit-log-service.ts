import { prisma } from "@/server/db";
import { toPrismaJson } from "@/server/prisma-json";

export async function createAuditLog(input: {
  caseId?: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        caseId: input.caseId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata ? toPrismaJson(input.metadata) : undefined
      }
    });
  } catch {
    return null;
  }
}

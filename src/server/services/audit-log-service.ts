import { prisma } from "@/server/db";

export async function createAuditLog(input: {
  caseId?: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        caseId: input.caseId,
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata
      }
    });
  } catch {
    return null;
  }
}

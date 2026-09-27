import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuthUser } from "./auth/auth.types";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    user: AuthUser,
    event: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        event,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  list(
    user: AuthUser,
    entityType?: string,
    entityId?: string,
    from?: string,
    to?: string,
  ) {
    return this.prisma.auditEvent.findMany({
      where: {
        organizationId: user.organizationId,
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
}

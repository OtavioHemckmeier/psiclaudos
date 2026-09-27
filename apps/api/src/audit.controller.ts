import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth/auth.guard";
import { CurrentUser } from "./auth/auth.decorator";
import { AuthUser } from "./auth/auth.types";
import { AuditService } from "./audit.service";

@Controller("audit")
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.audit.list(user, entityType, entityId, from, to);
  }
}

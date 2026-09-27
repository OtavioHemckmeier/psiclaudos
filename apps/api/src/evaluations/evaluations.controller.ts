import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/auth.decorator";
import { AuthUser } from "../auth/auth.types";
import { EvaluationsService } from "./evaluations.service";
import { ApplicationService } from "./application.service";
import { EvaluationInput } from "./evaluations.service";

@Controller("evaluations")
@UseGuards(AuthGuard)
export class EvaluationsController {
  constructor(
    private readonly evaluations: EvaluationsService,
    private readonly applications: ApplicationService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.evaluations.list(
      user,
      search,
      status,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: EvaluationInput) {
    return this.evaluations.create(user, body);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.evaluations.get(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: Partial<EvaluationInput>,
  ) {
    return this.evaluations.update(user, id, body);
  }

  @Post(":id/applications")
  addApplication(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { instrumentVersionId: string },
  ) {
    return this.evaluations.addApplication(user, id, body.instrumentVersionId);
  }

  @Get("/applications/:applicationId")
  getApplication(
    @CurrentUser() user: AuthUser,
    @Param("applicationId") id: string,
  ) {
    return this.evaluations.getApplication(user, id);
  }

  @Patch("/applications/:applicationId/answers")
  saveAnswers(
    @CurrentUser() user: AuthUser,
    @Param("applicationId") id: string,
    @Body() body: { answers: Record<string, unknown> },
  ) {
    return this.evaluations.saveAnswers(user, id, body.answers);
  }

  @Post("/applications/:applicationId/calculate")
  calculate(@CurrentUser() user: AuthUser, @Param("applicationId") id: string) {
    return this.applications.calculate(user, id);
  }

  @Patch("/applications/:applicationId/summary")
  summary(
    @CurrentUser() user: AuthUser,
    @Param("applicationId") id: string,
    @Body() body: { summary: string },
  ) {
    return this.applications.saveSummary(user, id, body.summary);
  }

  @Post("/applications/:applicationId/review")
  review(@CurrentUser() user: AuthUser, @Param("applicationId") id: string) {
    return this.applications.review(user, id);
  }

  @Post("/applications/:applicationId/lock")
  lock(@CurrentUser() user: AuthUser, @Param("applicationId") id: string) {
    return this.applications.lock(user, id);
  }

  @Post("/applications/:applicationId/reopen")
  reopen(@CurrentUser() user: AuthUser, @Param("applicationId") id: string) {
    return this.applications.reopen(user, id);
  }
}

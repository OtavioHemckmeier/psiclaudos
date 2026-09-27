import {
  Body,
  Controller,
  Delete,
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
import { PatientInput, PatientsService } from "./patients.service";

@Controller("patients")
@UseGuards(AuthGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.patients.list(
      user,
      search,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
    );
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: PatientInput) {
    return this.patients.create(user, body);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.patients.get(user, id);
  }

  @Get(":id/details")
  details(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.patients.details(user, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: Partial<PatientInput>,
  ) {
    return this.patients.update(user, id, body);
  }

  @Patch(":id/notes")
  updateNotes(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: { notes: string },
  ) {
    return this.patients.updateNotes(user, id, body.notes ?? "");
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.patients.remove(user, id);
  }
}

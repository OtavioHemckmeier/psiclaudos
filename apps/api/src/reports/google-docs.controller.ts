import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { ReportsService } from "./reports.service";

@Controller("reports/google-docs")
export class GoogleDocsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string | undefined,
    @Res() response: Response,
  ) {
    if (error) response.status(400).send("A autorização do Google Docs foi cancelada.");
    else response.redirect(await this.reports.completeGoogleDocsExport(code, state));
  }
}

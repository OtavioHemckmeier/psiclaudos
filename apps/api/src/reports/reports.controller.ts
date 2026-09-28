import { Body, Controller, Get, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthUser } from '../auth/auth.types';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post('evaluations/:evaluationId')
  generate(@CurrentUser() user: AuthUser, @Param('evaluationId') id: string, @Body() options?: object) { return this.reports.generate(user, id, options); }

  @Post(':id/google-docs')
  exportGoogleDocs(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.reports.startGoogleDocsExport(user, id); }

  @Get('evaluations/:evaluationId')
  list(@CurrentUser() user: AuthUser, @Param('evaluationId') id: string) { return this.reports.list(user, id); }

  @Get(':id/download')
  async download(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const { report, file } = await this.reports.download(user, id);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="relatorio-${report.revision}.pdf"`, 'Cache-Control': 'private, no-store, max-age=0' });
    response.send(file);
  }

  @Get(':id/preview')
  async preview(@CurrentUser() user: AuthUser, @Param('id') id: string, @Res() response: Response) {
    const { file } = await this.reports.download(user, id);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store, max-age=0' });
    response.send(file);
  }
}

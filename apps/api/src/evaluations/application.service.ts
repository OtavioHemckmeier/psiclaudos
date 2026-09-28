import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { executeRules } from '@laudo/rule-engine';
import type { InstrumentRule } from '@laudo/contracts';
import { PrismaService } from '../prisma.service';
import { AuthUser } from '../auth/auth.types';
import { EvaluationsService } from './evaluations.service';
import { AuditService } from '../audit.service';
import { filterInstrumentResult, prepareInstrumentAnswers } from './instrument-answers';

@Injectable()
export class ApplicationService {
  constructor(private readonly prisma: PrismaService, private readonly evaluations: EvaluationsService, private readonly audit: AuditService) {}

  async calculate(user: AuthUser, id: string) {
    const application = await this.evaluations.getApplication(user, id);
    if (!application.answers) throw new BadRequestException('Preencha as respostas antes de calcular.');
    const answers = application.answers as unknown as Record<string, unknown>;
    const formSchema = application.instrumentVersion.formSchema as unknown as {
      sections?: Array<{ id: string; fields?: Array<{ id: string; required?: boolean }> }>;
    };
    const instrumentCode = application.instrumentVersion.instrument.code;
    const prepared = prepareInstrumentAnswers(instrumentCode, formSchema, answers);
    const rules = application.instrumentVersion.rules as unknown as InstrumentRule[];
    const result = filterInstrumentResult(executeRules(rules, prepared.values), prepared);
    if (result.errors.length > 0) throw new BadRequestException({ message: 'Não foi possível calcular o instrumento.', errors: result.errors });
    return this.prisma.instrumentApplication.update({ where: { id }, data: { status: 'CALCULATED', result: result.outputs as Prisma.InputJsonValue, ruleTrace: result.trace as unknown as Prisma.InputJsonValue, calculatedAt: new Date() } }).then(async (updated) => { await this.evaluations.syncStatus(updated.evaluationId); await this.audit.record(user, 'INSTRUMENT_CALCULATED', 'InstrumentApplication', id); return this.evaluations.getApplication(user, updated.id); });
  }

  async saveSummary(user: AuthUser, id: string, summary: string) {
    await this.evaluations.getApplication(user, id);
    return this.prisma.instrumentApplication.update({ where: { id }, data: { professionalSummary: summary } });
  }

  async review(user: AuthUser, id: string) {
    const application = await this.evaluations.getApplication(user, id);
    if (application.status !== 'CALCULATED') throw new BadRequestException('Calcule o instrumento antes da revisão.');
    return this.prisma.instrumentApplication.update({ where: { id }, data: { status: 'REVIEWED', reviewedAt: new Date() } }).then(async (updated) => { await this.evaluations.syncStatus(updated.evaluationId); await this.audit.record(user, 'INSTRUMENT_REVIEWED', 'InstrumentApplication', id); return this.evaluations.getApplication(user, updated.id); });
  }

  async lock(user: AuthUser, id: string) {
    const application = await this.evaluations.getApplication(user, id);
    if (application.status !== 'REVIEWED') throw new BadRequestException('Revise o resultado antes de bloquear.');
    return this.prisma.instrumentApplication.update({ where: { id }, data: { status: 'LOCKED', lockedAt: new Date() } }).then(async (updated) => { await this.evaluations.syncStatus(updated.evaluationId); await this.audit.record(user, 'INSTRUMENT_LOCKED', 'InstrumentApplication', id); return this.evaluations.getApplication(user, updated.id); });
  }

  async reopen(user: AuthUser, id: string) {
    const application = await this.evaluations.getApplication(user, id);
    if (application.status !== 'LOCKED') throw new BadRequestException('Somente aplicações bloqueadas podem ser reabertas.');
    return this.prisma.instrumentApplication.update({ where: { id }, data: { status: 'REOPENED', lockedAt: null } }).then(async (updated) => { await this.evaluations.syncStatus(updated.evaluationId); await this.audit.record(user, 'INSTRUMENT_REOPENED', 'InstrumentApplication', id); return this.evaluations.getApplication(user, updated.id); });
  }
}

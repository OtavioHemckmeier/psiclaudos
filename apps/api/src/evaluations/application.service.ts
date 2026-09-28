import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { executeRules } from '@laudo/rule-engine';
import type { InstrumentRule } from '@laudo/contracts';
import { PrismaService } from '../prisma.service';
import { AuthUser } from '../auth/auth.types';
import { EvaluationsService } from './evaluations.service';
import { AuditService } from '../audit.service';

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
    const hasTabbedSnapIv = instrumentCode === 'SNAP-IV' && (formSchema.sections ?? []).some((section) => section.id.startsWith('snap_iv_form_'));
    const hasTabbedScaredP = instrumentCode === 'SCARED-P' && (formSchema.sections ?? []).some((section) => section.id.startsWith('scared_p_form_'));
    const resultAnswers = { ...answers };
    const completedScaredPForms: string[] = [];
    if (hasTabbedSnapIv) {
      const formPrefixes = [...new Set((formSchema.sections ?? [])
        .map((section) => section.id.match(/^(snap_iv_form_\d+)_/)?.[1])
        .filter((prefix): prefix is string => Boolean(prefix)))];
      const completedForms: string[] = [];
      for (const prefix of formPrefixes) {
        const respondent = answers[`${prefix}_respondent`];
        const itemIds = (formSchema.sections ?? [])
          .flatMap((section) => section.fields ?? [])
          .map((field) => field.id)
          .filter((fieldId) => fieldId.startsWith(`${prefix}_item_`));
        const answeredItems = itemIds.filter((fieldId) => String(answers[fieldId] ?? '').trim());
        if (!respondent && answeredItems.length === 0) continue;
        const missingItem = itemIds.find((fieldId) => !String(answers[fieldId] ?? '').trim());
        if (!respondent || missingItem) {
          throw new BadRequestException(`Complete ou limpe as respostas do ${prefix.replace('snap_iv_form_', 'Formulário ')} antes de calcular.`);
        }
        if (itemIds.some((fieldId) => !['0', '1', '2', '3'].includes(String(answers[fieldId])))) {
          throw new BadRequestException(`Há uma resposta inválida no ${prefix.replace('snap_iv_form_', 'Formulário ')}.`);
        }
        completedForms.push(prefix);
      }
      if (completedForms.length === 0) {
        throw new BadRequestException('Preencha pelo menos um formulário SNAP-IV antes de calcular.');
      }
      for (const prefix of formPrefixes.filter((item) => !completedForms.includes(item))) {
        delete resultAnswers[`${prefix}_respondent`];
        for (const field of Object.keys(resultAnswers)) {
          if (field.startsWith(`${prefix}_item_`)) delete resultAnswers[field];
        }
      }
    }
    if (hasTabbedScaredP) {
      const formPrefixes = [...new Set((formSchema.sections ?? [])
        .map((section) => section.id.match(/^(scared_p_form_\d+)_/)?.[1])
        .filter((prefix): prefix is string => Boolean(prefix)))];
      const fields = (formSchema.sections ?? []).flatMap((section) => section.fields ?? []);
      for (const prefix of formPrefixes) {
        if (answers[`${prefix}_enabled`] === false) continue;
        const respondent = answers[`${prefix}_respondent`];
        const itemIds = fields.map((field) => field.id).filter((fieldId) => fieldId.startsWith(`${prefix}_item_`));
        const answeredItems = itemIds.filter((fieldId) => String(answers[fieldId] ?? '').trim());
        if (!respondent && answeredItems.length === 0) continue;
        if (!respondent || itemIds.length !== 41 || answeredItems.length !== 41)
          throw new BadRequestException(`Complete ou limpe as respostas do ${prefix.replace('scared_p_form_', 'Formulário ')} antes de calcular.`);
        if (itemIds.some((fieldId) => !['0', '1', '2'].includes(String(answers[fieldId]))))
          throw new BadRequestException(`Há uma resposta inválida no ${prefix.replace('scared_p_form_', 'Formulário ')}.`);
        completedScaredPForms.push(prefix);
      }
      if (completedScaredPForms.length === 0)
        throw new BadRequestException('Preencha pelo menos um formulário SCARED-P antes de calcular.');
    }
    const missingRequiredField = (formSchema.sections ?? [])
      .flatMap((section) => section.fields ?? [])
      .find((field) => field.required && !String(resultAnswers[field.id] ?? '').trim());
    if (missingRequiredField)
      throw new BadRequestException('Preencha todas as respostas obrigatórias antes de calcular.');
    if (instrumentCode === 'SCARED-C' || (instrumentCode === 'SCARED-P' && !hasTabbedScaredP)) {
      const prefix = instrumentCode === 'SCARED-C' ? 'scared_c' : 'scared_p';
      const itemIds = (formSchema.sections ?? []).flatMap((section) => section.fields ?? [])
        .map((field) => field.id).filter((fieldId) => fieldId.startsWith(`${prefix}_`) && /^\d+$/.test(fieldId.slice(prefix.length + 1)));
      if (itemIds.length !== 41 || itemIds.some((fieldId) => !['0', '1', '2'].includes(String(resultAnswers[fieldId]))))
        throw new BadRequestException(`${instrumentCode} requer 41 respostas válidas (0, 1 ou 2).`);
    }
    const rules = application.instrumentVersion.rules as unknown as InstrumentRule[];
    const result = executeRules(rules, resultAnswers);
    if (hasTabbedSnapIv) {
      const formPrefixes = [...new Set((formSchema.sections ?? [])
        .map((section) => section.id.match(/^(snap_iv_form_\d+)_/)?.[1])
        .filter((prefix): prefix is string => Boolean(prefix)))];
      const submittedForms = new Set(formPrefixes.filter((prefix) => Boolean(resultAnswers[`${prefix}_respondent`])));
      for (const prefix of formPrefixes) {
        if (!submittedForms.has(prefix)) {
          for (const output of Object.keys(result.outputs)) {
            if (output.startsWith(`${prefix}_`)) delete result.outputs[output];
          }
        }
      }
      result.outputs = Object.fromEntries(Object.entries(result.outputs).filter(([output]) =>
        [...submittedForms].some((prefix) => output.startsWith(`${prefix}_`) && (output.endsWith('_score') || output.endsWith('_classification'))),
      ));
      result.trace = result.trace.filter((item) => [...submittedForms].some((prefix) => item.output.startsWith(`${prefix}_`)));
    }
    if (hasTabbedScaredP) {
      result.outputs = Object.fromEntries(Object.entries(result.outputs).filter(([output]) =>
        completedScaredPForms.some((prefix) => output.startsWith(`${prefix}_`) &&
          (output.endsWith('_respondent') || output.endsWith('_total') || output.endsWith('_screen') || output.endsWith('_score'))),
      ));
      result.trace = result.trace.filter((item) => completedScaredPForms.some((prefix) => item.output.startsWith(`${prefix}_`)));
    }
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

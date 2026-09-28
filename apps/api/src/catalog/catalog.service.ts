import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { asrs18Instrument, demoInstrument } from './instrument-config';
import { validateRules } from '@laudo/rule-engine';
import type { InstrumentRule } from '@laudo/contracts';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished(category?: string) {
    return this.prisma.instrumentDefinition.findMany({ where: { status: 'ACTIVE', ...(category ? { category } : {}), versions: { some: { status: 'PUBLISHED' } } }, include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 1 } }, orderBy: { name: 'asc' } });
  }

  async getPublished(code: string) {
    const instrument = await this.prisma.instrumentDefinition.findFirst({ where: { code, status: 'ACTIVE' }, include: { versions: { where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 1 } } });
    if (!instrument || instrument.versions.length === 0) throw new NotFoundException('Instrumento publicado não encontrado.');
    return instrument;
  }

  async seedDemo() {
    await this.seedAsrs18();
    const existing = await this.prisma.instrumentDefinition.findUnique({ where: { code: demoInstrument.code } });
    if (existing) { await this.prisma.instrumentVersion.updateMany({ where: { instrumentId: existing.id, version: demoInstrument.version }, data: { presentationSchema: demoInstrument.presentationSchema as unknown as Prisma.InputJsonValue } }); return existing; }
    const contentHash = createHash('sha256').update(JSON.stringify(demoInstrument)).digest('hex');
    return this.prisma.instrumentDefinition.create({ data: { code: demoInstrument.code, name: demoInstrument.name, description: 'Configuração técnica sem conteúdo clínico protegido.', category: 'DEMONSTRATION', versions: { create: { version: demoInstrument.version, status: 'PUBLISHED', formSchema: demoInstrument.formSchema as unknown as Prisma.InputJsonValue, rules: demoInstrument.rules as unknown as Prisma.InputJsonValue, outputSchema: demoInstrument.outputSchema as unknown as Prisma.InputJsonValue, presentationSchema: demoInstrument.presentationSchema as unknown as Prisma.InputJsonValue, contentHash, publishedAt: new Date(), sourceMetadata: { type: 'INTERNAL_DEMO' }, licenseMetadata: { status: 'DEMONSTRATION_ONLY' } } } } });
  }

  private async seedAsrs18() {
    const contentHash = createHash('sha256').update(JSON.stringify(asrs18Instrument)).digest('hex');
    const instrument = await this.prisma.instrumentDefinition.upsert({
      where: { code: asrs18Instrument.code },
      update: {
        name: asrs18Instrument.name,
        description: 'Escala de Autorrelato de TDAH em Adultos.',
        category: 'TDAH',
        status: 'ACTIVE',
      },
      create: {
        code: asrs18Instrument.code,
        name: asrs18Instrument.name,
        description: 'Escala de Autorrelato de TDAH em Adultos.',
        category: 'TDAH',
      },
    });
    const existingVersion = await this.prisma.instrumentVersion.findFirst({
      where: { instrumentId: instrument.id, version: asrs18Instrument.version },
    });
    const metadata = {
      platform: {
        subtitle: 'Escala de Autorrelato de TDAH em Adultos',
        audience: 'Maiores de 18 anos',
        authors: 'Organização Mundial da Saúde (OMS), Harvard Medical School',
        itemCount: 18,
        format: 'Autorrelato',
        purpose: 'Rastreamento',
        domains: ['Desatenção', 'Hiperatividade/impulsividade'],
        professionalUse: 'Instrumento não privativo de psicólogos',
        applicationEnabled: true,
      },
    };
    const versionData = {
      sourceMetadata: metadata as Prisma.InputJsonValue,
      licenseMetadata: { status: 'CONFIGURATION_IN_PROGRESS' } as Prisma.InputJsonValue,
      formSchema: asrs18Instrument.formSchema as unknown as Prisma.InputJsonValue,
      rules: asrs18Instrument.rules as unknown as Prisma.InputJsonValue,
      outputSchema: asrs18Instrument.outputSchema as unknown as Prisma.InputJsonValue,
      presentationSchema: asrs18Instrument.presentationSchema as Prisma.InputJsonValue,
      contentHash,
      publishedAt: new Date(),
    };
    if (existingVersion) {
      await this.prisma.instrumentVersion.update({ where: { id: existingVersion.id }, data: versionData });
      return;
    }
    await this.prisma.instrumentVersion.create({
      data: { instrumentId: instrument.id, version: asrs18Instrument.version, status: 'PUBLISHED', ...versionData },
    });
  }

  async publish(input: { code: string; name: string; version: string; description?: string; formSchema: object; rules: object[]; outputSchema: object; presentationSchema?: object }) {
    if (!input.code?.trim() || !input.name?.trim() || !input.version?.trim()) {
      throw new ConflictException('Código, nome e versão são obrigatórios.');
    }
    const rules = input.rules as InstrumentRule[];
    const validation = validateRules(rules);
    if (validation.length > 0) {
      throw new ConflictException({ message: 'Regras do instrumento inválidas.', details: validation });
    }
    const formSchema = input.formSchema as { sections?: Array<{ fields?: Array<{ id?: string }> }> };
    const fieldIds = (formSchema.sections ?? []).flatMap((section) => (section.fields ?? []).map((field) => field.id).filter(Boolean));
    if (fieldIds.length === 0 || new Set(fieldIds).size !== fieldIds.length) {
      throw new ConflictException('O formulário precisa ter campos com identificadores únicos.');
    }
    const outputFields = ((input.outputSchema as { fields?: Array<{ id?: string }> }).fields ?? []).map((field) => field.id).filter(Boolean);
    if (outputFields.length === 0 || new Set(outputFields).size !== outputFields.length) {
      throw new ConflictException('O resultado precisa ter campos com identificadores únicos.');
    }
    const ruleOutputs = new Set(rules.map((rule) => rule.output));
    const knownFields = new Set(fieldIds);
    for (const rule of rules) {
      const config = rule.config ?? {};
      const references = [config.field, config.input, ...(Array.isArray(config.inputs) ? config.inputs : [])].filter((value): value is string => typeof value === 'string');
      const missing = references.filter((reference) => !knownFields.has(reference) && !ruleOutputs.has(reference));
      if (missing.length > 0) throw new ConflictException(`A regra ${rule.id} referencia campo inexistente: ${missing[0]}.`);
    }
    const instrument = await this.prisma.instrumentDefinition.upsert({ where: { code: input.code }, update: { name: input.name, description: input.description }, create: { code: input.code, name: input.name, description: input.description } });
    const duplicate = await this.prisma.instrumentVersion.findFirst({ where: { instrumentId: instrument.id, version: input.version } });
    if (duplicate) throw new ConflictException('Esta versão já existe.');
    const contentHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return this.prisma.instrumentVersion.create({ data: { instrumentId: instrument.id, version: input.version, status: 'PUBLISHED', formSchema: input.formSchema, rules: input.rules, outputSchema: input.outputSchema, presentationSchema: input.presentationSchema as Prisma.InputJsonValue | undefined, contentHash, publishedAt: new Date() } });
  }

  async archive(user: { id: string; organizationId: string }, code: string, version: string) {
    const instrument = await this.prisma.instrumentDefinition.findUnique({ where: { code } });
    if (!instrument) throw new NotFoundException('Instrumento não encontrado.');
    const current = await this.prisma.instrumentVersion.findFirst({ where: { instrumentId: instrument.id, version } });
    if (!current) throw new NotFoundException('Versão não encontrada.');
    const archived = await this.prisma.instrumentVersion.update({ where: { id: current.id }, data: { status: 'ARCHIVED' } });
    await this.prisma.auditEvent.create({ data: { organizationId: user.organizationId, userId: user.id, event: 'INSTRUMENT_VERSION_ARCHIVED', entityType: 'InstrumentVersion', entityId: archived.id, metadata: { code, version } } });
    return archived;
  }
}

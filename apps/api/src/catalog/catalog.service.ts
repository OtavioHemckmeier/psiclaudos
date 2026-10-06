import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma.service';
import { asrs18Instrument, demoInstrument, snapIvInstrument } from './instrument-config';
import { scaredCInstrument } from './scared-c-config';
import { scaredPInstrument } from './scared-p-config';
import { baiInstrument } from './bai-config';
import { BDI_II_MAX_SCORE, bdiIIInstrument } from './bdi-ii-config';
import { validateRules } from '@laudo/rule-engine';
import type { InstrumentRule } from '@laudo/contracts';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async updateSeedVersion(existing: { id: string; contentHash: string | null }, code: string, data: Prisma.InstrumentVersionUpdateInput) {
    const applications = await this.prisma.instrumentApplication.count({ where: { instrumentVersionId: existing.id } });
    if (applications > 0) {
      if (existing.contentHash !== data.contentHash)
        this.logger.warn(`A versão publicada de ${code} possui aplicações e não foi alterada. Publique uma nova versão para atualizar suas regras.`);
      return;
    }
    await this.prisma.instrumentVersion.update({ where: { id: existing.id }, data });
  }

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
    await this.seedSnapIv();
    await this.seedScaredC();
    await this.seedScaredP();
    await this.seedBai();
    await this.seedBdiII();
    const existing = await this.prisma.instrumentDefinition.findUnique({ where: { code: demoInstrument.code } });
    if (existing) { await this.prisma.instrumentVersion.updateMany({ where: { instrumentId: existing.id, version: demoInstrument.version }, data: { presentationSchema: demoInstrument.presentationSchema as unknown as Prisma.InputJsonValue } }); return existing; }
    const contentHash = createHash('sha256').update(JSON.stringify(demoInstrument)).digest('hex');
    return this.prisma.instrumentDefinition.create({ data: { code: demoInstrument.code, name: demoInstrument.name, description: 'Configuração técnica sem conteúdo clínico protegido.', category: 'DEMONSTRATION', versions: { create: { version: demoInstrument.version, status: 'PUBLISHED', formSchema: demoInstrument.formSchema as unknown as Prisma.InputJsonValue, rules: demoInstrument.rules as unknown as Prisma.InputJsonValue, outputSchema: demoInstrument.outputSchema as unknown as Prisma.InputJsonValue, presentationSchema: demoInstrument.presentationSchema as unknown as Prisma.InputJsonValue, contentHash, publishedAt: new Date(), sourceMetadata: { type: 'INTERNAL_DEMO' }, licenseMetadata: { status: 'DEMONSTRATION_ONLY' } } } } });
  }

  private async seedBai() {
    const instrument = await this.prisma.instrumentDefinition.upsert({
      where: { code: baiInstrument.code },
      update: { name: baiInstrument.name, description: 'Inventário de Ansiedade de Beck — versão Cunha 2001.', category: 'Ansiedade', status: 'ACTIVE' },
      create: { code: baiInstrument.code, name: baiInstrument.name, description: 'Inventário de Ansiedade de Beck — versão Cunha 2001.', category: 'Ansiedade' },
    });
    const contentHash = createHash('sha256').update(JSON.stringify(baiInstrument)).digest('hex');
    const versionData = {
      formSchema: baiInstrument.formSchema as unknown as Prisma.InputJsonValue,
      rules: baiInstrument.rules as unknown as Prisma.InputJsonValue,
      outputSchema: baiInstrument.outputSchema as unknown as Prisma.InputJsonValue,
      presentationSchema: baiInstrument.presentationSchema as unknown as Prisma.InputJsonValue,
      contentHash,
      sourceMetadata: { platform: {
        subtitle: 'Beck Anxiety Inventory — versão Cunha 2001', audience: 'Adultos a partir de 18 anos',
        authors: 'Aaron T. Beck, Robert A. Steer e Jurema Alcides Cunha',
        itemCount: 21, format: 'Autorrelato', purpose: 'Sintomas de ansiedade',
        domains: [], professionalUse: 'Restrito a psicólogos', applicationEnabled: true,
      }, calculation: { type: 'SUM', itemMinimum: 0, itemMaximum: 3, scoreMinimum: 0, scoreMaximum: 63, output: 'bai_total_raw' }, norms: { enabled: false }, classification: { enabled: false }, interpretation: { enabled: false }, regulatory: { source: 'SATEPSI / Conselho Federal de Psicologia', status: 'DESFAVORAVEL', statusDate: '2018-04-11', reason: 'Estudos de normatização vencidos' }, features: { rawScore: true, review: true, export: true } } as Prisma.InputJsonValue,
      licenseMetadata: { status: 'USER_AUTHORIZED_2026-09-28', modalities: ['DIGITAL_APPLICATION', 'RESPONSE_STORAGE'], correctionStatus: 'RAW_SCORE_ONLY' } as Prisma.InputJsonValue,
    };
    const existing = await this.prisma.instrumentVersion.findFirst({ where: { instrumentId: instrument.id, version: baiInstrument.version } });
    if (existing) {
      await this.updateSeedVersion(existing, baiInstrument.code, versionData);
      return;
    }
    await this.prisma.instrumentVersion.create({ data: { instrumentId: instrument.id, version: baiInstrument.version, status: 'PUBLISHED', publishedAt: new Date(), ...versionData } });
  }

  private async seedBdiII() {
    const description = 'Inventário de Depressão de Beck — Segunda Edição (adaptação brasileira).';
    const instrument = await this.prisma.instrumentDefinition.upsert({
      where: { code: bdiIIInstrument.code },
      update: { name: bdiIIInstrument.name, description, category: 'Depressão', status: 'ACTIVE' },
      create: { code: bdiIIInstrument.code, name: bdiIIInstrument.name, description, category: 'Depressão' },
    });
    const contentHash = createHash('sha256').update(JSON.stringify(bdiIIInstrument)).digest('hex');
    const versionData = {
      formSchema: bdiIIInstrument.formSchema as unknown as Prisma.InputJsonValue,
      rules: bdiIIInstrument.rules as unknown as Prisma.InputJsonValue,
      outputSchema: bdiIIInstrument.outputSchema as unknown as Prisma.InputJsonValue,
      presentationSchema: bdiIIInstrument.presentationSchema as unknown as Prisma.InputJsonValue,
      contentHash,
      sourceMetadata: {
        platform: {
          subtitle: 'Inventário de Depressão de Beck — Segunda Edição',
          audience: 'A partir de 10 anos',
          authors: 'Aaron T. Beck, Robert A. Steer e Gregory K. Brown',
          itemCount: 21, format: 'Autorrelato', purpose: 'Sintomas depressivos',
          domains: [], professionalUse: 'Restrito a psicólogos', applicationEnabled: true,
        },
        entryMode: 'ITEM_SCORES_FROM_PRINTED_BOOKLET',
        calculation: { type: 'SUM', itemMinimum: 0, itemMaximum: 3, scoreMinimum: 0, scoreMaximum: BDI_II_MAX_SCORE, output: 'bdi_ii_total_raw' },
        norms: { enabled: false }, classification: { enabled: false }, domains: { enabled: false }, interpretation: { enabled: false },
        regulatory: { source: 'SATEPSI / Conselho Federal de Psicologia', status: 'FAVORAVEL_INFORMADO_PELO_SOLICITANTE', verifiedAt: null },
        features: { rawScore: true, review: true, export: true },
      } as Prisma.InputJsonValue,
      licenseMetadata: {
        status: 'PENDING_CONFIRMATION',
        modalities: ['ITEM_SCORE_ENTRY', 'RESPONSE_STORAGE', 'RAW_SCORE'],
        itemTextReproduced: false,
        correctionStatus: 'RAW_SCORE_ONLY',
      } as Prisma.InputJsonValue,
    };
    const existing = await this.prisma.instrumentVersion.findFirst({ where: { instrumentId: instrument.id, version: bdiIIInstrument.version } });
    if (existing) {
      await this.updateSeedVersion(existing, bdiIIInstrument.code, versionData);
      return;
    }
    await this.prisma.instrumentVersion.create({ data: { instrumentId: instrument.id, version: bdiIIInstrument.version, status: 'PUBLISHED', publishedAt: new Date(), ...versionData } });
  }

  private async seedScaredC() {
    const instrument = await this.prisma.instrumentDefinition.upsert({
      where: { code: scaredCInstrument.code },
      update: { name: scaredCInstrument.name, description: 'Inventário de Ansiedade Infantil — Versão Criança.', category: 'Ansiedade', status: 'ACTIVE' },
      create: { code: scaredCInstrument.code, name: scaredCInstrument.name, description: 'Inventário de Ansiedade Infantil — Versão Criança.', category: 'Ansiedade' },
    });
    const contentHash = createHash('sha256').update(JSON.stringify(scaredCInstrument)).digest('hex');
    const versionData = {
      formSchema: scaredCInstrument.formSchema as unknown as Prisma.InputJsonValue,
      rules: scaredCInstrument.rules as unknown as Prisma.InputJsonValue,
      outputSchema: scaredCInstrument.outputSchema as unknown as Prisma.InputJsonValue,
      presentationSchema: scaredCInstrument.presentationSchema as unknown as Prisma.InputJsonValue,
      contentHash,
      sourceMetadata: { platform: {
        subtitle: 'Inventário de Ansiedade Infantil — Versão Criança',
        audience: 'Crianças e adolescentes',
        authors: 'Birmaher, Khetarpal, Brent, Cully, Balach, Kaufman e Neer',
        itemCount: 41,
        format: 'Autorrelato',
        purpose: 'Rastreamento de ansiedade',
        domains: ['Pânico/somático', 'Ansiedade generalizada', 'Separação', 'Ansiedade social', 'Evitação escolar'],
        professionalUse: 'Instrumento não privativo de psicólogos',
        applicationEnabled: true,
      } } as Prisma.InputJsonValue,
      licenseMetadata: { status: 'OFFICIAL_ENGLISH_SOURCE_PORTUGUESE_TRANSLATION_NOT_VALIDATED', source: 'https://www.pediatricbipolar.pitt.edu/sites/default/files/assets/SCAREDChildVersion_1.19.18.pdf' } as Prisma.InputJsonValue,
    };
    const existing = await this.prisma.instrumentVersion.findFirst({ where: { instrumentId: instrument.id, version: scaredCInstrument.version } });
    if (existing) {
      await this.updateSeedVersion(existing, scaredCInstrument.code, versionData);
      return;
    }
    await this.prisma.instrumentVersion.create({ data: {
      instrumentId: instrument.id,
      version: scaredCInstrument.version,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      ...versionData,
    } });
  }

  private async seedScaredP() {
    const instrument = await this.prisma.instrumentDefinition.upsert({
      where: { code: scaredPInstrument.code },
      update: { name: scaredPInstrument.name, description: 'Inventário de Ansiedade Infantil — Versão Pais.', category: 'Ansiedade', status: 'ACTIVE' },
      create: { code: scaredPInstrument.code, name: scaredPInstrument.name, description: 'Inventário de Ansiedade Infantil — Versão Pais.', category: 'Ansiedade' },
    });
    const contentHash = createHash('sha256').update(JSON.stringify(scaredPInstrument)).digest('hex');
    const versionData = {
      formSchema: scaredPInstrument.formSchema as unknown as Prisma.InputJsonValue,
      rules: scaredPInstrument.rules as unknown as Prisma.InputJsonValue,
      outputSchema: scaredPInstrument.outputSchema as unknown as Prisma.InputJsonValue,
      presentationSchema: scaredPInstrument.presentationSchema as unknown as Prisma.InputJsonValue,
      contentHash,
      sourceMetadata: { platform: {
        subtitle: 'Inventário de Ansiedade Infantil — Versão Pais',
        audience: 'Crianças e adolescentes',
        authors: 'Birmaher, Khetarpal, Brent, Cully, Balach, Kaufman e Neer',
        itemCount: 41,
        format: 'Questionário para pais/cuidadores',
        purpose: 'Rastreamento de ansiedade',
        domains: ['Pânico/somático', 'Ansiedade generalizada', 'Separação', 'Ansiedade social', 'Evitação escolar'],
        professionalUse: 'Instrumento não privativo de psicólogos',
        applicationEnabled: true,
      } } as Prisma.InputJsonValue,
      licenseMetadata: { status: 'USER_PROVIDED_PORTUGUESE_ITEMS_PENDING_PROFESSIONAL_VALIDATION', source: 'https://pediatricbipolar.pitt.edu/sites/default/files/assets/SCAREDParentVersion_1.19.18_0.pdf' } as Prisma.InputJsonValue,
    };
    const existing = await this.prisma.instrumentVersion.findFirst({ where: { instrumentId: instrument.id, version: scaredPInstrument.version } });
    if (existing) {
      await this.updateSeedVersion(existing, scaredPInstrument.code, versionData);
      return;
    }
    await this.prisma.instrumentVersion.create({ data: {
      instrumentId: instrument.id,
      version: scaredPInstrument.version,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      ...versionData,
    } });
  }

  private async seedSnapIv() {
    const instrument = await this.prisma.instrumentDefinition.upsert({
      where: { code: snapIvInstrument.code },
      update: { name: snapIvInstrument.name, description: 'Questionário para sintomas de TDAH e TDO.', category: 'TDAH', status: 'ACTIVE' },
      create: { code: snapIvInstrument.code, name: snapIvInstrument.name, description: 'Questionário para sintomas de TDAH e TDO.', category: 'TDAH' },
    });
    const existing = await this.prisma.instrumentVersion.findFirst({ where: { instrumentId: instrument.id, version: snapIvInstrument.version } });
    const contentHash = createHash('sha256').update(JSON.stringify(snapIvInstrument)).digest('hex');
    if (existing) {
      await this.updateSeedVersion(existing, snapIvInstrument.code, {
          formSchema: snapIvInstrument.formSchema as unknown as Prisma.InputJsonValue,
          rules: snapIvInstrument.rules as unknown as Prisma.InputJsonValue,
          outputSchema: snapIvInstrument.outputSchema as unknown as Prisma.InputJsonValue,
          presentationSchema: snapIvInstrument.presentationSchema as Prisma.InputJsonValue,
          contentHash,
      });
      return;
    }
    await this.prisma.instrumentVersion.create({
      data: {
        instrumentId: instrument.id,
        version: snapIvInstrument.version,
        status: 'PUBLISHED',
        formSchema: snapIvInstrument.formSchema as unknown as Prisma.InputJsonValue,
        rules: snapIvInstrument.rules as unknown as Prisma.InputJsonValue,
        outputSchema: snapIvInstrument.outputSchema as unknown as Prisma.InputJsonValue,
        presentationSchema: snapIvInstrument.presentationSchema as unknown as Prisma.InputJsonValue,
        contentHash,
        publishedAt: new Date(),
        sourceMetadata: { platform: {
          subtitle: 'Questionário para Sintomas de TDAH e TDO',
          audience: 'Crianças e adolescentes',
          authors: 'Swanson, JM, Schuck, S., Porter, MM, Carlson, C., Hartman, CA, Sergeant, JA, Clevenger, W., Wasdell, M., McCleary, R., Lakes, K., & Wigal, T',
          itemCount: 26,
          format: 'Questionário para pais/professores',
          purpose: 'Rastreamento comportamental',
          domains: ['Desatenção', 'Hiperatividade/impulsividade', 'Oposição/desafio'],
          professionalUse: 'Instrumento não privativo de psicólogos',
          applicationEnabled: true,
        } },
        licenseMetadata: { status: 'USER_PROVIDED_CONTENT_PENDING_PROFESSIONAL_VALIDATION' },
      },
    });
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
      await this.updateSeedVersion(existingVersion, asrs18Instrument.code, versionData);
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

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth.types";
import { AuditService } from "../audit.service";
import { snapIvInstrument } from "../catalog/instrument-config";

export type EvaluationInput = {
  patientId: string;
  title: string;
  applicationDate?: string;
  requester?: string;
  purpose?: string;
  demandDescription?: string;
  anamnesis?: Record<string, string>;
  conclusion?: string;
  referral?: string;
};

const normalizeText = (value?: string) => value?.trim() || undefined;
const parseApplicationDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime()))
    throw new ConflictException("Data de aplicação inválida.");
  return date;
};

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthUser,
    search?: string,
    status?: string,
    page?: number,
    pageSize?: number,
  ) {
    const where = {
      organizationId: user.organizationId,
      ...(search?.trim()
        ? { title: { contains: search.trim(), mode: "insensitive" as const } }
        : {}),
      ...(status ? { status } : {}),
    };
    const include = {
      patient: true,
      applications: {
        include: { instrumentVersion: { include: { instrument: true } } },
      },
    };
    if (!page && !pageSize)
      return this.prisma.evaluation.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
      });
    const take = Math.min(Math.max(pageSize ?? 20, 1), 100);
    const currentPage = Math.max(page ?? 1, 1);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.evaluation.findMany({
        where,
        include,
        orderBy: { createdAt: "desc" },
        skip: (currentPage - 1) * take,
        take,
      }),
      this.prisma.evaluation.count({ where }),
    ]);
    return {
      items,
      total,
      page: currentPage,
      pageSize: take,
      pages: Math.ceil(total / take),
    };
  }

  create(user: AuthUser, input: EvaluationInput) {
    if (!input.patientId || !input.title?.trim())
      throw new ConflictException("Paciente e título são obrigatórios.");
    return this.prisma.patient
      .findFirst({
        where: {
          id: input.patientId,
          organizationId: user.organizationId,
          OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
        },
      })
      .then((patient) => {
        if (!patient) throw new NotFoundException("Paciente não encontrado.");
        return this.prisma.evaluation.create({
          data: {
            organizationId: user.organizationId,
            patientId: input.patientId,
            professionalId: user.id,
            title: input.title.trim(),
            applicationDate: parseApplicationDate(input.applicationDate),
            requester: normalizeText(input.requester),
            purpose: normalizeText(input.purpose),
            demandDescription: normalizeText(input.demandDescription),
            anamnesis: input.anamnesis as Prisma.InputJsonValue | undefined,
            conclusion: normalizeText(input.conclusion),
            referral: normalizeText(input.referral),
          },
        });
      })
      .then(async (evaluation) => {
        await this.audit.record(
          user,
          "EVALUATION_CREATED",
          "Evaluation",
          evaluation.id,
        );
        return evaluation;
      });
  }

  async get(user: AuthUser, id: string) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        patient: true,
        applications: {
          include: { instrumentVersion: { include: { instrument: true } } },
        },
        reports: { orderBy: { revision: "desc" } },
      },
    });
    if (!evaluation) throw new NotFoundException("Avaliação não encontrada.");
    return evaluation;
  }

  async update(user: AuthUser, id: string, input: Partial<EvaluationInput>) {
    const evaluation = await this.get(user, id);
    if (input.title !== undefined && !input.title.trim())
      throw new ConflictException("O título do laudo não pode ficar vazio.");
    return this.prisma.evaluation
      .update({
        where: { id: evaluation.id },
        data: {
          ...(input.title !== undefined ? { title: input.title.trim() } : {}),
          ...(input.applicationDate !== undefined
            ? { applicationDate: parseApplicationDate(input.applicationDate) }
            : {}),
          ...(input.requester !== undefined
            ? { requester: normalizeText(input.requester) }
            : {}),
          ...(input.purpose !== undefined
            ? { purpose: normalizeText(input.purpose) }
            : {}),
          ...(input.demandDescription !== undefined
            ? { demandDescription: normalizeText(input.demandDescription) }
            : {}),
          ...(input.anamnesis !== undefined
            ? { anamnesis: input.anamnesis as Prisma.InputJsonValue }
            : {}),
          ...(input.conclusion !== undefined
            ? { conclusion: normalizeText(input.conclusion) }
            : {}),
          ...(input.referral !== undefined
            ? { referral: normalizeText(input.referral) }
            : {}),
        },
      })
      .then(async (updated) => {
        await this.audit.record(
          user,
          "EVALUATION_UPDATED",
          "Evaluation",
          updated.id,
        );
        return updated;
      });
  }

  async addApplication(
    user: AuthUser,
    evaluationId: string,
    instrumentVersionId: string,
  ) {
    const evaluation = await this.get(user, evaluationId);
    const version = await this.prisma.instrumentVersion.findFirst({
      where: { id: instrumentVersionId, status: "PUBLISHED" },
    });
    if (!version)
      throw new NotFoundException("Versão publicada não encontrada.");
    const existing = await this.prisma.instrumentApplication.findFirst({
      where: {
        organizationId: user.organizationId,
        evaluationId: evaluation.id,
        instrumentVersionId: version.id,
      },
    });
    if (existing)
      throw new ConflictException(
        "Este instrumento já foi adicionado ao laudo.",
      );
    return this.prisma.instrumentApplication
      .create({
        data: {
          organizationId: user.organizationId,
          evaluationId: evaluation.id,
          instrumentVersionId: version.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      })
      .then(async (application) => {
        await this.syncStatus(evaluation.id);
        await this.audit.record(
          user,
          "INSTRUMENT_STARTED",
          "InstrumentApplication",
          application.id,
        );
        return this.getApplication(user, application.id);
      });
  }

  async getApplication(user: AuthUser, id: string) {
    const application = await this.prisma.instrumentApplication.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        evaluation: true,
        instrumentVersion: { include: { instrument: true } },
      },
    });
    if (!application) throw new NotFoundException("Aplicação não encontrada.");
    if (application.instrumentVersion.instrument.code !== "SNAP-IV") return application;

    const legacySchema = application.instrumentVersion.formSchema as unknown as {
      sections?: Array<{ fields?: Array<{ id: string; label?: string; options?: Array<{ value: string; label: string }> }> }>;
    };
    const answers = { ...((application.answers ?? {}) as Record<string, unknown>) };
    const legacyFields = (legacySchema.sections ?? []).flatMap((section) => section.fields ?? []);
    const legacyRespondent = legacyFields.find((field) => /respondente|informante/i.test(`${field.id} ${field.label ?? ""}`));
    const canonicalFields = snapIvInstrument.formSchema.sections.flatMap((section) => section.fields);
    const canonicalRespondent = canonicalFields.find((field) => field.id === "snap_iv_form_1_respondent");
    const canonicalItems = canonicalFields.filter((field) => /^snap_iv_form_1_item_\d+$/.test(field.id));

    if (legacyRespondent && canonicalRespondent && answers[legacyRespondent.id] !== undefined) {
      const oldValue = String(answers[legacyRespondent.id]);
      const oldLabel = legacyRespondent.options?.find((option) => option.value === oldValue)?.label ?? oldValue;
      const normalizedLabel = oldLabel.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const standardRespondents: Record<string, string> = {
        autorelato: "self",
        mae: "mother",
        pai: "father",
        professor: "teacher",
      };
      answers[canonicalRespondent.id] = standardRespondents[normalizedLabel] ?? oldLabel;
    }
    const legacyItems = legacyFields
      .filter((field) => field.id !== legacyRespondent?.id && field.options?.length === 4)
      .slice(0, canonicalItems.length);
    legacyItems.forEach((field, index) => {
      if (answers[field.id] !== undefined) answers[canonicalItems[index].id] = answers[field.id];
    });

    return {
      ...application,
      answers: answers as typeof application.answers,
      instrumentVersion: {
        ...application.instrumentVersion,
        formSchema: snapIvInstrument.formSchema as unknown as typeof application.instrumentVersion.formSchema,
        rules: snapIvInstrument.rules as unknown as typeof application.instrumentVersion.rules,
        outputSchema: snapIvInstrument.outputSchema as unknown as typeof application.instrumentVersion.outputSchema,
        presentationSchema: snapIvInstrument.presentationSchema as unknown as typeof application.instrumentVersion.presentationSchema,
      },
    };
  }

  async saveAnswers(
    user: AuthUser,
    id: string,
    answers: Record<string, unknown>,
  ) {
    const application = await this.getApplication(user, id);
    if (["LOCKED", "REVIEWED"].includes(application.status))
      throw new Error("A aplicação está bloqueada para edição.");
    const updated = await this.prisma.instrumentApplication.update({
      where: { id: application.id },
      data: {
        answers: answers as Prisma.InputJsonValue,
        status: "IN_PROGRESS",
      },
    });
    await this.syncStatus(application.evaluationId);
    return updated;
  }

  async syncStatus(evaluationId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: { applications: { select: { status: true } } },
    });
    if (!evaluation) return;
    const statuses = evaluation.applications.map((application) => application.status);
    const status =
      statuses.length === 0
        ? "DRAFT"
        : statuses.every((current) => current === "LOCKED")
          ? "COMPLETED"
          : statuses.some((current) =>
                ["NOT_STARTED", "IN_PROGRESS", "REOPENED"].includes(current),
              )
            ? "IN_PROGRESS"
            : statuses.some((current) => current === "CALCULATED")
              ? "CALCULATED"
              : statuses.some((current) => current === "REVIEWED")
                ? "REVIEWED"
                : "DRAFT";
    await this.prisma.evaluation.update({ where: { id: evaluationId }, data: { status } });
  }
}

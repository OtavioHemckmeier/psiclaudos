import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth.types";
import { AuditService } from "../audit.service";

const activePatientFilter = (): Prisma.PatientWhereInput => ({
  OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
});

export type PatientInput = {
  name: string;
  document?: string;
  birthDate?: string;
  gender?: string;
  email?: string;
  phone?: string;
  education?: string;
  healthPlan?: string;
  responsible1Name?: string;
  responsible1Phone?: string;
  responsible2Name?: string;
  responsible2Phone?: string;
  address?: Record<string, unknown>;
  notes?: string;
  metadata?: Record<string, unknown>;
};

const normalizeText = (value?: string) => value?.trim() || undefined;

const validCpf = (value: string) => {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (length: number) => {
    const sum = value
      .slice(0, length)
      .split("")
      .reduce(
        (total, item, index) => total + Number(item) * (length + 1 - index),
        0,
      );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
};

const validatePatientInput = (input: Partial<PatientInput>) => {
  const document = input.document?.replace(/\D/g, "");
  if (document && !validCpf(document))
    throw new ConflictException("Informe um CPF válido.");
  for (const phone of [
    input.phone,
    input.responsible1Phone,
    input.responsible2Phone,
  ]) {
    const digits = phone?.replace(/\D/g, "");
    if (digits && (digits.length < 10 || digits.length > 11))
      throw new ConflictException("Informe um telefone válido com DDD.");
  }
  const cep = (input.address as Record<string, unknown> | undefined)?.cep;
  if (
    typeof cep === "string" &&
    cep.replace(/\D/g, "") &&
    cep.replace(/\D/g, "").length !== 8
  )
    throw new ConflictException("Informe um CEP válido.");
  if (
    input.birthDate &&
    (Number.isNaN(new Date(input.birthDate).getTime()) ||
      new Date(input.birthDate) > new Date())
  )
    throw new ConflictException("Informe uma data de nascimento válida.");
};

const patientData = (
  input: Partial<PatientInput>,
  includeUndefined = false,
) => ({
  ...(includeUndefined || input.document !== undefined
    ? { document: input.document?.replace(/\D/g, "") || undefined }
    : {}),
  ...(includeUndefined || input.birthDate !== undefined
    ? { birthDate: input.birthDate ? new Date(input.birthDate) : undefined }
    : {}),
  ...(includeUndefined || input.gender !== undefined
    ? { gender: normalizeText(input.gender) }
    : {}),
  ...(includeUndefined || input.email !== undefined
    ? { email: normalizeText(input.email) }
    : {}),
  ...(includeUndefined || input.phone !== undefined
    ? { phone: normalizeText(input.phone) }
    : {}),
  ...(includeUndefined || input.education !== undefined
    ? { education: normalizeText(input.education) }
    : {}),
  ...(includeUndefined || input.healthPlan !== undefined
    ? { healthPlan: normalizeText(input.healthPlan) }
    : {}),
  ...(includeUndefined || input.responsible1Name !== undefined
    ? { responsible1Name: normalizeText(input.responsible1Name) }
    : {}),
  ...(includeUndefined || input.responsible1Phone !== undefined
    ? { responsible1Phone: normalizeText(input.responsible1Phone) }
    : {}),
  ...(includeUndefined || input.responsible2Name !== undefined
    ? { responsible2Name: normalizeText(input.responsible2Name) }
    : {}),
  ...(includeUndefined || input.responsible2Phone !== undefined
    ? { responsible2Phone: normalizeText(input.responsible2Phone) }
    : {}),
  ...(includeUndefined || input.address !== undefined
    ? { address: input.address as Prisma.InputJsonValue | undefined }
    : {}),
  ...(includeUndefined || input.notes !== undefined
    ? { notes: normalizeText(input.notes) }
    : {}),
  ...(includeUndefined || input.metadata !== undefined
    ? { metadata: input.metadata as Prisma.InputJsonValue | undefined }
    : {}),
});

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthUser,
    search?: string,
    page?: number,
    pageSize?: number,
  ) {
    const where: Prisma.PatientWhereInput = {
      organizationId: user.organizationId,
      AND: [activePatientFilter()],
      ...(search?.trim()
        ? { name: { contains: search.trim(), mode: "insensitive" as const } }
        : {}),
    };
    if (!page && !pageSize)
      return this.prisma.patient.findMany({ where, orderBy: { name: "asc" } });
    const take = Math.min(Math.max(pageSize ?? 20, 1), 100);
    const currentPage = Math.max(page ?? 1, 1);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (currentPage - 1) * take,
        take,
      }),
      this.prisma.patient.count({ where }),
    ]);
    return {
      items,
      total,
      page: currentPage,
      pageSize: take,
      pages: Math.ceil(total / take),
    };
  }

  create(user: AuthUser, input: PatientInput) {
    if (!input.name?.trim())
      throw new ConflictException("O nome do paciente é obrigatório.");
    validatePatientInput(input);
    const normalizedDocument = input.document?.replace(/\D/g, "") || undefined;
    const duplicate = normalizedDocument
      ? this.prisma.patient.findFirst({
          where: {
            organizationId: user.organizationId,
            document: normalizedDocument,
            AND: [activePatientFilter()],
          },
        })
      : Promise.resolve(null);
    return duplicate
      .then(async (existing) => {
        if (existing)
          throw new ConflictException(
            "Já existe um paciente ativo com este documento.",
          );
        return this.prisma.patient.create({
          data: {
            organizationId: user.organizationId,
            name: input.name.trim(),
            ...patientData({ ...input, document: normalizedDocument }, true),
          },
        });
      })
      .then(async (patient) => {
        await this.audit.record(user, "PATIENT_CREATED", "Patient", patient.id);
        return patient;
      });
  }

  async get(user: AuthUser, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        AND: [activePatientFilter()],
      },
    });
    if (!patient) throw new NotFoundException("Paciente não encontrado.");
    return patient;
  }

  async details(user: AuthUser, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        AND: [activePatientFilter()],
      },
      include: {
        evaluations: {
          orderBy: { createdAt: "desc" },
          include: { applications: true },
        },
      },
    });
    if (!patient) throw new NotFoundException("Paciente não encontrado.");
    return patient;
  }

  async update(user: AuthUser, id: string, input: Partial<PatientInput>) {
    await this.get(user, id);
    if (input.name !== undefined && !input.name.trim())
      throw new ConflictException("O nome do paciente não pode ficar vazio.");
    validatePatientInput(input);
    const normalizedDocument = input.document?.replace(/\D/g, "") || undefined;
    if (normalizedDocument) {
      const duplicate = await this.prisma.patient.findFirst({
        where: {
          organizationId: user.organizationId,
          document: normalizedDocument,
          id: { not: id },
          AND: [activePatientFilter()],
        },
      });
      if (duplicate)
        throw new ConflictException(
          "Já existe um paciente ativo com este documento.",
        );
    }
    return this.prisma.patient
      .update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...patientData({
            ...input,
            document:
              input.document === undefined ? undefined : normalizedDocument,
          }),
        },
      })
      .then(async (patient) => {
        await this.audit.record(user, "PATIENT_UPDATED", "Patient", patient.id);
        return patient;
      });
  }

  async updateNotes(user: AuthUser, id: string, notes: string) {
    await this.get(user, id);
    const patient = await this.prisma.patient.update({
      where: { id },
      data: { notes: normalizeText(notes) },
    });
    await this.audit.record(
      user,
      "PATIENT_NOTES_UPDATED",
      "Patient",
      patient.id,
    );
    return patient;
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.prisma.patient
      .update({ where: { id }, data: { deletedAt: new Date() } })
      .then(async (patient) => {
        await this.audit.record(
          user,
          "PATIENT_ARCHIVED",
          "Patient",
          patient.id,
        );
        return patient;
      });
  }
}

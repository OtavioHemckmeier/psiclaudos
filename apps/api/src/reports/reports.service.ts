import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth.types";
import { AuditService } from "../audit.service";

type PresentationField = { id: string; label?: string };
type PresentationSchema = {
  tables?: Array<{ title?: string; columns: PresentationField[] }>;
  charts?: Array<{ title?: string; type: "BAR"; fields: PresentationField[] }>;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generate(user: AuthUser, evaluationId: string) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, organizationId: user.organizationId },
      include: {
        patient: true,
        applications: {
          include: { instrumentVersion: { include: { instrument: true } } },
        },
      },
    });
    if (!evaluation) throw new NotFoundException("Avaliação não encontrada.");
    const applications = evaluation.applications.filter(
      (application) => application.result && application.status === "LOCKED",
    );
    if (applications.length === 0)
      throw new NotFoundException(
        "A avaliação ainda não possui resultados calculados.",
      );
    const professional = await this.prisma.user.findFirst({
      where: { id: user.id, organizationId: user.organizationId },
      select: {
        name: true,
        professionalRegistration: true,
        signatureText: true,
        organization: { select: { name: true, email: true, phone: true } },
      },
    });
    const snapshot = {
      evaluationId,
      evaluation: {
        title: evaluation.title,
        requester: evaluation.requester,
        purpose: evaluation.purpose,
        demandDescription: evaluation.demandDescription,
        anamnesis: evaluation.anamnesis,
        conclusion: evaluation.conclusion,
        referral: evaluation.referral,
      },
      patient: evaluation.patient,
      applications,
      professional,
      generatedBy: user.id,
    };
    const buffer = await this.renderPdf(snapshot);
    const hash = createHash("sha256").update(buffer).digest("hex");
    const revision =
      (await this.prisma.generatedReport.count({ where: { evaluationId } })) +
      1;
    const report = await this.prisma.generatedReport.create({
      data: {
        organizationId: user.organizationId,
        evaluationId,
        revision,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
        storageKey: "",
        hash,
        generatedBy: user.id,
      },
    });
    const storageKey = `reports/${report.id}.pdf`;
    await mkdir(join(process.cwd(), "storage", "reports"), { recursive: true });
    await writeFile(
      join(process.cwd(), "storage", storageKey.replace("reports/", "")),
      buffer,
    );
    const generated = await this.prisma.generatedReport.update({
      where: { id: report.id },
      data: { storageKey },
    });
    await this.audit.record(
      user,
      "REPORT_GENERATED",
      "GeneratedReport",
      generated.id,
      { evaluationId, revision, hash },
    );
    return generated;
  }

  async list(user: AuthUser, evaluationId: string) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!evaluation) throw new NotFoundException("Avaliação não encontrada.");
    return this.prisma.generatedReport.findMany({
      where: { evaluationId, organizationId: user.organizationId },
      orderBy: { revision: "desc" },
      select: {
        id: true,
        revision: true,
        hash: true,
        generatedBy: true,
        generatedAt: true,
      },
    });
  }

  async download(user: AuthUser, id: string) {
    const report = await this.prisma.generatedReport.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!report) throw new NotFoundException("Relatório não encontrado.");
    let file: Buffer;
    try {
      file = await readFile(
        join(
          process.cwd(),
          "storage",
          report.storageKey.replace("reports/", ""),
        ),
      );
    } catch {
      throw new NotFoundException("Arquivo do relatório não encontrado.");
    }
    const actualHash = createHash("sha256").update(file).digest("hex");
    if (actualHash !== report.hash)
      throw new InternalServerErrorException(
        "A integridade do PDF não pôde ser confirmada.",
      );
    await this.audit.record(
      user,
      "REPORT_DOWNLOADED",
      "GeneratedReport",
      report.id,
      {
        evaluationId: report.evaluationId,
        revision: report.revision,
        hash: report.hash,
      },
    );
    return { report, file };
  }

  private renderPdf(snapshot: {
    evaluation: {
      title: string;
      requester: string | null;
      purpose: string | null;
      demandDescription: string | null;
      anamnesis: unknown;
      conclusion: string | null;
      referral: string | null;
    };
    patient: { name: string; birthDate: Date | null };
    applications: Array<{
      instrumentVersion: {
        version: string;
        instrument: { name: string };
        presentationSchema: unknown;
      };
      result: unknown;
      professionalSummary: string | null;
    }>;
    professional: {
      name: string;
      professionalRegistration: string | null;
      signatureText: string | null;
      organization: {
        name: string;
        email: string | null;
        phone: string | null;
      } | null;
    } | null;
  }): Promise<Buffer> {
    return new Promise((resolve) => {
      const document = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      document.on("data", (chunk) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));
      document
        .fontSize(20)
        .text(snapshot.evaluation.title || "Relatório de resultados", {
          align: "center",
        });
      if (snapshot.professional?.organization?.name)
        document
          .moveDown(0.2)
          .fontSize(10)
          .fillColor("#555")
          .text(snapshot.professional.organization.name, { align: "center" });
      document
        .moveDown()
        .fontSize(12)
        .text(`Paciente: ${snapshot.patient.name}`);
      if (snapshot.professional)
        document.text(
          `Profissional: ${snapshot.professional.name}${snapshot.professional.professionalRegistration ? ` · ${snapshot.professional.professionalRegistration}` : ""}`,
        );
      if (snapshot.patient.birthDate)
        document.text(
          `Data de nascimento: ${snapshot.patient.birthDate.toLocaleDateString("pt-BR")}`,
        );
      this.renderTextSection(
        document,
        "Solicitante",
        snapshot.evaluation.requester,
      );
      this.renderTextSection(
        document,
        "Finalidade",
        snapshot.evaluation.purpose,
      );
      this.renderTextSection(
        document,
        "Descrição da demanda",
        snapshot.evaluation.demandDescription,
      );
      const anamnesis = this.asRecord(snapshot.evaluation.anamnesis);
      this.renderTextSection(
        document,
        "História pessoal e desenvolvimento",
        this.displayValue(anamnesis.personalHistory),
      );
      this.renderTextSection(
        document,
        "Contexto familiar e relacional",
        this.displayValue(anamnesis.familyContext),
      );
      this.renderTextSection(
        document,
        "Histórico médico e psiquiátrico",
        this.displayValue(anamnesis.medicalHistory),
      );
      this.renderTextSection(
        document,
        "Fatores psicossociais e ambientais",
        this.displayValue(anamnesis.psychosocialFactors),
      );
      document.moveDown();
      for (const application of snapshot.applications) {
        document
          .fontSize(15)
          .text(
            `${application.instrumentVersion.instrument.name} — versão ${application.instrumentVersion.version}`,
          );
        const result = this.asRecord(application.result);
        const presentation = this.presentationSchema(
          application.instrumentVersion.presentationSchema,
        );
        const tables = presentation.tables?.length
          ? presentation.tables
          : [
              {
                title: "Resultados calculados",
                columns: Object.keys(result).map((id) => ({ id })),
              },
            ];
        for (const table of tables) this.renderTable(document, table, result);
        for (const chart of presentation.charts ?? [])
          this.renderBarChart(document, chart, result);
        if (application.professionalSummary)
          document
            .moveDown()
            .text(`Síntese revisada: ${application.professionalSummary}`);
        document.moveDown();
      }
      this.renderTextSection(
        document,
        "Conclusão",
        snapshot.evaluation.conclusion,
      );
      this.renderTextSection(
        document,
        "Encaminhamento",
        snapshot.evaluation.referral,
      );
      if (snapshot.professional?.signatureText)
        document
          .moveDown(2)
          .fontSize(10)
          .fillColor("#111")
          .text(snapshot.professional.signatureText, { align: "center" });
      document
        .moveDown()
        .fontSize(9)
        .fillColor("#555")
        .text(
          "Documento de apoio à correção e análise profissional. Não constitui diagnóstico automático.",
        );
      document.end();
    });
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private presentationSchema(value: unknown): PresentationSchema {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as PresentationSchema)
      : {};
  }

  private renderTable(
    document: PDFKit.PDFDocument,
    table: { title?: string; columns: PresentationField[] },
    result: Record<string, unknown>,
  ) {
    const columns = table.columns.filter((column) => column.id in result);
    if (columns.length === 0) return;
    const width =
      (document.page.width -
        document.page.margins.left -
        document.page.margins.right) /
      columns.length;
    if (document.y > document.page.height - document.page.margins.bottom - 80)
      document.addPage();
    document
      .moveDown(0.5)
      .fontSize(12)
      .fillColor("#111")
      .text(table.title ?? "Resultados");
    const headerY = document.y + 4;
    document.fontSize(9).fillColor("#555");
    columns.forEach((column, index) =>
      document.text(
        column.label ?? column.id,
        document.page.margins.left + index * width,
        headerY,
        { width: width - 8 },
      ),
    );
    const rowY = headerY + 20;
    document.fontSize(10).fillColor("#111");
    columns.forEach((column, index) =>
      document.text(
        this.displayValue(result[column.id]),
        document.page.margins.left + index * width,
        rowY,
        { width: width - 8 },
      ),
    );
    document.y = rowY + 22;
  }

  private renderBarChart(
    document: PDFKit.PDFDocument,
    chart: { title?: string; type: "BAR"; fields: PresentationField[] },
    result: Record<string, unknown>,
  ) {
    const values = chart.fields
      .map((field) => ({ ...field, value: Number(result[field.id]) }))
      .filter((field) => Number.isFinite(field.value));
    if (values.length === 0) return;
    const chartWidth =
      document.page.width -
      document.page.margins.left -
      document.page.margins.right -
      155;
    const maximum = Math.max(1, ...values.map((field) => field.value));
    if (
      document.y >
      document.page.height -
        document.page.margins.bottom -
        (values.length * 30 + 45)
    )
      document.addPage();
    document
      .moveDown(0.5)
      .fontSize(12)
      .fillColor("#111")
      .text(chart.title ?? "Gráfico");
    for (const field of values) {
      const y = document.y + 4;
      document
        .fontSize(9)
        .fillColor("#555")
        .text(field.label ?? field.id, document.page.margins.left, y, {
          width: 110,
        });
      document
        .rect(
          document.page.margins.left + 115,
          y,
          chartWidth * (field.value / maximum),
          16,
        )
        .fill("#276EF1");
      document
        .fillColor("#111")
        .text(
          String(field.value),
          document.page.margins.left + 120 + chartWidth,
          y,
          { width: 35 },
        );
      document.y = y + 24;
    }
  }

  private displayValue(value: unknown) {
    return typeof value === "object"
      ? JSON.stringify(value)
      : String(value ?? "—");
  }

  private renderTextSection(
    document: PDFKit.PDFDocument,
    title: string,
    content?: string | null,
  ) {
    if (!content || content === "—") return;
    if (document.y > document.page.height - document.page.margins.bottom - 90)
      document.addPage();
    document.moveDown(0.6).fontSize(12).fillColor("#111").text(title);
    document.moveDown(0.2).fontSize(10).text(content);
  }
}

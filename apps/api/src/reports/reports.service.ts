import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { PrismaService } from "../prisma.service";
import { AuthUser } from "../auth/auth.types";
import { AuditService } from "../audit.service";
import {
  instrumentReportContent,
  instrumentReportPresentation,
  instrumentReportReferences,
  instrumentReportTables,
  scaredReportTableNote,
  type InstrumentReportContent,
  type InstrumentReportTable,
  type PresentationField,
  type PresentationSchema,
} from "./instrument-report";
type ReportExportOptions = {
  chapters?: Partial<Record<"coverPage" | "identification" | "demand" | "procedures" | "anamnesis" | "conclusion" | "referral" | "references" | "deliveryTerm", boolean>>;
  tests?: Record<string, { table?: boolean; chart?: boolean }>;
};
type GoogleTable = {
  tableRows?: Array<{
    tableCells?: Array<{
      content?: Array<{ paragraph?: { elements?: Array<{ startIndex?: number; endIndex?: number }> } }>;
    }>;
  }>;
};
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async generate(user: AuthUser, evaluationId: string, inputOptions?: ReportExportOptions) {
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
    ).map((application) => {
      const result = this.asRecord(application.result);
      const code = application.instrumentVersion.instrument.code;
      const reportPresentation = instrumentReportPresentation(code, result, application.instrumentVersion.presentationSchema);
      return {
        ...application,
        reportContent: instrumentReportContent(code),
        reportPresentation,
        reportTables: instrumentReportTables(code, result, reportPresentation),
      };
    });
    if (applications.length === 0)
      throw new NotFoundException(
        "A avaliação ainda não possui resultados calculados.",
      );
    const exportOptions = {
      chapters: {
        coverPage: false,
        identification: true,
        demand: true,
        procedures: true,
        anamnesis: true,
        conclusion: true,
        referral: true,
        references: true,
        deliveryTerm: true,
        ...inputOptions?.chapters,
      },
      tests: Object.fromEntries(
        applications.map((application) => [
          application.id,
          { table: true, chart: true, ...inputOptions?.tests?.[application.id] },
        ]),
      ),
    };
    const professional = await this.prisma.user.findFirst({
      where: { id: user.id, organizationId: user.organizationId },
      select: {
        name: true,
        email: true,
        phone: true,
        professionalRegistration: true,
        signatureText: true,
        organization: { select: { name: true, email: true, phone: true } },
      },
    });
    const snapshot = {
      evaluationId,
      evaluation: {
        title: evaluation.title,
        applicationDate: evaluation.applicationDate,
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
      exportOptions,
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

  async startGoogleDocsExport(user: AuthUser, reportId: string) {
    this.googleConfig();
    const report = await this.prisma.generatedReport.findFirst({
      where: { id: reportId, organizationId: user.organizationId, generatedBy: user.id },
      select: { id: true },
    });
    if (!report) throw new NotFoundException("Relatório não encontrado.");
    const state = this.signGoogleState({
      reportId,
      userId: user.id,
      organizationId: user.organizationId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    const config = this.googleConfig();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive.file",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
      state,
    }).toString();
    return { authorizationUrl: url.toString() };
  }

  async completeGoogleDocsExport(code: string, state: string) {
    const payload = this.verifyGoogleState(state);
    if (!code) throw new BadRequestException("A autorização do Google não foi concluída.");
    const config = this.googleConfig();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenResponse.json()) as { access_token?: string; error_description?: string };
    if (!tokenResponse.ok || !token.access_token)
      throw new BadRequestException(token.error_description || "Não foi possível autorizar o Google Docs.");
    const report = await this.prisma.generatedReport.findFirst({
      where: { id: payload.reportId, organizationId: payload.organizationId, generatedBy: payload.userId },
      select: { id: true, snapshot: true },
    });
    if (!report) throw new NotFoundException("Relatório não encontrado.");
    const snapshot = report.snapshot as unknown as Parameters<ReportsService["googleDocumentText"]>[0];
    const created = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: snapshot.evaluation.title || "Laudo psicológico" }),
    });
    const document = (await created.json()) as { documentId?: string; error?: { message?: string } };
    if (!created.ok || !document.documentId)
      throw new BadRequestException(document.error?.message || "Não foi possível criar o documento no Google Docs.");
    const content = this.googleDocumentText(snapshot);
    const updated = await fetch(`https://docs.googleapis.com/v1/documents/${document.documentId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: snapshot.exportOptions.chapters.coverPage
        ? [
            this.googleDocumentStyleRequest(),
            { insertText: { location: { index: 1 }, text: this.googleCoverText(snapshot) } },
            ...this.googleCoverFormattingRequests(this.googleCoverText(snapshot)),
          ]
        : [
            this.googleDocumentStyleRequest(),
            { insertText: { location: { index: 1 }, text: `${content}\n` } },
            ...this.googleDocumentFormattingRequests(content),
          ],
      }),
    });
    if (!updated.ok) throw new BadRequestException("O documento foi criado, mas não foi possível inserir o conteúdo.");
    if (snapshot.exportOptions.chapters.coverPage) {
      await this.appendGooglePageBreak(document.documentId, token.access_token);
      await this.appendGoogleTextBlock(document.documentId, token.access_token, content, true);
    }
    let tableNumber = 1;
    let chartNumber = 1;
    for (const [applicationIndex, application] of snapshot.applications.entries()) {
      const result = this.asRecord(application.result);
      const code = application.instrumentVersion.instrument.code ?? application.instrumentVersion.instrument.name;
      const content = this.reportContentFor(application);
      const presentation = application.reportPresentation ?? instrumentReportPresentation(code, result, application.instrumentVersion.presentationSchema);
      const tables = application.reportTables ?? instrumentReportTables(code, result, presentation);
      const options = snapshot.exportOptions.tests[application.id] ?? { table: true, chart: true };
      await this.appendGoogleTextBlock(
        document.documentId,
        token.access_token,
        [
          `4.${applicationIndex + 2}. ${application.instrumentVersion.instrument.name} — versão ${application.instrumentVersion.version}`,
          `Base conceitual: ${content.theoreticalContext}`,
          content.interpretation,
        ].join("\n"),
      );
      if (options.table) {
        for (const table of tables) {
          const title = `Tabela ${tableNumber++}. ${table.title}`;
          if (table.kind === "matrix")
            await this.appendGoogleTable(document.documentId, token.access_token, title, [table.headers, ...table.rows]);
          else
            await this.appendGoogleResultsTable(document.documentId, token.access_token, title, table.fields.map((field) => [field.label, field.value]));
        }
        if (tables.some((table) => table.kind === "matrix") && (code === "SCARED-C" || code === "SCARED-P"))
          await this.appendGoogleTextBlock(document.documentId, token.access_token, scaredReportTableNote);
      }
      if (options.chart) {
        for (const chart of presentation.charts ?? []) {
          const values = chart.fields
            .map((field) => ({ label: field.label ?? field.id, value: Number(result[field.id]) }))
            .filter((field) => Number.isFinite(field.value));
          if (values.length === 0) continue;
          const maximum = Math.max(1, chart.maximum ?? 0, ...values.map((field) => field.value));
          const chartTitle = `Gráfico ${chartNumber++}. ${chart.title ?? "Resultados"}`;
          if (await this.appendGoogleChartImage(
            document.documentId,
            token.access_token,
            chartTitle,
            values,
            maximum,
            chart.expectedRange,
          )) continue;
          await this.appendGoogleChart(
            document.documentId,
            token.access_token,
            chartTitle,
            values,
            maximum,
            chart.expectedRange,
          );
        }
      }
      if (application.professionalSummary)
        await this.appendGoogleTextBlock(document.documentId, token.access_token, `Interpretação dos resultados\n${application.professionalSummary}`);
    }
    await this.appendGoogleTextBlock(document.documentId, token.access_token, this.googleDocumentClosingText(snapshot));
    await this.addGooglePageFurniture(document.documentId, token.access_token, snapshot);
    await this.audit.record({ id: payload.userId, organizationId: payload.organizationId, email: "", role: "PSYCHOLOGIST" }, "REPORT_EXPORTED_TO_GOOGLE_DOCS", "GeneratedReport", report.id, {});
    return `https://docs.google.com/document/d/${document.documentId}/edit`;
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
      applicationDate: Date | null;
      requester: string | null;
      purpose: string | null;
      demandDescription: string | null;
      anamnesis: unknown;
      conclusion: string | null;
      referral: string | null;
    };
    patient: { name: string; birthDate: Date | null; document?: string | null };
    applications: Array<{
      id: string;
      instrumentVersion: {
        version: string;
        instrument: { name: string; code?: string };
        presentationSchema: unknown;
        sourceMetadata: unknown;
      };
      result: unknown;
      professionalSummary: string | null;
      reportContent?: InstrumentReportContent;
      reportPresentation?: PresentationSchema;
      reportTables?: InstrumentReportTable[];
    }>;
      professional: {
      name: string;
      email: string;
      phone: string | null;
      professionalRegistration: string | null;
      signatureText: string | null;
      organization: {
        name: string;
        email: string | null;
        phone: string | null;
      } | null;
      } | null;
    exportOptions: {
      chapters: Record<string, boolean>;
      tests: Record<string, { table: boolean; chart: boolean }>;
    };
  }): Promise<Buffer> {
    return new Promise((resolve) => {
      const document = new PDFDocument({
        size: "A4",
        margins: { top: 136, right: 72, bottom: 94, left: 72 },
        bufferPages: true,
        info: {
          Title: snapshot.evaluation.title || "Laudo psicológico",
          Author: snapshot.professional?.name || "Profissional responsável",
          Subject: "Laudo psicológico de avaliação",
        },
      });
      const chunks: Buffer[] = [];
      document.on("data", (chunk) => chunks.push(chunk));
      document.on("end", () => resolve(Buffer.concat(chunks)));

      const hasCoverPage = Boolean(snapshot.exportOptions.chapters.coverPage);
      document.on("pageAdded", () => {
        this.renderPageHeader(document, snapshot.professional);
      });

      if (snapshot.exportOptions.chapters.coverPage) {
        this.renderCover(document, snapshot);
        document.addPage();
      } else {
        this.renderPageHeader(document, snapshot.professional);
      }
      document
        .font("Helvetica-Bold")
        .fontSize(17)
        .fillColor("#111111")
        .text(snapshot.evaluation.title || "Laudo psicológico de avaliação", { align: "center" })
        .moveDown(0.45)
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#222222")
        .text(this.technicalNotice(), { align: "justify", lineGap: 2 });
      this.drawRule(document);
      if (snapshot.exportOptions.chapters.identification) {
        document.moveDown(0.75).font("Helvetica-Bold").fontSize(13).fillColor("#111111").text("1. Identificação:");
        document.moveDown(0.7).fontSize(12).text("1.1. Identificação do laudo:");
        document.font("Helvetica").fontSize(10).fillColor("#111");
        if (snapshot.professional)
          this.renderLabelValue(document, "Autoria", `${snapshot.professional.name}${snapshot.professional.professionalRegistration ? ` (${snapshot.professional.professionalRegistration})` : ""}`);
        this.renderLabelValue(document, "Solicitante", snapshot.evaluation.requester || "Não informado");
        this.renderLabelValue(document, "Finalidade", snapshot.evaluation.purpose || "Não informada");
        document.moveDown(0.75).font("Helvetica-Bold").fontSize(12).fillColor("#111111").text("1.2. Identificação da pessoa avaliada:");
        document.font("Helvetica").fontSize(10).fillColor("#111");
        this.renderLabelValue(document, "Nome", snapshot.patient.name);
        if (snapshot.patient.birthDate)
          this.renderLabelValue(document, "Data de nascimento", snapshot.patient.birthDate.toLocaleDateString("pt-BR"));
        const age = this.age(snapshot.patient.birthDate, snapshot.evaluation.applicationDate);
        if (age !== null) this.renderLabelValue(document, "Idade", `${age} anos`);
        if (snapshot.evaluation.applicationDate)
          this.renderLabelValue(document, "Data da aplicação", snapshot.evaluation.applicationDate.toLocaleDateString("pt-BR"));
      }
      if (snapshot.exportOptions.chapters.demand)
        this.renderTextSection(document, "2. Descrição da demanda", snapshot.evaluation.demandDescription || "Não informada.");
      if (snapshot.exportOptions.chapters.procedures)
        this.renderTextSection(document, "3. Procedimentos", snapshot.applications.map((application) => `• ${application.instrumentVersion.instrument.name} — ${this.reportContentFor(application).purpose}`).join("\n"));
      const anamnesis = this.asRecord(snapshot.evaluation.anamnesis);
      if (snapshot.exportOptions.chapters.anamnesis) {
        document.moveDown().font("Helvetica-Bold").fontSize(13).fillColor("#111111").text("4. Análise dos resultados:");
        document.moveDown(0.7).font("Helvetica-Bold").fontSize(12).text("4.1. Anamnese");
        this.renderTextSection(document, "4.1.1. História pessoal e desenvolvimento", this.displayValue(anamnesis.personalHistory));
        this.renderTextSection(document, "4.1.2. Contexto familiar e relacional", this.displayValue(anamnesis.familyContext));
        this.renderTextSection(document, "4.1.3. Histórico médico e psiquiátrico", this.displayValue(anamnesis.medicalHistory));
        this.renderTextSection(document, "4.1.4. Fatores psicossociais e ambientais", this.displayValue(anamnesis.psychosocialFactors));
      }
      document.moveDown();
      let tableNumber = 1;
      let chartNumber = 1;
      for (const [index, application] of snapshot.applications.entries()) {
        const result = this.asRecord(application.result);
        const code = application.instrumentVersion.instrument.code ?? application.instrumentVersion.instrument.name;
        const content = this.reportContentFor(application);
        const presentation = application.reportPresentation ?? instrumentReportPresentation(code, result, application.instrumentVersion.presentationSchema);
        const tables = application.reportTables ?? instrumentReportTables(code, result, presentation);
        document
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor("#111111")
          .text(
            `4.${index + 2}. ${application.instrumentVersion.instrument.name} — versão ${application.instrumentVersion.version}`,
          );
        document
          .moveDown(0.25)
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor("#344054")
          .text(`Base conceitual: ${content.theoreticalContext}`, { align: "justify", lineGap: 2 })
          .moveDown(0.35)
          .text(content.interpretation, { align: "justify", lineGap: 2 });
        const testOptions = snapshot.exportOptions.tests[application.id] ?? { table: true, chart: true };
        if (testOptions.table) {
          for (const table of tables) {
            const title = `Tabela ${tableNumber++}. ${table.title}`;
            if (table.kind === "matrix")
              this.renderResultTable(document, title, table.headers, table.rows);
            else
              this.renderTable(document, { title, columns: table.fields.map(({ id, label }) => ({ id, label })) }, Object.fromEntries(table.fields.map(({ id, value }) => [id, value])));
          }
          if (tables.some((table) => table.kind === "matrix") && (code === "SCARED-C" || code === "SCARED-P"))
            document.moveDown(0.2).font("Helvetica").fontSize(8.5).fillColor("#344054").text(scaredReportTableNote, { align: "justify" });
        }
        if (testOptions.chart)
          for (const chart of presentation.charts ?? []) {
            if (!chart.fields.some((field) => field.id in result)) continue;
            this.renderBarChart(document, { ...chart, title: `Gráfico ${chartNumber++}. ${chart.title ?? "Resultados"}` }, result);
          }
        if (application.professionalSummary)
          document
            .moveDown()
            .font("Helvetica-Bold")
            .fillColor("#111111")
            .text("Interpretação dos resultados")
            .moveDown(0.2)
            .font("Helvetica")
            .fillColor("#111")
            .text(application.professionalSummary);
        document.moveDown();
      }
      if (snapshot.exportOptions.chapters.conclusion)
        this.renderTextSection(document, "5. Conclusão", snapshot.evaluation.conclusion || "A conclusão deve ser integrada à entrevista, à observação, ao histórico e às demais fontes técnicas pertinentes.");
      if (snapshot.exportOptions.chapters.referral)
        this.renderTextSection(document, "6. Sugestões de encaminhamento", snapshot.evaluation.referral);
      this.renderTextSection(document, "Observações sobre o uso do documento", this.reportUsageNotices());
      if (snapshot.professional) this.renderSignature(document, snapshot.professional, snapshot.evaluation.applicationDate);
      if (snapshot.exportOptions.chapters.references)
        this.renderTextSection(document, "7. Referências bibliográficas", instrumentReportReferences(snapshot.applications.map((application) => this.reportContentFor(application))));
      if (snapshot.exportOptions.chapters.deliveryTerm)
        this.renderTextSection(document, "8. Termo de entrega", this.deliveryTermText(snapshot.professional?.name));
      this.renderPageFooters(document, snapshot.professional, hasCoverPage);
      document.end();
    });
  }

  private renderCover(
    document: PDFKit.PDFDocument,
    snapshot: {
      evaluation: { title: string; applicationDate: Date | null };
      patient: { name: string };
      professional: {
        name: string;
        professionalRegistration: string | null;
      } | null;
    },
  ) {
    const { width, height } = document.page;
    const title = snapshot.evaluation.title || "Laudo psicológico de avaliação";
    document
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#111111")
      .text(snapshot.professional?.name || "Profissional responsável", 72, 74, {
        width: width - 144,
        align: "center",
      });
    if (snapshot.professional?.professionalRegistration)
      document
        .font("Helvetica")
        .fontSize(10)
        .text(snapshot.professional.professionalRegistration, 72, 94, {
          width: width - 144,
          align: "center",
        });
    this.drawMark(document, width - 126, 72);
    document
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#111111")
      .text(title, 72, height * 0.38, { width: width - 144, align: "center" })
      .font("Helvetica")
      .fontSize(12)
      .text(snapshot.patient.name, 72, height * 0.38 + 42, {
        width: width - 144,
        align: "center",
      })
      .fontSize(10)
      .fillColor("#444444")
      .text(this.formattedPlaceAndDate(snapshot.evaluation.applicationDate), 72, height - 108, {
        width: width - 144,
        align: "center",
      });
  }

  private renderPageHeader(
    document: PDFKit.PDFDocument,
    professional: { name: string; professionalRegistration: string | null } | null,
  ) {
    const { width } = document.page;
    document
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#111111")
      .text(professional?.name || "Profissional responsável", 72, 46, {
        width: width - 144,
        align: "center",
      });
    if (professional?.professionalRegistration)
      document
        .font("Helvetica")
        .fontSize(8.5)
        .text(professional.professionalRegistration, 72, 60, {
          width: width - 144,
          align: "center",
        });
    this.drawMark(document, width - 112, 44);
    document
      .moveTo(72, 108)
      .lineTo(width - 72, 108)
      .lineWidth(0.5)
      .strokeColor("#222222")
      .stroke();
    document.x = document.page.margins.left;
    document.y = document.page.margins.top;
  }

  private renderPageFooters(
    document: PDFKit.PDFDocument,
    professional: {
      email: string;
      phone: string | null;
      organization: { email: string | null; phone: string | null } | null;
    } | null,
    hasCoverPage: boolean,
  ) {
    const range = document.bufferedPageRange();
    const firstContentPage = hasCoverPage ? 1 : 0;
    const contentPages = range.count - firstContentPage;
    for (let index = firstContentPage; index < range.count; index += 1) {
      document.switchToPage(index);
      const { width, height } = document.page;
      const bottomMargin = document.page.margins.bottom;
      document.page.margins.bottom = 0;
      const phone = professional?.phone || professional?.organization?.phone;
      const email = professional?.email || professional?.organization?.email;
      const lines = [phone ? `Telefone: ${phone}` : null, email ? `E-mail: ${email}` : null].filter(Boolean);
      document.font("Helvetica-Bold").fontSize(8.5).fillColor("#222222");
      lines.forEach((line, lineIndex) =>
        document.text(line as string, 72, height - 66 + lineIndex * 12, {
          width: width - 144,
          height: 10,
          align: "center",
        }),
      );
      document
        .font("Helvetica")
        .fontSize(8.5)
        .text(`Página ${index - firstContentPage + 1} de ${contentPages}`, 72, height - 38, {
          width: width - 144,
          height: 10,
          align: "center",
        });
      document.page.margins.bottom = bottomMargin;
    }
  }

  private drawMark(document: PDFKit.PDFDocument, left: number, top: number) {
    const nodes = [[0, 0], [18, -7], [35, 2], [8, 18], [26, 22], [42, 17], [17, 38]];
    const links = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5], [4, 6]];
    document.lineWidth(1.5).strokeColor("#00a0bc");
    links.forEach(([start, end]) => {
      const source = nodes[start];
      const target = nodes[end];
      document.moveTo(left + source[0] + 4, top + source[1] + 4).lineTo(left + target[0] + 4, top + target[1] + 4).stroke();
    });
    nodes.forEach(([x, y]) => document.roundedRect(left + x, top + y, 8, 8, 1.5).fill("#00a0bc"));
  }

  private drawRule(document: PDFKit.PDFDocument) {
    const y = document.y + 15;
    document.moveTo(document.page.margins.left, y).lineTo(document.page.width - document.page.margins.right, y).lineWidth(0.5).strokeColor("#222222").stroke();
    document.y = y + 5;
  }

  private renderLabelValue(document: PDFKit.PDFDocument, label: string, value: string) {
    document.font("Helvetica-Bold").text(`${label}: `, { continued: true }).font("Helvetica").text(value);
  }

  private renderSignature(
    document: PDFKit.PDFDocument,
    professional: {
      name: string;
      professionalRegistration: string | null;
      signatureText: string | null;
    },
    date: Date | null,
  ) {
    if (document.y > document.page.height - document.page.margins.bottom - 125) document.addPage();
    document
      .moveDown(2)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#222222")
      .text("______________________________", { align: "center" })
      .font("Helvetica-Bold")
      .text(professional.signatureText || professional.name, { align: "center" });
    if (professional.professionalRegistration)
      document.font("Helvetica").text(professional.professionalRegistration, { align: "center" });
    document.moveDown(0.35).font("Helvetica").fontSize(9).text(this.formattedPlaceAndDate(date), { align: "center" });
  }

  private technicalNotice() {
    return "Documento estruturado com base nas diretrizes da Resolução CFP nº 6/2019. A adequação ética, técnica e normativa do conteúdo final depende da revisão, complementação e assinatura da(o) psicóloga(o) responsável.";
  }

  private reportUsageNotices() {
    return [
      "• Este laudo deve ser utilizado exclusivamente para a finalidade indicada em sua identificação.",
      "• O documento possui caráter sigiloso; após a entrega, cabe ao destinatário preservar e utilizar adequadamente as informações nele contidas.",
      "• Os resultados devem ser analisados de forma integrada aos dados clínicos, históricos e contextuais, não constituindo diagnóstico automático ou isolado.",
    ].join("\n");
  }

  private deliveryTermText(professionalName?: string | null) {
    return [
      "Eu, ________________________________________, portador(a) do documento de identidade nº __________________, declaro que recebi em ____/____/________ este laudo psicológico e as orientações pertinentes à sua finalidade, uso e sigilo.",
      "",
      "Cidade: ______________________________    Data: ____/____/________",
      "",
      "______________________________________________",
      "Assinatura da pessoa avaliada ou responsável",
      "",
      "______________________________________________",
      professionalName || "Profissional responsável",
    ].join("\n");
  }

  private formattedPlaceAndDate(date: Date | null) {
    const dateText = (date || new Date()).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `Cidade, ${dateText}`;
  }

  private googleConfig() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri)
      throw new ServiceUnavailableException("A integração com o Google Docs ainda não foi configurada.");
    return { clientId, clientSecret, redirectUri };
  }

  private signGoogleState(payload: { reportId: string; userId: string; organizationId: string; expiresAt: number }) {
    const value = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", process.env.JWT_SECRET || "development-only-secret").update(value).digest("base64url");
    return `${value}.${signature}`;
  }

  private verifyGoogleState(state: string) {
    const [value, signature] = state.split(".");
    if (!value || !signature) throw new BadRequestException("Estado de autorização inválido.");
    const expected = createHmac("sha256", process.env.JWT_SECRET || "development-only-secret").update(value).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new BadRequestException("Estado de autorização inválido.");
    const payload = JSON.parse(Buffer.from(value, "base64url").toString()) as { reportId: string; userId: string; organizationId: string; expiresAt: number };
    if (!payload.reportId || !payload.userId || !payload.organizationId || payload.expiresAt < Date.now())
      throw new BadRequestException("A autorização expirou. Gere o laudo novamente.");
    return payload;
  }

  private googleDocumentText(snapshot: {
    evaluation: { title: string; applicationDate: Date | string | null; requester: string | null; purpose: string | null; demandDescription: string | null; anamnesis: unknown; conclusion: string | null; referral: string | null };
    patient: { name: string; birthDate: Date | string | null };
    applications: Array<{ id: string; instrumentVersion: { version: string; instrument: { name: string; code?: string }; presentationSchema: unknown }; result: unknown; professionalSummary: string | null; reportContent?: InstrumentReportContent; reportPresentation?: PresentationSchema; reportTables?: InstrumentReportTable[] }>;
    professional: {
      name: string;
      email?: string | null;
      phone?: string | null;
      professionalRegistration: string | null;
      signatureText?: string | null;
      organization?: { email?: string | null; phone?: string | null } | null;
    } | null;
    exportOptions: { chapters: Record<string, boolean>; tests: Record<string, { table: boolean; chart: boolean }> };
  }) {
    const anamnesis = this.asRecord(snapshot.evaluation.anamnesis);
    const lines = [snapshot.evaluation.title || "Laudo psicológico de avaliação", "", this.technicalNotice(), ""];
    const section = (enabled: boolean, title: string, values: Array<string | null | undefined>) => {
      if (!enabled) return;
      const content = values.filter((value): value is string => Boolean(value && value !== "—"));
      if (content.length === 0) return;
      lines.push(title, ...content, "");
    };
    if (snapshot.exportOptions.chapters.identification) lines.push("1. Identificação", "");
    section(snapshot.exportOptions.chapters.identification, "1.1. Identificação do laudo", [
      `Autoria: ${snapshot.professional?.name || "Não informado"}${snapshot.professional?.professionalRegistration ? ` (${snapshot.professional.professionalRegistration})` : ""}`,
      `Solicitante: ${snapshot.evaluation.requester || "Não informado"}`,
      `Finalidade: ${snapshot.evaluation.purpose || "Não informada"}`,
    ]);
    section(snapshot.exportOptions.chapters.identification, "1.2. Identificação da pessoa avaliada", [
      `Nome: ${snapshot.patient.name}`,
      snapshot.patient.birthDate ? `Data de nascimento: ${this.formatSnapshotDate(snapshot.patient.birthDate)}` : null,
      snapshot.patient.birthDate && this.age(snapshot.patient.birthDate, snapshot.evaluation.applicationDate) !== null
        ? `Idade: ${this.age(snapshot.patient.birthDate, snapshot.evaluation.applicationDate)} anos`
        : null,
      snapshot.evaluation.applicationDate ? `Data da aplicação: ${this.formatSnapshotDate(snapshot.evaluation.applicationDate)}` : null,
    ]);
    section(snapshot.exportOptions.chapters.demand, "2. Descrição da demanda", [snapshot.evaluation.demandDescription || "Não informada."]);
    section(snapshot.exportOptions.chapters.procedures, "3. Procedimentos", snapshot.applications.map((application) => `• ${application.instrumentVersion.instrument.name} — ${this.reportContentFor(application).purpose}`));
    if (snapshot.exportOptions.chapters.anamnesis) {
      lines.push("4. Análise dos resultados", "");
      lines.push("4.1. Anamnese", "");
      section(true, "4.1.1. História pessoal e desenvolvimento", [this.displayValue(anamnesis.personalHistory)]);
      section(true, "4.1.2. Contexto familiar e relacional", [this.displayValue(anamnesis.familyContext)]);
      section(true, "4.1.3. Histórico médico e psiquiátrico", [this.displayValue(anamnesis.medicalHistory)]);
      section(true, "4.1.4. Fatores psicossociais e ambientais", [this.displayValue(anamnesis.psychosocialFactors)]);
    }
    return lines.filter(Boolean).join("\n").trimEnd();
  }

  private googleCoverText(snapshot: Parameters<ReportsService["googleDocumentText"]>[0]) {
    return [
      snapshot.professional?.name || "Profissional responsável",
      snapshot.professional?.professionalRegistration || "",
      snapshot.evaluation.title || "Laudo psicológico de avaliação",
      snapshot.patient.name,
      this.formattedPlaceAndDate(snapshot.evaluation.applicationDate ? new Date(snapshot.evaluation.applicationDate) : null),
    ].join("\n");
  }

  private async addGooglePageFurniture(documentId: string, accessToken: string, snapshot: Parameters<ReportsService["googleDocumentText"]>[0]) {
    const endpoint = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`;
    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
    const created = await fetch(endpoint, {
      method: "POST", headers,
      body: JSON.stringify({ requests: [
        { updateDocumentStyle: { documentStyle: { useFirstPageHeaderFooter: Boolean(snapshot.exportOptions.chapters.coverPage), marginHeader: { magnitude: 46, unit: "PT" }, marginFooter: { magnitude: 54, unit: "PT" } }, fields: "useFirstPageHeaderFooter,marginHeader,marginFooter" } },
        { createHeader: { type: "DEFAULT" } },
        { createFooter: { type: "DEFAULT" } },
      ] }),
    });
    const result = await created.json() as { replies?: Array<{ createHeader?: { headerId: string }; createFooter?: { footerId: string } }> };
    const headerId = result.replies?.find((reply) => reply.createHeader)?.createHeader?.headerId;
    const footerId = result.replies?.find((reply) => reply.createFooter)?.createFooter?.footerId;
    if (!created.ok || !headerId || !footerId) throw new BadRequestException("Não foi possível criar o cabeçalho e o rodapé do laudo.");
    const professional = snapshot.professional;
    const phone = professional?.phone || professional?.organization?.phone;
    const email = professional?.email || professional?.organization?.email;
    const blocks = [
      { segmentId: headerId, text: [professional?.name || "Profissional responsável", professional?.professionalRegistration].filter(Boolean).join("\n"), size: 9 },
      { segmentId: footerId, text: [phone ? `Telefone: ${phone}` : null, email ? `E-mail: ${email}` : null].filter(Boolean).join("\n"), size: 8.5 },
    ];
    const requests: object[] = blocks.filter((block) => block.text).flatMap(({ segmentId, text, size }) => [
      { insertText: { endOfSegmentLocation: { segmentId }, text } },
      { updateTextStyle: { range: { segmentId, startIndex: 0, endIndex: text.length }, textStyle: { weightedFontFamily: { fontFamily: "Arial" }, fontSize: { magnitude: size, unit: "PT" }, bold: true, foregroundColor: { color: { rgbColor: { red: 0.067, green: 0.067, blue: 0.067 } } } }, fields: "weightedFontFamily,fontSize,bold,foregroundColor" } },
      { updateParagraphStyle: { range: { segmentId, startIndex: 0, endIndex: text.length }, paragraphStyle: { alignment: "CENTER", lineSpacing: 100, spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 2, unit: "PT" } }, fields: "alignment,lineSpacing,spaceAbove,spaceBelow" } },
    ]);
    const headerText = blocks[0].text;
    const lastLineStart = headerText.lastIndexOf("\n") + 1;
    requests.push({ updateParagraphStyle: { range: { segmentId: headerId, startIndex: lastLineStart, endIndex: headerText.length }, paragraphStyle: { borderBottom: { color: { color: { rgbColor: { red: 0.133, green: 0.133, blue: 0.133 } } }, width: { magnitude: 0.5, unit: "PT" }, padding: { magnitude: professional?.professionalRegistration ? 36 : 50, unit: "PT" }, dashStyle: "SOLID" } }, fields: "borderBottom" } });
    if (professional?.professionalRegistration)
      requests.push({ updateTextStyle: { range: { segmentId: headerId, startIndex: lastLineStart, endIndex: headerText.length }, textStyle: { bold: false, fontSize: { magnitude: 8.5, unit: "PT" } }, fields: "bold,fontSize" } });
    const styled = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ requests }) });
    if (!styled.ok) throw new BadRequestException("Não foi possível formatar o cabeçalho e o rodapé do laudo.");
  }

  private googleDocumentStyleRequest() {
    return {
      updateDocumentStyle: {
        documentStyle: {
          pageSize: {
            width: { magnitude: 595.28, unit: "PT" },
            height: { magnitude: 841.89, unit: "PT" },
          },
          marginTop: { magnitude: 136, unit: "PT" },
          marginBottom: { magnitude: 94, unit: "PT" },
          marginLeft: { magnitude: 72, unit: "PT" },
          marginRight: { magnitude: 72, unit: "PT" },
        },
        fields: "pageSize,marginTop,marginBottom,marginLeft,marginRight",
      },
    };
  }

  private googleCoverFormattingRequests(content: string) {
    const requests: object[] = [{
      updateTextStyle: {
        range: { startIndex: 1, endIndex: content.length + 1 },
        textStyle: { weightedFontFamily: { fontFamily: "Arial" }, bold: false, fontSize: { magnitude: 10, unit: "PT" }, foregroundColor: { color: { rgbColor: { red: 0.067, green: 0.067, blue: 0.067 } } } },
        fields: "weightedFontFamily,foregroundColor,bold,fontSize",
      },
    }, {
      updateParagraphStyle: {
        range: { startIndex: 1, endIndex: content.length + 1 },
        paragraphStyle: { alignment: "CENTER", lineSpacing: 100, spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 0, unit: "PT" }, keepWithNext: false },
        fields: "alignment,lineSpacing,spaceAbove,spaceBelow,keepWithNext",
      },
    }];
    let startIndex = 1;
    content.split("\n").forEach((line, lineIndex) => {
      const endIndex = startIndex + line.length;
      if (!line) {
        startIndex = endIndex + 1;
        return;
      }
      const style = lineIndex === 0
        ? { bold: true, fontSize: { magnitude: 13, unit: "PT" } }
        : lineIndex === 1
          ? { fontSize: { magnitude: 10, unit: "PT" } }
          : lineIndex === 2
            ? { bold: true, fontSize: { magnitude: 22, unit: "PT" } }
            : lineIndex === 3
              ? { fontSize: { magnitude: 12, unit: "PT" } }
              : { fontSize: { magnitude: 10, unit: "PT" } };
      const paragraphStyle = lineIndex === 2
        ? { alignment: "CENTER", spaceAbove: { magnitude: 214, unit: "PT" }, spaceBelow: { magnitude: 16.5, unit: "PT" } }
        : lineIndex === 4
          ? { alignment: "CENTER", spaceAbove: { magnitude: 358, unit: "PT" }, spaceBelow: { magnitude: 0, unit: "PT" } }
          : { alignment: "CENTER", spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: lineIndex === 0 ? 5 : 0, unit: "PT" } };
      requests.push(
        { updateTextStyle: { range: { startIndex, endIndex }, textStyle: style, fields: "bold,fontSize" } },
        { updateParagraphStyle: { range: { startIndex, endIndex: endIndex + 1 }, paragraphStyle, fields: "alignment,spaceAbove,spaceBelow" } },
      );
      startIndex = endIndex + 1;
    });
    return requests;
  }

  private googleDocumentClosingText(snapshot: Parameters<ReportsService["googleDocumentText"]>[0]) {
    const lines: string[] = [];
    const section = (enabled: boolean, title: string, content?: string | null) => {
      if (enabled && content) lines.push(title, content, "");
    };
    section(snapshot.exportOptions.chapters.conclusion, "5. Conclusão", snapshot.evaluation.conclusion || "A conclusão deve ser integrada à entrevista, à observação, ao histórico e às demais fontes técnicas pertinentes.");
    section(snapshot.exportOptions.chapters.referral, "6. Sugestões de encaminhamento", snapshot.evaluation.referral);
    section(true, "Observações sobre o uso do documento", this.reportUsageNotices());
    if (snapshot.professional) {
      lines.push(
        "______________________________",
        snapshot.professional.signatureText || snapshot.professional.name,
        snapshot.professional.professionalRegistration || "",
        this.formattedPlaceAndDate(snapshot.evaluation.applicationDate ? new Date(snapshot.evaluation.applicationDate) : null),
        "",
      );
    }
    section(snapshot.exportOptions.chapters.references, "7. Referências bibliográficas", instrumentReportReferences(snapshot.applications.map((application) => this.reportContentFor(application))));
    section(snapshot.exportOptions.chapters.deliveryTerm, "8. Termo de entrega", this.deliveryTermText(snapshot.professional?.name));
    return lines.filter(Boolean).join("\n").trimEnd();
  }

  private googleDocumentFormattingRequests(content: string, firstIndex = 1, formatFirstLineAsTitle = true) {
    const requests: object[] = [{
      updateTextStyle: {
        range: { startIndex: firstIndex, endIndex: firstIndex + content.length },
        textStyle: { weightedFontFamily: { fontFamily: "Arial" }, bold: false, italic: false, fontSize: { magnitude: 10, unit: "PT" }, foregroundColor: { color: { rgbColor: { red: 0.133, green: 0.133, blue: 0.133 } } } },
        fields: "weightedFontFamily,fontSize,foregroundColor,bold,italic",
      },
    }, {
      updateParagraphStyle: {
        range: { startIndex: firstIndex, endIndex: firstIndex + content.length },
        paragraphStyle: { namedStyleType: "NORMAL_TEXT", alignment: "JUSTIFIED", spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 0, unit: "PT" }, lineSpacing: 117.3, keepWithNext: false, avoidWidowAndOrphan: true, indentStart: { magnitude: 0, unit: "PT" }, indentEnd: { magnitude: 0, unit: "PT" }, indentFirstLine: { magnitude: 0, unit: "PT" } },
        fields: "namedStyleType,alignment,spaceAbove,spaceBelow,lineSpacing,keepWithNext,avoidWidowAndOrphan,indentStart,indentEnd,indentFirstLine,borderBottom,borderTop",
      },
    }];
    let startIndex = firstIndex;
    let signature = false;
    let conceptual = false;
    content.split("\n").forEach((line, lineIndex) => {
      const endIndex = startIndex + line.length;
      if (!line) {
        requests.push({ updateParagraphStyle: { range: { startIndex, endIndex: endIndex + 1 }, paragraphStyle: { spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 0, unit: "PT" }, lineSpacing: 100 }, fields: "spaceAbove,spaceBelow,lineSpacing" } });
        startIndex = endIndex + 1;
        return;
      }
      if (lineIndex === 0 && formatFirstLineAsTitle) {
        requests.push(
          { updateTextStyle: { range: { startIndex, endIndex }, textStyle: { bold: true, fontSize: { magnitude: 17, unit: "PT" } }, fields: "bold,fontSize" } },
          { updateParagraphStyle: { range: { startIndex, endIndex: endIndex + 1 }, paragraphStyle: { alignment: "CENTER", spaceBelow: { magnitude: 8.8, unit: "PT" }, lineSpacing: 100, keepWithNext: true }, fields: "alignment,spaceBelow,lineSpacing,keepWithNext" } },
        );
      } else if (/^\d+(?:\.\d+)*\./.test(line) || line === "Observações sobre o uso do documento" || line === "Interpretação dos resultados") {
        signature = false;
        conceptual = false;
        const majorSection = /^(1\.|4\. Análise)/.test(line) && !/^\d+\.\d+/.test(line);
        requests.push(
          { updateTextStyle: { range: { startIndex, endIndex }, textStyle: { bold: true, fontSize: { magnitude: majorSection ? 13 : line === "Interpretação dos resultados" ? 10 : 12, unit: "PT" }, foregroundColor: { color: { rgbColor: { red: 0.067, green: 0.067, blue: 0.067 } } } }, fields: "bold,fontSize,foregroundColor" } },
          { updateParagraphStyle: { range: { startIndex, endIndex: endIndex + 1 }, paragraphStyle: { alignment: "START", spaceAbove: { magnitude: 9.25, unit: "PT" }, spaceBelow: { magnitude: 4.85, unit: "PT" }, lineSpacing: 100, keepWithNext: true }, fields: "alignment,spaceAbove,spaceBelow,lineSpacing,keepWithNext" } },
        );
      } else if (/^(Autoria|Solicitante|Finalidade|Nome|Data de nascimento|Idade|Data da aplicação):/.test(line)) {
        requests.push(
          { updateTextStyle: { range: { startIndex, endIndex: startIndex + line.indexOf(":") + 1 }, textStyle: { bold: true }, fields: "bold" } },
          { updateParagraphStyle: { range: { startIndex, endIndex }, paragraphStyle: { alignment: "START", lineSpacing: 100 }, fields: "alignment,lineSpacing" } },
        );
      } else if (line === "______________________________" || signature) {
        const firstSignatureLine = !signature;
        signature = true;
        requests.push(
          { updateParagraphStyle: { range: { startIndex, endIndex }, paragraphStyle: { alignment: "CENTER", lineSpacing: 100, spaceAbove: { magnitude: firstSignatureLine ? 23.12 : line.startsWith("Cidade,") ? 4.05 : 0, unit: "PT" }, keepWithNext: !line.startsWith("Cidade,") }, fields: "alignment,lineSpacing,spaceAbove,keepWithNext" } },
          { updateTextStyle: { range: { startIndex, endIndex }, textStyle: { bold: content.split("\n")[lineIndex - 1] === "______________________________", fontSize: { magnitude: line.startsWith("Cidade,") ? 9 : 10, unit: "PT" } }, fields: "bold,fontSize" } },
        );
      } else if (line.startsWith("Base conceitual:") || conceptual) {
        conceptual = true;
        requests.push({ updateTextStyle: { range: { startIndex, endIndex }, textStyle: { fontSize: { magnitude: 9.5, unit: "PT" }, foregroundColor: { color: { rgbColor: { red: 0.204, green: 0.251, blue: 0.329 } } } }, fields: "fontSize,foregroundColor" } });
      }
      if (line === this.technicalNotice()) {
        requests.push({ updateParagraphStyle: { range: { startIndex, endIndex }, paragraphStyle: { spaceBelow: { magnitude: 20, unit: "PT" }, borderBottom: { color: { color: { rgbColor: { red: 0.133, green: 0.133, blue: 0.133 } } }, width: { magnitude: 0.5, unit: "PT" }, padding: { magnitude: 15, unit: "PT" }, dashStyle: "SOLID" } }, fields: "spaceBelow,borderBottom" } });
      }
      startIndex = endIndex + 1;
    });
    return requests;
  }

  private googleInsertionParagraphRequests(index: number, beforeTable = false) {
    const range = { startIndex: index, endIndex: index + 1 };
    return [
      {
        updateParagraphStyle: {
          range,
          paragraphStyle: {
            namedStyleType: "NORMAL_TEXT",
            alignment: "START",
            spaceAbove: { magnitude: 0, unit: "PT" },
            spaceBelow: { magnitude: 0, unit: "PT" },
            lineSpacing: 100,
            keepWithNext: beforeTable,
            pageBreakBefore: false,
            indentStart: { magnitude: 0, unit: "PT" },
            indentEnd: { magnitude: 0, unit: "PT" },
            indentFirstLine: { magnitude: 0, unit: "PT" },
          },
          fields: "namedStyleType,alignment,spaceAbove,spaceBelow,lineSpacing,keepWithNext,pageBreakBefore,indentStart,indentEnd,indentFirstLine,borderTop,borderBottom,borderLeft,borderRight,shading",
        },
      },
      {
        updateTextStyle: {
          range,
          textStyle: {
            weightedFontFamily: { fontFamily: "Arial" },
            fontSize: { magnitude: beforeTable ? 1 : 10, unit: "PT" },
            bold: false,
            italic: false,
          },
          fields: "weightedFontFamily,fontSize,bold,italic",
        },
      },
    ];
  }

  private async appendGoogleTextBlock(
    documentId: string,
    accessToken: string,
    content: string,
    formatFirstLineAsTitle = false,
  ) {
    if (!content) return;
    const read = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const document = await read.json() as { body?: { content?: Array<{ endIndex?: number }> } };
    const endIndex = document.body?.content?.at(-1)?.endIndex;
    if (!read.ok || !endIndex) throw new BadRequestException("Não foi possível preparar uma seção do documento.");
    const text = `${content}\n`;
    const insertionIndex = endIndex - 1;
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [
        ...this.googleInsertionParagraphRequests(insertionIndex),
        { insertText: { location: { index: insertionIndex }, text } },
        ...this.googleDocumentFormattingRequests(content, insertionIndex, formatFirstLineAsTitle),
      ] }),
    });
    if (!response.ok) throw new BadRequestException("Não foi possível inserir uma seção no Google Docs.");
  }

  private async appendGooglePageBreak(documentId: string, accessToken: string) {
    const read = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const document = await read.json() as { body?: { content?: Array<{ endIndex?: number }> } };
    const endIndex = document.body?.content?.at(-1)?.endIndex;
    if (!read.ok || !endIndex) throw new BadRequestException("Não foi possível finalizar a capa do documento.");
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [
        { insertSectionBreak: { location: { index: endIndex - 1 }, sectionType: "NEXT_PAGE" } },
        { updateSectionStyle: { range: { startIndex: 1, endIndex: endIndex - 1 }, sectionStyle: { marginTop: { magnitude: 74, unit: "PT" }, marginBottom: { magnitude: 72, unit: "PT" }, useFirstPageHeaderFooter: true }, fields: "marginTop,marginBottom,useFirstPageHeaderFooter" } },
        { updateSectionStyle: { range: { startIndex: endIndex + 1, endIndex: endIndex + 2 }, sectionStyle: { marginTop: { magnitude: 136, unit: "PT" }, marginBottom: { magnitude: 94, unit: "PT" }, useFirstPageHeaderFooter: false }, fields: "marginTop,marginBottom,useFirstPageHeaderFooter" } },
      ] }),
    });
    if (!response.ok) throw new BadRequestException("Não foi possível inserir a quebra de página após a capa.");
  }

  private formatSnapshotDate(value: Date | string) {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("pt-BR");
  }

  private async appendGoogleResultsTable(
    documentId: string,
    accessToken: string,
    instrument: string,
    fields: Array<[string, unknown]>,
  ) {
    await this.appendGoogleTable(documentId, accessToken, instrument, [
      fields.map(([label]) => label),
      fields.map(([, value]) => this.displayValue(value)),
    ]);
  }

  private async appendGoogleChart(
    documentId: string,
    accessToken: string,
    title: string,
    values: Array<{ label: string; value: number }>,
    maximum: number,
    expectedRange?: string,
  ) {
    const barColumns = Math.min(16, Math.max(10, Math.ceil(maximum) * 2));
    const rows = values.map((field) => [
      field.label,
      ...Array.from({ length: barColumns }, () => ""),
      String(field.value),
    ]);
    await this.appendGoogleTable(
      documentId,
      accessToken,
      expectedRange ? `${title} · Faixa esperada: ${expectedRange}` : title,
      rows,
      { values: values.map((field) => field.value), maximum, barColumns },
    );
  }

  private async appendGoogleChartImage(
    documentId: string,
    accessToken: string,
    title: string,
    values: Array<{ label: string; value: number }>,
    maximum: number,
    expectedRange?: string,
  ) {
    let imageFileId: string | null = null;
    try {
      const image = await this.renderGoogleChartImage(title, values, maximum, expectedRange);
      const uploaded = await this.uploadGoogleChartImage(accessToken, image.buffer);
      if (!uploaded) return false;
      imageFileId = uploaded.fileId;
      const permissionResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${uploaded.fileId}/permissions?sendNotificationEmail=false`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ type: "anyone", role: "reader" }),
        },
      );
      if (!permissionResponse.ok) {
        const error = await permissionResponse.json().catch(() => ({})) as { error?: { message?: string } };
        this.logger.warn(`Google Drive não liberou a imagem temporária (${permissionResponse.status}): ${error.error?.message ?? "erro sem detalhes"}`);
        return false;
      }
      const documentResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const document = await documentResponse.json() as { body?: { content?: Array<{ endIndex?: number }> } };
      const endIndex = document.body?.content?.at(-1)?.endIndex;
      if (!documentResponse.ok || !endIndex) return false;
      const imageUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(uploaded.fileId)}`;
      for (const delay of [0, 500, 1200]) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        const inserted = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ requests: [{ insertInlineImage: {
            uri: imageUrl,
            location: { index: endIndex - 1 },
            objectSize: {
              width: { magnitude: 451.28, unit: "PT" },
              height: { magnitude: image.height * (451.28 / image.width), unit: "PT" },
            },
          } }, { insertText: { location: { index: endIndex }, text: "\n" } }] }),
        });
        if (inserted.ok) return true;
        if (delay === 1200) {
          const error = await inserted.json().catch(() => ({})) as { error?: { message?: string } };
          this.logger.warn(`Google Docs não inseriu a imagem do gráfico (${inserted.status}): ${error.error?.message ?? "erro sem detalhes"}`);
        }
      }
      return false;
    } catch (error) {
      this.logger.warn(`Não foi possível gerar a imagem do gráfico: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      if (imageFileId) await this.deleteGoogleDriveFile(accessToken, imageFileId);
    }
  }

  private async renderGoogleChartImage(
    title: string,
    values: Array<{ label: string; value: number }>,
    maximum: number,
    expectedRange?: string,
  ) {
    const width = 451.28;
    const plotX = 150;
    const plotWidth = width - plotX - 28;
    const rowHeight = 44;
    const measure = new PDFDocument({ autoFirstPage: false });
    const wrap = (text: string, fontSize: number, availableWidth: number, bold = false) => {
      measure.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize);
      return text.split(/\s+/).reduce<string[]>((lines, word) => {
        const current = lines.at(-1);
        if (current && measure.widthOfString(`${current} ${word}`) <= availableWidth)
          lines[lines.length - 1] = `${current} ${word}`;
        else lines.push(word);
        return lines;
      }, []);
    };
    const titleLines = wrap(title, 10, width, true);
    const plotTop = titleLines.length * 11.56 + 18;
    const legendY = plotTop + values.length * rowHeight + 3;
    const height = legendY + 37;
    const rangeNumbers = expectedRange?.match(/\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(",", "."))) ?? [];
    const rangeMinimum = rangeNumbers.length > 1 ? rangeNumbers[0] : 0;
    const rangeMaximum = rangeNumbers.at(-1);
    const hasExpectedRange = Number.isFinite(rangeMaximum);
    const rangeStart = hasExpectedRange ? Math.max(0, Math.min(rangeMinimum, maximum)) : 0;
    const rangeEnd = hasExpectedRange ? Math.max(rangeStart, Math.min(rangeMaximum as number, maximum)) : 0;
    const grid = Array.from({ length: Math.floor(maximum) + 1 }, (_, tick) => {
      const position = plotX + plotWidth * tick / maximum;
      return `<line x1="${position}" y1="${plotTop}" x2="${position}" y2="${plotTop + values.length * rowHeight - 8}" stroke="#dce5e8" stroke-width="0.35"/><text x="${position}" y="${plotTop - 5}" text-anchor="middle" font-size="7.5" fill="#667085">${tick}</text>`;
    }).join("");
    const bars = values.map((field, index) => {
      const position = plotTop + index * rowHeight + 4;
      const label = wrap(field.label, 8.5, plotX - 10).slice(0, 3)
        .map((line, lineIndex) => `<tspan x="0" y="${position + 9 + lineIndex * 9.826}">${this.escapeSvg(line)}</tspan>`).join("");
      const marker = plotX + plotWidth * rangeEnd / maximum;
      return `<text font-size="8.5" fill="#344054">${label}</text>
        <rect x="${plotX}" y="${position}" width="${plotWidth}" height="18" rx="3" fill="#edf1f1"/>
        ${hasExpectedRange ? `<rect x="${plotX + plotWidth * rangeStart / maximum}" y="${position}" width="${plotWidth * (rangeEnd - rangeStart) / maximum}" height="18" rx="3" fill="#fde8bd"/>` : ""}
        <rect x="${plotX}" y="${position}" width="${plotWidth * Math.max(0, Math.min(field.value, maximum)) / maximum}" height="18" rx="3" fill="#078ca8"/>
        ${hasExpectedRange ? `<line x1="${marker}" y1="${position - 3}" x2="${marker}" y2="${position + 21}" stroke="#d98e04" stroke-width="1.2" stroke-dasharray="3 2"/>` : ""}
        <text x="${plotX + plotWidth + 7}" y="${position + 12}" font-size="9" font-weight="700" fill="#111111">${this.escapeSvg(String(field.value))}</text>`;
    }).join("");
    const titles = titleLines.map((line, index) => `<text x="0" y="${9 + index * 11.56}" font-size="10" font-weight="700" fill="#111111">${this.escapeSvg(line)}</text>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <g font-family="Arial, Helvetica, sans-serif">${titles}${grid}${bars}
        <rect x="0" y="${legendY}" width="14" height="9" rx="2" fill="#078ca8"/>
        <text x="20" y="${legendY + 7}" font-size="7.5" fill="#475467">Resultado observado</text>
        ${hasExpectedRange ? `<rect x="125" y="${legendY}" width="14" height="9" rx="2" fill="#fde8bd"/>
        <text x="145" y="${legendY + 7}" font-size="7.5" fill="#475467">Faixa esperada (${this.escapeSvg(expectedRange ?? "")})</text>
        <line x1="278" y1="${legendY + 5}" x2="294" y2="${legendY + 5}" stroke="#d98e04" stroke-width="1.2" stroke-dasharray="3 2"/>
        <text x="301" y="${legendY + 7}" font-size="7.5" fill="#475467">Limite superior (${rangeEnd})</text>` : ""}
        <text x="0" y="${legendY + 27}" font-size="7.5" font-style="italic" fill="#667085">Referência visual; interpretar o resultado conforme o manual técnico do instrumento.</text>
      </g>
    </svg>`;
    return { buffer: await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer(), width, height };
  }

  private async uploadGoogleChartImage(accessToken: string, image: Buffer): Promise<{ fileId: string } | null> {
    const boundary = `laudo_${randomUUID()}`;
    const metadata = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: `grafico-laudo-${randomUUID()}.png`, mimeType: "image/png" })}\r\n--${boundary}\r\nContent-Type: image/png\r\n\r\n`,
    );
    const ending = Buffer.from(`\r\n--${boundary}--`);
    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body: new Uint8Array(Buffer.concat([metadata, image, ending])),
    });
    const file = await response.json() as { id?: string; error?: { message?: string } };
    if (!response.ok || !file.id) {
      this.logger.warn(`Google Drive não recebeu a imagem do gráfico (${response.status}): ${file.error?.message ?? "resposta sem identificador do arquivo"}`);
      return null;
    }
    return { fileId: file.id };
  }

  private escapeSvg(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }

  private async deleteGoogleDriveFile(accessToken: string, fileId: string) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  private async appendGoogleTable(
    documentId: string,
    accessToken: string,
    title: string,
    rows: string[][],
    chart?: { values: number[]; maximum: number; barColumns: number },
  ) {
    const read = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const source = (await read.json()) as { body?: { content?: Array<{ endIndex?: number }> } };
    const endIndex = source.body?.content?.at(-1)?.endIndex;
    if (!read.ok || !endIndex) throw new BadRequestException("Não foi possível preparar a tabela de resultados.");
    const heading = `${title}\n`;
    const headingStart = endIndex - 1;
    const headingEnd = headingStart + title.length;
    const tableInsertionIndex = headingStart + heading.length;
    const columns = Math.max(...rows.map((row) => row.length));
    const created = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [
        { insertText: { location: { index: endIndex - 1 }, text: heading } },
        { updateTextStyle: { range: { startIndex: headingStart, endIndex: headingEnd }, textStyle: { bold: true, weightedFontFamily: { fontFamily: "Arial" }, fontSize: { magnitude: 10, unit: "PT" }, foregroundColor: { color: { rgbColor: { red: 0.067, green: 0.067, blue: 0.067 } } } }, fields: "weightedFontFamily,bold,fontSize,foregroundColor" } },
        { updateParagraphStyle: { range: { startIndex: headingStart, endIndex: headingEnd + 1 }, paragraphStyle: { alignment: "START", lineSpacing: 100, keepWithNext: true, spaceAbove: { magnitude: 7.5, unit: "PT" }, spaceBelow: { magnitude: 5, unit: "PT" } }, fields: "alignment,lineSpacing,keepWithNext,spaceAbove,spaceBelow,borderBottom,borderTop" } },
        ...this.googleInsertionParagraphRequests(tableInsertionIndex, true),
        { insertTable: { rows: rows.length, columns, location: { index: tableInsertionIndex } } },
      ] }),
    });
    if (!created.ok) throw new BadRequestException("Não foi possível criar a tabela de resultados.");
    const updated = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const document = (await updated.json()) as { body?: { content?: Array<{ table?: GoogleTable }> } };
    const table = [...(document.body?.content ?? [])].reverse().find((item) => item.table)?.table;
    const requests = table?.tableRows?.flatMap((row, rowIndex) =>
      (row.tableCells ?? []).map((cell, columnIndex) => {
        const index = cell.content?.[0]?.paragraph?.elements?.[0]?.startIndex;
        const value = rows[rowIndex]?.[columnIndex];
        return index && value ? { insertText: { location: { index }, text: value } } : null;
      }),
    ).filter(Boolean).reverse();
    if (!updated.ok || !requests?.length) throw new BadRequestException("Não foi possível preencher a tabela de resultados.");
    const populated = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
    if (!populated.ok) throw new BadRequestException("Não foi possível preencher a tabela de resultados.");
    await this.styleGoogleTable(documentId, accessToken, rows.length, columns, chart);
  }

  private async styleGoogleTable(
    documentId: string,
    accessToken: string,
    rowCount: number,
    columnCount: number,
    chart?: { values: number[]; maximum: number; barColumns: number },
  ) {
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const document = (await response.json()) as { body?: { content?: Array<{ startIndex?: number; table?: GoogleTable }> } };
    const tableElement = [...(document.body?.content ?? [])].reverse().find((item) => item.table);
    if (!response.ok || !tableElement?.table || tableElement.startIndex === undefined) return;
    const tableStartLocation = { index: tableElement.startIndex };
    const border = { color: { color: { rgbColor: { red: 0.718, green: 0.847, blue: 0.831 } } }, width: { magnitude: 0.4, unit: "PT" }, dashStyle: "SOLID" };
    const requests: object[] = [];
    if (!chart) {
      requests.push(
        { updateTableRowStyle: { tableStartLocation, rowIndices: [0], tableRowStyle: { minRowHeight: { magnitude: columnCount <= 2 ? 19 : 28, unit: "PT" } }, fields: "minRowHeight" } },
        { updateTableRowStyle: { tableStartLocation, rowIndices: Array.from({ length: rowCount - 1 }, (_, index) => index + 1), tableRowStyle: { minRowHeight: { magnitude: columnCount <= 2 ? 20 : 22, unit: "PT" } }, fields: "minRowHeight" } },
      );
    }
    if (!chart) requests.push({
        updateTableCellStyle: {
          tableRange: { tableCellLocation: { tableStartLocation, rowIndex: 0, columnIndex: 0 }, rowSpan: 1, columnSpan: columnCount },
          tableCellStyle: { backgroundColor: { color: { rgbColor: { red: 0.918, green: 0.961, blue: 0.957 } } }, contentAlignment: "MIDDLE", paddingTop: { magnitude: 2, unit: "PT" }, paddingBottom: { magnitude: 2, unit: "PT" }, paddingLeft: { magnitude: 4, unit: "PT" }, paddingRight: { magnitude: 4, unit: "PT" }, borderTop: border, borderBottom: border, borderLeft: border, borderRight: border },
          fields: "backgroundColor,contentAlignment,paddingTop,paddingBottom,paddingLeft,paddingRight,borderTop,borderBottom,borderLeft,borderRight",
        },
      });
    requests.push({
        updateTableCellStyle: {
          tableRange: { tableCellLocation: { tableStartLocation, rowIndex: chart ? 0 : 1, columnIndex: 0 }, rowSpan: chart ? rowCount : Math.max(1, rowCount - 1), columnSpan: columnCount },
          tableCellStyle: { backgroundColor: { color: { rgbColor: chart ? { red: 1, green: 1, blue: 1 } : { red: 1, green: 1, blue: 1 } } }, contentAlignment: "MIDDLE", paddingTop: { magnitude: chart ? 5 : 2, unit: "PT" }, paddingBottom: { magnitude: chart ? 5 : 2, unit: "PT" }, paddingLeft: { magnitude: chart ? 2 : 4, unit: "PT" }, paddingRight: { magnitude: chart ? 2 : 4, unit: "PT" }, borderTop: chart ? { ...border, color: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } } } : border, borderBottom: chart ? { ...border, color: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } } } : border, borderLeft: chart ? { ...border, color: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } } } : border, borderRight: chart ? { ...border, color: { color: { rgbColor: { red: 1, green: 1, blue: 1 } } } } : border },
          fields: "backgroundColor,contentAlignment,paddingTop,paddingBottom,paddingLeft,paddingRight,borderTop,borderBottom,borderLeft,borderRight",
        },
      });
    const widths = chart
      ? [150, ...Array.from({ length: chart.barColumns }, () => 273.28 / chart.barColumns), 28]
      : Array.from({ length: columnCount }, () => 451.28 / columnCount);
    widths.slice(0, columnCount).forEach((width, columnIndex) => requests.push({
      updateTableColumnProperties: {
        tableStartLocation,
        columnIndices: [columnIndex],
        tableColumnProperties: { widthType: "FIXED_WIDTH", width: { magnitude: width, unit: "PT" } },
        fields: "widthType,width",
      },
    }));
    tableElement.table.tableRows?.forEach((row, rowIndex) =>
      row.tableCells?.forEach((cell, columnIndex) => {
        const elements = cell.content?.[0]?.paragraph?.elements ?? [];
        const startIndex = elements[0]?.startIndex;
        const endIndex = elements.at(-1)?.endIndex;
        if (!startIndex || !endIndex || endIndex <= startIndex) return;
        const header = !chart && rowIndex === 0;
        requests.push({
          updateTextStyle: {
            range: { startIndex, endIndex },
            textStyle: {
              bold: header,
              weightedFontFamily: { fontFamily: "Arial" },
              fontSize: { magnitude: chart ? 8.5 : header ? (columnCount <= 2 ? 8 : 7.2) : (columnCount <= 2 ? 9 : 7.5), unit: "PT" },
              foregroundColor: { color: { rgbColor: header ? { red: 0.09, green: 0.247, blue: 0.231 } : { red: 0.067, green: 0.067, blue: 0.067 } } },
            },
            fields: "weightedFontFamily,bold,fontSize,foregroundColor",
          },
        });
        requests.push({ updateParagraphStyle: { range: { startIndex, endIndex }, paragraphStyle: { alignment: chart ? "START" : "CENTER", lineSpacing: 100, spaceAbove: { magnitude: 0, unit: "PT" }, spaceBelow: { magnitude: 0, unit: "PT" }, keepWithNext: false }, fields: "alignment,lineSpacing,spaceAbove,spaceBelow,keepWithNext" } });
      }),
    );
    if (chart) {
      chart.values.forEach((value, valueIndex) => {
        const filled = Math.max(0, Math.min(chart.barColumns, Math.round((value / chart.maximum) * chart.barColumns)));
        for (let segment = 0; segment < chart.barColumns; segment += 1) {
          const segmentColor = segment < filled ? { red: 0.04, green: 0.52, blue: 0.64 } : { red: 0.91, green: 0.94, blue: 0.95 };
          const segmentBorder = { color: { color: { rgbColor: segmentColor } }, width: { magnitude: 0.1, unit: "PT" }, dashStyle: "SOLID" };
          requests.push({
            updateTableCellStyle: {
              tableRange: {
                tableCellLocation: { tableStartLocation, rowIndex: valueIndex, columnIndex: segment + 1 },
                rowSpan: 1,
                columnSpan: 1,
              },
              tableCellStyle: {
                backgroundColor: { color: { rgbColor: segmentColor } },
                borderTop: segmentBorder,
                borderBottom: segmentBorder,
                borderLeft: segmentBorder,
                borderRight: segmentBorder,
                paddingTop: { magnitude: 6, unit: "PT" },
                paddingBottom: { magnitude: 6, unit: "PT" },
                paddingLeft: { magnitude: 0, unit: "PT" },
                paddingRight: { magnitude: 0, unit: "PT" },
              },
              fields: "backgroundColor,borderTop,borderBottom,borderLeft,borderRight,paddingTop,paddingBottom,paddingLeft,paddingRight",
            },
          });
        }
      });
    }
    const styled = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
    if (!styled.ok) throw new BadRequestException("Não foi possível aplicar o estilo da tabela no Google Docs.");
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private reportContentFor(application: {
    reportContent?: InstrumentReportContent;
    instrumentVersion: { instrument: { code?: string; name: string } };
  }) {
    return application.reportContent ?? instrumentReportContent(application.instrumentVersion.instrument.code ?? application.instrumentVersion.instrument.name);
  }

  private renderResultTable(document: PDFKit.PDFDocument, title: string, headers: string[], rows: string[][]) {
    const availableWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    const columnWidths = headers.length === 4
      ? [availableWidth * 0.42, availableWidth * 0.16, availableWidth * 0.17, availableWidth * 0.25]
      : [availableWidth * 0.45, availableWidth * 0.17, availableWidth * 0.38];
    const headerHeight = 27;
    const rowHeight = headers.length === 4 ? 32 : 27;
    const tableHeight = headerHeight + rows.length * rowHeight;
    if (document.y > document.page.height - document.page.margins.bottom - tableHeight - 40) document.addPage();
    document.moveDown(0.6).font("Helvetica-Bold").fontSize(10).fillColor("#111111").text(title);
    const left = document.page.margins.left;
    const top = document.y + 6;
    const cells = [headers, ...rows];
    cells.forEach((cellsInRow, rowIndex) => {
      const rowTop = top + (rowIndex === 0 ? 0 : headerHeight + (rowIndex - 1) * rowHeight);
      const height = rowIndex === 0 ? headerHeight : rowHeight;
      let cellLeft = left;
      cellsInRow.forEach((value, columnIndex) => {
        const width = columnWidths[columnIndex];
        document.rect(cellLeft, rowTop, width, height).fill(rowIndex === 0 ? "#eaf5f4" : "#ffffff");
        document.rect(cellLeft, rowTop, width, height).lineWidth(0.4).strokeColor("#b7d8d4").stroke();
        document.font(rowIndex === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(8).fillColor("#173f3b")
          .text(value, cellLeft + 5, rowTop + 8, { width: width - 10, height: height - 10, align: columnIndex === 1 ? "center" : "left" });
        cellLeft += width;
      });
    });
    document.x = left;
    document.y = top + tableHeight + 8;
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
    const availableWidth = document.page.width - document.page.margins.left - document.page.margins.right;
    if (document.y > document.page.height - document.page.margins.bottom - 105)
      document.addPage();
    document
      .moveDown(0.65)
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#111111")
      .text(table.title ?? "Resultados");
    const headerY = document.y + 5;
    const compact = columns.length <= 2;
    const headerHeight = compact ? 24 : 38;
    const rowY = headerY + headerHeight;
    const rowHeight = compact ? 28 : 42;
    document.rect(document.page.margins.left, headerY, availableWidth, headerHeight).fill("#eaf5f4");
    columns.forEach((column, index) => {
      const left = document.page.margins.left + index * width;
      document.rect(left, headerY, width, headerHeight + rowHeight).lineWidth(0.4).strokeColor("#b7d8d4").stroke();
      document.font("Helvetica-Bold").fontSize(compact ? 8 : 7.2).fillColor("#173f3b").text(column.label ?? column.id, left + 5, headerY + 7, { width: width - 10, height: headerHeight - 10, align: "center" });
      document.font("Helvetica").fontSize(compact ? 9 : 7.5).fillColor("#111111").text(this.displayValue(result[column.id]), left + 5, rowY + 8, { width: width - 10, height: rowHeight - 10, align: "center" });
    });
    document.x = document.page.margins.left;
    document.y = rowY + rowHeight + 4;
  }

  private renderBarChart(
    document: PDFKit.PDFDocument,
    chart: {
      title?: string;
      type: "BAR";
      fields: PresentationField[];
      maximum?: number;
      expectedRange?: string;
    },
    result: Record<string, unknown>,
  ) {
    const values = chart.fields
      .map((field) => ({ ...field, value: Number(result[field.id]) }))
      .filter((field) => Number.isFinite(field.value));
    if (values.length === 0) return;
    const labelWidth = 150;
    const valueWidth = 28;
    const chartWidth = document.page.width - document.page.margins.left - document.page.margins.right - labelWidth - valueWidth;
    const maximum = Math.max(
      1,
      chart.maximum ?? 0,
      ...values.map((field) => field.value),
    );
    if (
      document.y >
      document.page.height -
        document.page.margins.bottom -
        (values.length * 44 + 105)
    )
      document.addPage();
    document
      .moveDown(0.5)
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#111111")
      .text(chart.title ?? "Gráfico");
    const rangeNumbers = chart.expectedRange?.match(/\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(",", "."))) ?? [];
    const rangeMinimum = rangeNumbers.length > 1 ? rangeNumbers[0] : 0;
    const rangeMaximum = rangeNumbers.at(-1);
    const hasExpectedRange = Number.isFinite(rangeMaximum);
    const rangeStart = hasExpectedRange ? Math.max(0, Math.min(rangeMinimum, maximum)) : 0;
    const rangeEnd = hasExpectedRange ? Math.max(rangeStart, Math.min(rangeMaximum as number, maximum)) : 0;
    const chartLeft = document.page.margins.left + labelWidth;
    const axisY = document.y + 18;
    for (let tick = 0; tick <= Math.floor(maximum); tick += 1) {
      const x = chartLeft + chartWidth * (tick / maximum);
      document
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#667085")
        .text(String(tick), x - 5, axisY - 12, { width: 10, align: "center", lineBreak: false });
      document.moveTo(x, axisY).lineTo(x, axisY + values.length * 44 - 8).lineWidth(0.35).strokeColor("#dce5e8").stroke();
    }
    values.forEach((field, index) => {
      const y = axisY + index * 44 + 4;
      document
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor("#344054")
        .text(field.label ?? field.id, document.page.margins.left, y + 2, { width: labelWidth - 10, height: 34 });
      document
        .roundedRect(chartLeft, y, chartWidth, 18, 3)
        .fill("#edf1f1")
      if (hasExpectedRange)
        document
          .roundedRect(chartLeft + chartWidth * (rangeStart / maximum), y, chartWidth * ((rangeEnd - rangeStart) / maximum), 18, 3)
          .fill("#fde8bd");
      document.roundedRect(chartLeft, y, chartWidth * (Math.max(0, Math.min(field.value, maximum)) / maximum), 18, 3).fill("#078ca8");
      if (hasExpectedRange) {
        const markerX = chartLeft + chartWidth * (rangeEnd / maximum);
        document.save().dash(3, { space: 2 }).moveTo(markerX, y - 3).lineTo(markerX, y + 21).lineWidth(1.2).strokeColor("#d98e04").stroke().restore();
      }
      document
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#111111")
        .text(String(field.value), chartLeft + chartWidth + 7, y + 4, { width: valueWidth - 7, lineBreak: false });
    });
    const legendY = axisY + values.length * 44 + 3;
    document.roundedRect(document.page.margins.left, legendY, 14, 9, 2).fill("#078ca8");
    document.font("Helvetica").fontSize(7.5).fillColor("#475467").text("Resultado observado", document.page.margins.left + 20, legendY, { width: 90, lineBreak: false });
    if (hasExpectedRange) {
      document.roundedRect(document.page.margins.left + 125, legendY, 14, 9, 2).fill("#fde8bd");
      document.fillColor("#475467").text(`Faixa esperada (${chart.expectedRange})`, document.page.margins.left + 145, legendY, { width: 110, lineBreak: false });
      document.save().dash(3, { space: 2 }).moveTo(document.page.margins.left + 278, legendY + 5).lineTo(document.page.margins.left + 294, legendY + 5).lineWidth(1.2).strokeColor("#d98e04").stroke().restore();
      document.fillColor("#475467").text(`Limite superior (${rangeEnd})`, document.page.margins.left + 301, legendY, { width: 105, lineBreak: false });
    }
    document.font("Helvetica-Oblique").fontSize(7.5).fillColor("#667085").text("Referência visual; interpretar o resultado conforme o manual técnico do instrumento.", document.page.margins.left, legendY + 20, { width: document.page.width - document.page.margins.left - document.page.margins.right });
    document.x = document.page.margins.left;
    document.y = legendY + 37;
  }

  private age(birthDate: Date | string | null, referenceDate?: Date | string | null) {
    if (!birthDate) return null;
    const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const today = referenceDate ? new Date(referenceDate) : new Date();
    if (Number.isNaN(today.getTime())) return null;
    let age = today.getFullYear() - birth.getFullYear();
    const birthdayThisYear = new Date(
      today.getFullYear(),
      birth.getMonth(),
      birth.getDate(),
    );
    if (today < birthdayThisYear) age -= 1;
    return age;
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
    if (document.y > document.page.height - document.page.margins.bottom - 92)
      document.addPage();
    document.moveDown(0.8).font("Helvetica-Bold").fontSize(12).fillColor("#111111").text(title);
    document.moveDown(0.35).font("Helvetica").fontSize(10).fillColor("#222222").text(content, { align: "justify", lineGap: 2 });
  }
}

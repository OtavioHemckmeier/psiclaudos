import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma.service";
import type { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: {
    organizationName: string;
    name: string;
    email: string;
    password: string;
    professionalRegistration?: string;
  }) {
    if (
      !input.organizationName?.trim() ||
      !input.name?.trim() ||
      !input.email?.trim()
    )
      throw new ConflictException(
        "Organização, nome e e-mail são obrigatórios.",
      );
    if (!input.password || input.password.length < 8)
      throw new ConflictException("A senha deve ter pelo menos 8 caracteres.");
    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing)
      throw new ConflictException("Este e-mail já está cadastrado.");
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        professionalRegistration: input.professionalRegistration,
        organization: { create: { name: input.organizationName } },
      },
    });
    return this.issueTokens(user);
  }

  async login(input: { email: string; password: string }) {
    if (!input.email?.trim() || !input.password)
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }
    if (user.status !== "ACTIVE")
      throw new UnauthorizedException(
        "Esta conta não está disponível para acesso.",
      );
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        type?: string;
      }>(refreshToken, {
        secret:
          process.env.JWT_REFRESH_SECRET ??
          process.env.JWT_SECRET ??
          "development-only-secret",
      });
      if (payload.type !== "refresh")
        throw new UnauthorizedException("Sessão inválida.");
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (
        !user ||
        user.status !== "ACTIVE" ||
        !user.refreshTokenHash ||
        !user.refreshTokenExpiresAt ||
        user.refreshTokenExpiresAt <= new Date() ||
        !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
      )
        throw new UnauthorizedException("Sessão expirada.");
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException("Sessão expirada. Entre novamente.");
    }
  }

  async requestPasswordReset(emailInput: string) {
    const email = emailInput?.trim().toLowerCase();
    const user = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;
    if (!user)
      return {
        message:
          "Se houver uma conta com esse e-mail, você receberá instruções para redefinir a senha.",
      };
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    const response: { message: string; developmentToken?: string } = {
      message:
        "Se houver uma conta com esse e-mail, você receberá instruções para redefinir a senha.",
    };
    if (process.env.EXPOSE_RESET_TOKEN === "true")
      response.developmentToken = token;
    return response;
  }

  async resetPassword(token: string, password: string) {
    if (!token?.trim() || !password || password.length < 8)
      throw new ConflictException(
        "Informe um token válido e uma senha com pelo menos 8 caracteres.",
      );
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const reset = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!reset)
      throw new UnauthorizedException(
        "O token de recuperação é inválido ou expirou.",
      );
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: {
          passwordHash: await bcrypt.hash(password, 12),
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { message: "Senha redefinida com sucesso. Entre com a nova senha." };
  }

  async profile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        professionalRegistration: true,
        document: true,
        phone: true,
        specialties: true,
        professionalBio: true,
        signatureText: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
  }

  async updateProfile(
    userId: string,
    input: {
      name?: string;
      professionalRegistration?: string;
      document?: string;
      phone?: string;
      specialties?: string[];
      professionalBio?: string;
      signatureText?: string;
      organizationName?: string;
      organizationEmail?: string;
      organizationPhone?: string;
    },
  ) {
    if (input.name !== undefined && input.name.trim().length < 2)
      throw new ConflictException("O nome deve ter pelo menos 2 caracteres.");
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    if (!user) throw new UnauthorizedException("Usuário não encontrado.");
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.professionalRegistration !== undefined
            ? {
                professionalRegistration:
                  input.professionalRegistration.trim() || null,
              }
            : {}),
          ...(input.document !== undefined
            ? { document: input.document.replace(/\D/g, "") || null }
            : {}),
          ...(input.phone !== undefined
            ? { phone: input.phone.trim() || null }
            : {}),
          ...(input.specialties !== undefined
            ? { specialties: input.specialties as Prisma.InputJsonValue }
            : {}),
          ...(input.professionalBio !== undefined
            ? { professionalBio: input.professionalBio.trim() || null }
            : {}),
          ...(input.signatureText !== undefined
            ? { signatureText: input.signatureText.trim() || null }
            : {}),
        },
      }),
      this.prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          ...(input.organizationName !== undefined
            ? { name: input.organizationName.trim() }
            : {}),
          ...(input.organizationEmail !== undefined
            ? { email: input.organizationEmail.trim().toLowerCase() || null }
            : {}),
          ...(input.organizationPhone !== undefined
            ? { phone: input.organizationPhone.trim() || null }
            : {}),
        },
      }),
    ]);
    return this.profile(userId);
  }

  async exportMyData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: { id: true, name: true, status: true, createdAt: true },
        },
        auditEvents: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!user) throw new UnauthorizedException("Usuário não encontrado.");
    await this.prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        event: "PERSONAL_DATA_EXPORTED",
        entityType: "User",
        entityId: user.id,
      },
    });
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        professionalRegistration: user.professionalRegistration,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
      organization: user.organization,
      auditEvents: user.auditEvents.map((event) => ({
        event: event.event,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
        createdAt: event.createdAt,
      })),
    };
  }

  async requestAccountClosure(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Usuário não encontrado.");
    const existing = await this.prisma.deletionRequest.findFirst({
      where: {
        requestedById: userId,
        targetType: "USER_ACCOUNT",
        targetId: userId,
        status: "PENDING",
      },
    });
    if (existing)
      return {
        message: "Já existe uma solicitação de eliminação em análise.",
        requestId: existing.id,
      };
    const request = await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: userId },
        data: {
          status: "CLOSURE_REQUESTED",
          refreshTokenHash: null,
          refreshTokenExpiresAt: null,
        },
      });
      return transaction.deletionRequest.create({
        data: {
          organizationId: user.organizationId,
          requestedById: user.id,
          targetType: "USER_ACCOUNT",
          targetId: user.id,
        },
      });
    });
    await this.prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        event: "ACCOUNT_CLOSURE_REQUESTED",
        entityType: "User",
        entityId: user.id,
      },
    });
    await this.prisma.auditEvent.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        event: "DELETION_REQUEST_CREATED",
        entityType: "DeletionRequest",
        entityId: request.id,
        metadata: {
          targetType: request.targetType,
          targetId: request.targetId,
        },
      },
    });
    return {
      message:
        "Solicitação de encerramento registrada. A conta será analisada conforme a política de retenção aplicável.",
      requestId: request.id,
    };
  }

  listMyDeletionRequests(userId: string) {
    return this.prisma.deletionRequest.findMany({
      where: { requestedById: userId },
      select: {
        id: true,
        targetType: true,
        status: true,
        reason: true,
        eligibleAt: true,
        processedAt: true,
        processingResult: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  private async issueTokens(user: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
  }) {
    const payload = {
      sub: user.id,
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role,
    };
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, type: "refresh" },
      {
        secret:
          process.env.JWT_REFRESH_SECRET ??
          process.env.JWT_SECRET ??
          "development-only-secret",
        expiresIn: "30d",
      },
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: await bcrypt.hash(refreshToken, 12),
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken,
      user: {
        id: user.id,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
      },
    };
  }
}

import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { CurrentUser } from "./auth.decorator";
import { AuthUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(
    @Body()
    body: {
      organizationName: string;
      name: string;
      email: string;
      password: string;
      professionalRegistration?: string;
    },
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.register(body);
    this.setRefreshCookie(response, session.refreshToken);
    return this.publicSession(session);
  }

  @Post("login")
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(body);
    this.setRefreshCookie(response, session.refreshToken);
    return this.publicSession(session);
  }

  @Post("refresh")
  async refresh(
    @Body() body: { refreshToken?: string },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      this.cookieValue(request.headers.cookie, "laudo_refresh_token") ??
      body.refreshToken;
    const session = await this.auth.refresh(refreshToken ?? "");
    this.setRefreshCookie(response, session.refreshToken);
    return this.publicSession(session);
  }

  @Post("forgot-password")
  forgotPassword(@Body() body: { email: string }) {
    return this.auth.requestPasswordReset(body.email);
  }

  @Post("reset-password")
  resetPassword(@Body() body: { token: string; password: string }) {
    return this.auth.resetPassword(body.token, body.password);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.profile(user.id);
  }

  @Patch("me")
  @UseGuards(AuthGuard)
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
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
    return this.auth.updateProfile(user.id, body);
  }

  @Get("me/export")
  @UseGuards(AuthGuard)
  exportMe(@CurrentUser() user: AuthUser) {
    return this.auth.exportMyData(user.id);
  }

  @Post("me/closure-request")
  @UseGuards(AuthGuard)
  async requestClosure(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.requestAccountClosure(user.id);
    response.clearCookie("laudo_refresh_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth",
    });
    return result;
  }

  @Get("me/deletion-requests")
  @UseGuards(AuthGuard)
  deletionRequests(@CurrentUser() user: AuthUser) {
    return this.auth.listMyDeletionRequests(user.id);
  }

  private setRefreshCookie(response: Response, refreshToken: string) {
    response.cookie("laudo_refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: "/api/auth",
    });
  }

  private cookieValue(header: string | undefined, name: string) {
    return header
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }

  private publicSession(session: {
    accessToken: string;
    refreshToken: string;
    user: { id: string; organizationId: string; email: string; role: string };
  }) {
    return {
      accessToken: session.accessToken,
      refreshToken: "",
      user: session.user,
    };
  }
}

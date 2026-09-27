import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: AuthUser }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Token de acesso ausente.');
    try {
      request.user = this.jwt.verify<AuthUser>(token);
      const roles = this.reflector.get<string[]>('roles', context.getHandler()) ?? [];
      if (roles.length > 0 && !roles.includes(request.user.role)) return false;
      return true;
    } catch {
      throw new UnauthorizedException('Token de acesso inválido.');
    }
  }
}

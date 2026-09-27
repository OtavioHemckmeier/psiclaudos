import { Controller, Get, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { PatientsModule } from './patients/patients.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { ReportsModule } from './reports/reports.module';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok', service: 'laudo-api' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return { status: 'ok', service: 'laudo-api', database: 'ok' };
    } catch {
      return { status: 'degraded', service: 'laudo-api', database: 'unavailable' };
    }
  }

  @Get()
  async check() {
    return this.ready();
  }
}

@Module({ imports: [AuthModule, PatientsModule, CatalogModule, EvaluationsModule, ReportsModule], controllers: [HealthController, AuditController], providers: [AuditService, PrismaService] })
export class AppModule {}

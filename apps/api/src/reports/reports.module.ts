import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { ReportsController } from './reports.controller';
import { GoogleDocsController } from './google-docs.controller';
import { ReportsService } from './reports.service';
import { AuditService } from '../audit.service';

@Module({ imports: [AuthModule], controllers: [ReportsController, GoogleDocsController], providers: [ReportsService, PrismaService, AuditService] })
export class ReportsModule {}

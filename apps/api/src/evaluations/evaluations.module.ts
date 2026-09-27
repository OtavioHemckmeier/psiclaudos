import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';
import { ApplicationService } from './application.service';
import { AuditService } from '../audit.service';

@Module({ imports: [AuthModule], controllers: [EvaluationsController], providers: [PrismaService, EvaluationsService, ApplicationService, AuditService] })
export class EvaluationsModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { AuditService } from '../audit.service';

@Module({ imports: [AuthModule], controllers: [PatientsController], providers: [PatientsService, PrismaService, AuditService] })
export class PatientsModule {}

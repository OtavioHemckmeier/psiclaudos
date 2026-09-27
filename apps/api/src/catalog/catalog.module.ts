import { Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({ imports: [AuthModule], controllers: [CatalogController], providers: [CatalogService, PrismaService], exports: [CatalogService] })
export class CatalogModule implements OnModuleInit {
  constructor(private readonly catalog: CatalogService) {}
  async onModuleInit() { if (process.env.SEED_DEMO_INSTRUMENT === 'true') await this.catalog.seedDemo(); }
}

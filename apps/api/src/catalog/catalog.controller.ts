import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/auth.decorator';
import { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/auth.types';
import { CatalogService } from './catalog.service';

@Controller('instruments')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query('category') category?: string) { return this.catalog.listPublished(category); }

  @Get(':code')
  get(@Param('code') code: string) { return this.catalog.getPublished(code); }

  @Post('publish')
  @UseGuards(AuthGuard)
  @Roles('ADMIN_PLATFORM')
  publish(@Body() body: { code: string; name: string; version: string; description?: string; formSchema: object; rules: object[]; outputSchema: object; presentationSchema?: object }) { return this.catalog.publish(body); }

  @Post(':code/versions/:version/archive')
  @UseGuards(AuthGuard)
  @Roles('ADMIN_PLATFORM')
  archive(@CurrentUser() user: AuthUser, @Param('code') code: string, @Param('version') version: string) { return this.catalog.archive(user, code, version); }
}

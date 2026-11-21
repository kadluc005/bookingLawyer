import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CurrentUser } from '@nestjs/authentication';
import { RolePolicy } from '../authorization/role.policy.js';
import { AuditLogsService } from '../services/audit-logs.service.js';
import { ClientsService } from '../services/clients.service.js';
import { ContactEventsService } from '../services/contact-events.service.js';
import { LawyersService } from '../services/lawyers.service.js';
import type { AuthenticatedUser } from '../services/users.service.js';
import {
  ClientSearchQueryDto,
  PaginationQueryDto,
  ReviewLawyerDto,
} from './controllers.dto.js';

@Controller('admin')
@Can(RolePolicy, 'admin')
export class AdminController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly lawyersService: LawyersService,
    private readonly contactEventsService: ContactEventsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  @Get('clients')
  searchClients(@Query() query: ClientSearchQueryDto) {
    return this.clientsService.search(query);
  }

  @Get('lawyers')
  listLawyers(@Query() query: PaginationQueryDto) {
    return this.lawyersService.listLawyersForAdmin(query.limit, query.offset);
  }

  @Get('lawyers/memberships')
  listLawyerMemberships(@Query() query: PaginationQueryDto) {
    return this.lawyersService.listMembershipsForAdmin(query.limit, query.offset);
  }

  @Patch('lawyers/:lawyerId/review')
  async reviewLawyer(
    @CurrentUser() admin: AuthenticatedUser,
    @Param('lawyerId', ParseUUIDPipe) lawyerUserId: string,
    @Body() body: ReviewLawyerDto,
  ) {
    const profile = await this.lawyersService.reviewProfile(
      admin.id,
      lawyerUserId,
      body.decision,
    );
    await this.auditLogsService.record({
      actorUserId: admin.id,
      action: `lawyer.profile.${body.decision}`,
      entityType: 'lawyer_profile',
      entityId: lawyerUserId,
    });

    return profile;
  }

  @Get('lawyers/:lawyerId')
  findLawyer(@Param('lawyerId', ParseUUIDPipe) lawyerUserId: string) {
    return this.lawyersService.findLawyerForAdmin(lawyerUserId);
  }

  @Get('lawyers/:lawyerId/contact-events')
  findLawyerContactEvents(
    @Param('lawyerId', ParseUUIDPipe) lawyerUserId: string,
    @Query('limit') limit?: string,
  ) {
    return this.contactEventsService.findForLawyer(
      lawyerUserId,
      limit === undefined ? 100 : Number(limit),
    );
  }

  @Get('audit/:entityType/:entityId')
  findAuditLog(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogsService.findForEntity(
      entityType,
      entityId,
      limit === undefined ? 100 : Number(limit),
    );
  }
}

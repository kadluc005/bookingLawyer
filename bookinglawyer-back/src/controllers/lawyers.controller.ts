import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CurrentUser } from '@nestjs/authentication';
import { AuditLogsService } from '../services/audit-logs.service.js';
import { ContactEventsService } from '../services/contact-events.service.js';
import { LawyersService } from '../services/lawyers.service.js';
import { MembershipsService } from '../services/memberships.service.js';
import type { AuthenticatedUser } from '../services/users.service.js';
import {
  ContactClickDto,
  LawyerDirectoryQueryDto,
  PaginationQueryDto,
  PaymentMethodDto,
  UpdateLawyerProfileDto,
} from './controllers.dto.js';
import { RolePolicy } from '../authorization/role.policy.js';

@Controller('lawyers')
export class LawyerDirectoryController {
  constructor(private readonly lawyersService: LawyersService) {}

  @Get()
  @Can(RolePolicy, 'client')
  findVisibleDirectory(@Query() query: LawyerDirectoryQueryDto) {
    return this.lawyersService.findVisibleDirectory(query);
  }
}

@Controller('lawyers/me')
@Can(RolePolicy, 'lawyer')
export class LawyerProfileController {
  constructor(
    private readonly lawyersService: LawyersService,
    private readonly auditLogsService: AuditLogsService,
    private readonly contactEventsService: ContactEventsService,
  ) {}

  @Get()
  findMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.lawyersService.findProfile(user.id);
  }

  @Post('submit')
  submitMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changes: UpdateLawyerProfileDto,
  ) {
    return this.lawyersService.submitProfile(user.id, changes);
  }

  @Get('contacts')
  findMyContacts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.contactEventsService.findClientsForLawyer(
      user.id,
      query.limit,
      query.offset,
    );
  }

  @Patch()
  async updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changes: UpdateLawyerProfileDto,
  ) {
    const profile = await this.lawyersService.updateProfile(user.id, changes);
    await this.auditLogsService.record({
      actorUserId: user.id,
      action: 'lawyer.profile.updated',
      entityType: 'lawyer_profile',
      entityId: user.id,
      metadata: { changedFields: Object.keys(changes) },
    });

    return profile;
  }
}

@Controller('lawyers')
@Can(RolePolicy, 'client')
export class LawyerContactController {
  constructor(
    private readonly lawyersService: LawyersService,
    private readonly contactEventsService: ContactEventsService,
  ) {}

  @Post(':lawyerId/contact')
  async contact(
    @CurrentUser() user: AuthenticatedUser,
    @Param('lawyerId', ParseUUIDPipe) lawyerUserId: string,
    @Body() body: ContactClickDto,
  ) {
    const target =
      await this.lawyersService.findVisibleContactTarget(lawyerUserId);
    await this.contactEventsService.recordClick({
      clientUserId: user.id,
      lawyerUserId,
      channel: body.channel,
    });

    return {
      channel: body.channel,
      value: body.channel === 'email' ? target.email : target.phone,
    };
  }
}

@Controller('memberships')
@Can(RolePolicy, 'lawyer')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  findMyMembership(@CurrentUser() user: AuthenticatedUser) {
    return this.membershipsService.findLatestForLawyer(user.id);
  }

  @Post()
  createAnnualMembership(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: PaymentMethodDto,
  ) {
    return this.membershipsService.createAnnualMembership({
      lawyerUserId: user.id,
      method: body?.method,
    });
  }
}

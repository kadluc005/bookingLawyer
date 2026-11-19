import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Can } from '@nestjs/authorization';
import { CurrentUser } from '@nestjs/authentication';
import { ClientsService } from '../services/clients.service.js';
import type { AuthenticatedUser } from '../services/users.service.js';
import { UpdateClientProfileDto } from './controllers.dto.js';
import { RolePolicy } from '../authorization/role.policy.js';

@Controller('clients/me')
@Can(RolePolicy, 'client')
export class ClientProfileController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  findMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.clientsService.findProfile(user.id);
  }

  @Patch()
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() changes: UpdateClientProfileDto,
  ) {
    return this.clientsService.updateProfile(user.id, changes);
  }
}

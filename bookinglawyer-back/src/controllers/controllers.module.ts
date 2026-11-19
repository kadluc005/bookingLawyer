import { Module } from '@nestjs/common';
import { RolePolicy } from '../authorization/role.policy.js';
import { ServicesModule } from '../services/services.module.js';
import { AdminController } from './admin.controller.js';
import { ClientProfileController } from './clients.controller.js';
import {
  LawyerContactController,
  LawyerDirectoryController,
  LawyerProfileController,
  MembershipsController,
} from './lawyers.controller.js';

@Module({
  imports: [ServicesModule],
  controllers: [
    AdminController,
    ClientProfileController,
    LawyerContactController,
    LawyerDirectoryController,
    LawyerProfileController,
    MembershipsController,
  ],
  providers: [RolePolicy],
})
export class ControllersModule {}

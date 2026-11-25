import { Module } from '@nestjs/common';
import { BookingMailModule } from '../mail/booking-mail.module.js';
import { AuditLogsService } from './audit-logs.service.js';
import { ClientsService } from './clients.service.js';
import { ContactEventsService } from './contact-events.service.js';
import { CvExtractionsService } from './cv-extractions.service.js';
import { LawyerDocumentsService } from './lawyer-documents.service.js';
import { LawyersService } from './lawyers.service.js';
import { MembershipsService } from './memberships.service.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [BookingMailModule],
  providers: [
    AuditLogsService,
    ClientsService,
    ContactEventsService,
    CvExtractionsService,
    LawyerDocumentsService,
    LawyersService,
    MembershipsService,
    UsersService,
  ],
  exports: [
    AuditLogsService,
    ClientsService,
    ContactEventsService,
    CvExtractionsService,
    LawyerDocumentsService,
    LawyersService,
    MembershipsService,
    UsersService,
  ],
})
export class ServicesModule {}

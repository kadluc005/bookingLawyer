import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  FileMailTransport,
  FileTemplateEngine,
  MailModule,
  SmtpTransport,
} from '@nestjs/mail';
import { LawyerDossierMailService } from './lawyer-dossier-mail.service.js';
import { LawyerWorkflowMailService } from './lawyer-workflow-mail.service.js';

@Module({
  imports: [
    MailModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('SMTP_URL')?.trim();
        const user = config.get<string>('SMTP_USER')?.trim();
        const pass = config.get<string>('SMTP_PASSWORD');
        const from = config.get<string>('MAIL_FROM')?.trim();

        if (!url && (user || pass)) {
          throw new Error(
            'SMTP_URL must be set when SMTP credentials are configured.',
          );
        }
        if (Boolean(user) !== Boolean(pass?.trim())) {
          throw new Error('Configure SMTP_USER and SMTP_PASSWORD together.');
        }
        if (url && !from) {
          throw new Error('MAIL_FROM must be set when SMTP_URL is configured.');
        }

        return {
          transport: url
            ? new SmtpTransport({
                url,
                auth: user && pass ? { user, pass } : undefined,
              })
            : new FileMailTransport({ directory: './emails' }),
          from: from || 'BookingLawyer <noreply@example.test>',
          templates: new FileTemplateEngine({
            dir: join(import.meta.dirname, 'templates'),
            layout: 'layout',
            cache: config.get('NODE_ENV') === 'production',
          }),
        };
      },
    }),
  ],
  providers: [LawyerDossierMailService, LawyerWorkflowMailService],
  exports: [LawyerDossierMailService, LawyerWorkflowMailService],
})
export class BookingMailModule {}

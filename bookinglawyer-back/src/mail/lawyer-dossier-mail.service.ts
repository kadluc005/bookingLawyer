import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mailer } from '@nestjs/mail';
import { getFrontendOrigin } from './frontend-origin.js';

type DossierNotification =
  | { kind: 'submitted' | 'approved' }
  | { kind: 'rejected'; reason: string };

const dossierMessages = {
  submitted: {
    template: 'dossier-soumis',
    subject: 'BookingLawyer a reçu votre dossier',
    title: 'Votre dossier est en cours de vérification',
    preheader: 'Votre dossier a été reçu par l’équipe BookingLawyer.',
    actionLabel: 'Suivre mon dossier',
  },
  approved: {
    template: 'dossier-approuve',
    subject: 'Votre dossier avocat est approuvé',
    title: 'Votre dossier est approuvé',
    preheader: 'L’équipe BookingLawyer a approuvé votre dossier.',
    actionLabel: 'Ouvrir mon espace avocat',
  },
  rejected: {
    template: 'dossier-rejete',
    subject: 'Votre dossier avocat a été rejeté',
    title: 'Votre dossier a été rejeté',
    preheader: 'Consultez le motif de la décision et les étapes pour soumettre à nouveau votre dossier.',
    actionLabel: 'Ouvrir mon dossier',
  },
};

@Injectable()
export class LawyerDossierMailService {
  private readonly logger = new Logger(LawyerDossierMailService.name);
  private readonly dashboardUrl: string;

  constructor(
    private readonly mailer: Mailer,
    config: ConfigService,
  ) {
    this.dashboardUrl = new URL('/espace', getFrontendOrigin(config)).href;
  }

  async send(to: string, notification: DossierNotification): Promise<boolean> {
    const { subject, template, ...presentation } =
      dossierMessages[notification.kind];
    const reason = notification.kind === 'rejected' ? notification.reason : '';
    try {
      await this.mailer.send({
        to,
        subject,
        template,
        context: {
          ...presentation,
          actionUrl: this.dashboardUrl,
          reason,
          reasonLines: reason.split(/\r\n|\r|\n/),
        },
      });
      return true;
    } catch {
      this.logger.warn(
        `Lawyer dossier notification failed (${notification.kind}).`,
      );
      return false;
    }
  }
}

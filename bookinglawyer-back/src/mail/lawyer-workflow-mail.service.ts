import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mailer } from '@nestjs/mail';
import { getFrontendOrigin } from './frontend-origin.js';

const messages = {
  credentials: {
    template: 'identifiants-avocat',
    title: 'Vos identifiants BookingLawyer',
    preheader: 'Connectez-vous et choisissez votre mot de passe.',
    path: '/connexion',
    actionLabel: 'Me connecter',
  },
  proforma: {
    template: 'facture-pro-forma',
    title: 'Facture pro forma de votre cotisation',
    preheader: 'Retrouvez la référence et le montant de votre cotisation annuelle.',
    path: '/cotisation',
    actionLabel: 'Voir ma cotisation',
  },
  payment: {
    template: 'cotisation-confirmee',
    title: 'Félicitations, votre cotisation est active',
    preheader: 'Complétez votre dossier pour la validation administrative.',
    path: '/inscription/profil',
    actionLabel: 'Compléter mon dossier',
  },
  member: {
    template: 'nouveau-membre',
    title: 'Un avocat a activé sa cotisation',
    preheader: 'Retrouvez son compte dans l’administration.',
    path: '/administration/avocats',
    actionLabel: 'Ouvrir l’administration',
  },
  profile: {
    template: 'profil-avocat-modifie',
    title: 'Un avocat a modifié ses informations',
    preheader: 'Consultez la liste des informations modifiées.',
    path: '/administration/avocats',
    actionLabel: 'Ouvrir l’administration',
  },
};

@Injectable()
export class LawyerWorkflowMailService {
  private readonly logger = new Logger(LawyerWorkflowMailService.name);
  private readonly frontendOrigin: string;

  constructor(
    private readonly mailer: Mailer,
    config: ConfigService,
  ) {
    this.frontendOrigin = getFrontendOrigin(config);
  }

  async send(
    kind: keyof typeof messages,
    recipients: string | string[],
    details: Record<string, string | string[]>,
  ): Promise<boolean> {
    if (recipients.length === 0) return false;
    const { template, title, preheader, path, actionLabel } = messages[kind];
    try {
      await this.mailer.send({
        to: recipients,
        subject: title,
        template,
        context: {
          ...details,
          title,
          preheader,
          actionLabel,
          actionUrl: new URL(path, this.frontendOrigin).href,
        },
      });
      return true;
    } catch {
      this.logger.warn(`Lawyer workflow notification failed (${kind}).`);
      return false;
    }
  }
}

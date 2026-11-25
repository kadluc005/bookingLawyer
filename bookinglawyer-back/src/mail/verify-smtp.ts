import { Module, type INestApplicationContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MailSmtpError, MailTransport, SmtpTransport } from '@nestjs/mail';
import { BookingMailModule } from './booking-mail.module.js';

@Module({
  imports: [ConfigModule.forRoot(), BookingMailModule],
})
class SmtpVerificationModule {}

let app: INestApplicationContext | undefined;
try {
  app = await NestFactory.createApplicationContext(SmtpVerificationModule, {
    logger: false,
    abortOnError: false,
  });
  const transport = app.get(MailTransport);
  if (transport instanceof SmtpTransport) {
    await transport.verify();
    console.log('Connexion SMTP vérifiée. Aucun e-mail envoyé.');
  } else {
    console.error('SMTP_URL est vide. Le transport local .eml est actif.');
    process.exitCode = 1;
  }
} catch (error) {
  if (error instanceof MailSmtpError) {
    const status = error.enhancedCode
      ? `${error.code} / ${error.enhancedCode}`
      : String(error.code);
    if (error.command === 'AUTH') {
      const url = app?.get(ConfigService).get<string>('SMTP_URL')?.trim();
      const host = url ? new URL(url).hostname : 'serveur SMTP';
      console.error(`Authentification refusée par ${host} (SMTP ${status}).`);
      if ([534, 535].includes(error.code)) {
        console.error(
          'Vérifiez que SMTP_URL et SMTP_USER correspondent au même fournisseur et que SMTP_PASSWORD contient le mot de passe d’application de ce compte.',
        );
      }
    } else {
      console.error(`Le serveur a refusé la vérification SMTP (code ${status}).`);
    }
  } else {
    console.error('Connexion SMTP impossible. Vérifiez la configuration et l’accès réseau au relais.');
  }
  process.exitCode = 1;
} finally {
  await app?.close();
}

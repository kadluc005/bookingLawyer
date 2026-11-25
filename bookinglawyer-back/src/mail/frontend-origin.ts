import type { ConfigService } from '@nestjs/config';

export function getFrontendOrigin(config: ConfigService): string {
  const frontendUrl = config.get<string>('FRONTEND_URL')?.trim();
  if (config.get<string>('SMTP_URL')?.trim() && !frontendUrl) {
    throw new Error('FRONTEND_URL must be set when SMTP_URL is configured.');
  }
  const url = new URL(frontendUrl || 'http://localhost:4200');
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'FRONTEND_URL must be an HTTP or HTTPS URL without credentials.',
    );
  }
  return url.origin;
}

import { Injectable, Logger } from '@nestjs/common';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Envío de emails transaccionales con Resend (https://resend.com) vía HTTP.
 *
 * - Con RESEND_API_KEY: envía de verdad.
 * - Sin clave en desarrollo: no envía y escribe el contenido en la consola de la API,
 *   para poder probar los flujos sin cuenta de email.
 * - Sin clave en producción: no envía y lo registra como error (sin el contenido,
 *   que puede llevar enlaces privados).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get apiKey(): string {
    return process.env.RESEND_API_KEY?.trim() ?? '';
  }

  private get from(): string {
    return process.env.MAIL_FROM?.trim() || 'AnPi Tech <onboarding@resend.dev>';
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.apiKey) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          `Email sin enviar a ${message.to}: falta RESEND_API_KEY en producción.`,
        );
        return;
      }

      this.logger.warn(
        [
          'RESEND_API_KEY vacío: email NO enviado (modo desarrollo).',
          `Para: ${message.to}`,
          `Asunto: ${message.subject}`,
          message.text,
        ].join('\n'),
      );
      return;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend respondió ${res.status}: ${body.slice(0, 300)}`);
    }
  }
}

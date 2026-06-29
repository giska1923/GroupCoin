import nodemailer, { Transporter } from 'nodemailer';
import config from '../config/app.config';
import AppLogger from '../utils/logger';

const logger = new AppLogger('EmailService');
const { email } = config();

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Lazily-built SMTP transport. Stays null until the first send so importing
 * this module never opens a socket. When no SMTP host is configured the
 * service falls back to "console mode" and logs the message instead — local
 * dev can read the verification code straight from the server log.
 */
let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!email.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: email.host,
      port: email.port,
      secure: email.secure,
      auth: email.user ? { user: email.user, pass: email.pass } : undefined,
    });
  }
  return transporter;
};

const EmailService = {
  /** True when real SMTP delivery is configured (vs. console-log dev mode). */
  get isConfigured(): boolean {
    return Boolean(email.host);
  },

  /**
   * Sends an email. Throws if a configured SMTP send fails, so callers can
   * surface the failure to the user. In console mode it never throws — it just
   * logs — so the signup flow stays usable without an SMTP account.
   */
  async send(message: EmailMessage): Promise<void> {
    const tx = getTransporter();

    if (!tx) {
      logger.warn(
        `SMTP not configured — email to ${message.to} not sent. ` +
          `Subject: "${message.subject}". Body:\n${message.text}`,
      );
      return;
    }

    await tx.sendMail({
      from: email.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    logger.log(`Email sent to ${message.to}: "${message.subject}"`);
  },
};

export default EmailService;

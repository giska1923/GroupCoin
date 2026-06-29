import crypto from 'crypto';
import { Op } from 'sequelize';
import config from '../config/app.config';
import { EmailVerification, User } from '../models';
import { BadRequestError } from '../types';
import { durationToMs } from '../utils/duration';
import EmailService from './email.service';

const { verification } = config();

const hashCode = (code: string): string =>
  crypto.createHash('sha256').update(code).digest('hex');

/**
 * Generates a numeric code of the configured length using rejection-free
 * modulo over crypto bytes. Leading zeros are preserved via padStart so a
 * 6-digit code is always exactly 6 characters.
 */
const generateCode = (): string => {
  const max = 10 ** verification.codeLength;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(verification.codeLength, '0');
};

const buildEmail = (code: string) => {
  const minutes = Math.round(durationToMs(verification.ttl) / 60_000);
  const subject = 'Your GroupCoin verification code';
  const text =
    `Welcome to GroupCoin!\n\n` +
    `Your verification code is: ${code}\n\n` +
    `Enter it in the app to finish creating your account. ` +
    `This code expires in ${minutes} minutes.\n\n` +
    `If you didn't request this, you can safely ignore this email.`;
  const html =
    `<p>Welcome to GroupCoin!</p>` +
    `<p>Your verification code is:</p>` +
    `<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>` +
    `<p>Enter it in the app to finish creating your account. ` +
    `This code expires in ${minutes} minutes.</p>` +
    `<p>If you didn't request this, you can safely ignore this email.</p>`;
  return { subject, text, html };
};

const EmailVerificationService = {
  /**
   * Issues a fresh verification code for a user: invalidates any outstanding
   * codes (so only the newest works), persists the hashed code, and emails the
   * plaintext to the user. Called on registration and on every resend.
   */
  async issueCode(user: User): Promise<void> {
    // Burn any still-redeemable codes so a resend supersedes the previous one.
    await EmailVerification.update(
      { consumedAt: new Date() },
      { where: { userId: user.id, consumedAt: { [Op.is]: null } } },
    );

    const code = generateCode();
    await EmailVerification.create({
      userId: user.id,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + durationToMs(verification.ttl)),
    });

    const { subject, text, html } = buildEmail(code);
    await EmailService.send({ to: user.email, subject, text, html });
  },

  /**
   * Validates a submitted code for a user. On success the code is consumed and
   * the user is marked verified. Throws BadRequestError on any failure (no
   * matching code, expired, already used, wrong value, or too many attempts)
   * with a message safe to show the user.
   */
  async verifyCode(user: User, code: string): Promise<void> {
    const record = await EmailVerification.findOne({
      where: { userId: user.id, consumedAt: { [Op.is]: null } },
      order: [['created_at', 'DESC']],
    });

    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestError(
        'This code has expired. Request a new one and try again.',
      );
    }

    if (record.attempts >= verification.maxAttempts) {
      // Lock the code so it can't be brute-forced; force a resend.
      record.consumedAt = new Date();
      await record.save();
      throw new BadRequestError(
        'Too many incorrect attempts. Request a new code and try again.',
      );
    }

    if (record.codeHash !== hashCode(code)) {
      record.attempts += 1;
      await record.save();
      throw new BadRequestError(
        'That code is incorrect. Check the email and try again.',
      );
    }

    record.consumedAt = new Date();
    await record.save();

    user.emailVerified = true;
    await user.save();
  },
};

export default EmailVerificationService;

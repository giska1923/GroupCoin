import { Op } from 'sequelize';
import config from '../config/app.config';
import { DeviceToken, User } from '../models';
import AppLogger from '../utils/logger';

const logger = new AppLogger('PushService');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo accepts at most 100 messages per request.
const CHUNK_SIZE = 100;
// Must match the Android channel the mobile client creates on registration
// (see ANDROID_NOTIFICATION_CHANNEL_ID in the app), or Android drops the alert.
const ANDROID_CHANNEL_ID = 'groupcoin-default';

const { expo } = config();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoMessage extends PushPayload {
  to: string;
  channelId: string;
  priority: 'high';
  sound: 'default';
}

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const buildMessage = (token: string, payload: PushPayload): ExpoMessage => ({
  to: token,
  title: payload.title,
  body: payload.body,
  data: payload.data,
  channelId: ANDROID_CHANNEL_ID,
  priority: 'high',
  sound: 'default',
});

/**
 * Sends one chunk to Expo and prunes any tokens Expo reports as no longer
 * registered (app uninstalled, token rotated), so the table doesn't rot.
 */
const sendChunk = async (messages: ExpoMessage[]): Promise<void> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (expo.accessToken) {
    headers.Authorization = `Bearer ${expo.accessToken}`;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    logger.error(
      `Expo push request failed: ${response.status} ${await response.text()}`,
    );
    return;
  }

  const json = (await response.json()) as { data?: ExpoTicket[] };
  const tickets = json.data ?? [];

  const deadTokens = tickets.reduce<string[]>((acc, ticket, index) => {
    if (
      ticket.status === 'error' &&
      ticket.details?.error === 'DeviceNotRegistered'
    ) {
      acc.push(messages[index].to);
    }
    return acc;
  }, []);

  if (deadTokens.length > 0) {
    await DeviceToken.destroy({ where: { token: { [Op.in]: deadTokens } } });
    logger.log(`Pruned ${deadTokens.length} unregistered device token(s).`);
  }
};

const PushService = {
  /**
   * Delivers a push to every opted-in recipient's registered devices. Best
   * effort: never throws, so a push failure can't break the originating
   * request. Recipients who have disabled notifications, or who have no
   * device tokens, are silently skipped.
   */
  async notifyUsers(userIds: string[], payload: PushPayload): Promise<void> {
    try {
      const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
      if (uniqueIds.length === 0) return;

      const optedIn = await User.findAll({
        where: { id: { [Op.in]: uniqueIds }, notificationsEnabled: true },
        attributes: ['id'],
      });
      if (optedIn.length === 0) return;

      const tokens = await DeviceToken.findAll({
        where: { userId: { [Op.in]: optedIn.map(u => u.id) } },
        attributes: ['token'],
      });
      if (tokens.length === 0) return;

      const messages = tokens.map(t => buildMessage(t.token, payload));

      for (const batch of chunk(messages, CHUNK_SIZE)) {
        await sendChunk(batch);
      }
    } catch (error) {
      logger.error(
        `Failed to deliver push notification: ${(error as Error).message}`,
      );
    }
  },
};

export default PushService;

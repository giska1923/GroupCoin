import { RegisterDeviceTokenDTO } from '../dtos/request';
import { DeviceTokenDTO } from '../dtos/response';
import { DeviceToken } from '../models';
import { mapToClass } from '../utils/validation/class-mapper';

const DeviceTokenService = {
  /**
   * Registers (or re-registers) an Expo push token for a user. Keyed by the
   * unique token: if the same device re-registers — or moves to a different
   * account — the existing row is reassigned instead of duplicated.
   */
  async registerToken(
    userId: string,
    dto: RegisterDeviceTokenDTO,
  ): Promise<DeviceTokenDTO> {
    const existing = await DeviceToken.findOne({ where: { token: dto.token } });

    if (existing) {
      existing.userId = userId;
      existing.platform = dto.platform;
      await existing.save();
      return mapToClass(existing, DeviceTokenDTO);
    }

    const created = await DeviceToken.create({
      userId,
      token: dto.token,
      platform: dto.platform,
    });
    return mapToClass(created, DeviceTokenDTO);
  },

  /**
   * Removes a device token for a user. Scoped to the owner so a token can't be
   * deregistered by anyone else, and idempotent so repeated calls are safe.
   */
  async removeToken(userId: string, token: string): Promise<void> {
    await DeviceToken.destroy({ where: { userId, token } });
  },

  /** Removes every device token for a user (e.g. on account deletion). */
  async removeAllForUser(userId: string): Promise<void> {
    await DeviceToken.destroy({ where: { userId } });
  },
};

export default DeviceTokenService;

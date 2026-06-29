import { IsIn, IsNotEmpty, IsString } from 'class-validator';

// Mirrors the mobile `PushPlatform` union.
export const DEVICE_PLATFORMS = ['ios', 'android'] as const;

export class RegisterDeviceTokenDTO {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsIn(DEVICE_PLATFORMS, {
    message: `platform must be one of: ${DEVICE_PLATFORMS.join(', ')}`,
  })
  platform!: (typeof DEVICE_PLATFORMS)[number];
}

export class RemoveDeviceTokenDTO {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

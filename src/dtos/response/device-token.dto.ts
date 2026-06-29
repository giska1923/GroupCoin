import { Expose } from 'class-transformer';

export class DeviceTokenDTO {
  @Expose() id!: string;
  @Expose() userId!: string;
  @Expose() token!: string;
  @Expose() platform!: string;
  @Expose() createdAt!: Date;
}

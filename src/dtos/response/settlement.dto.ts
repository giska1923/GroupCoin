import { Expose } from 'class-transformer';

export class SettlementDTO {
  @Expose() id!: string;
  @Expose() groupId!: string;
  @Expose() fromUserId!: string;
  @Expose() toUserId!: string;
  @Expose() amount!: string;
  @Expose() currency!: string;
  @Expose() settledAt!: Date;
  @Expose() note!: string | null;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

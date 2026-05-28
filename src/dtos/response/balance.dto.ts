import { Expose, Type } from 'class-transformer';
import { UserDTO } from './user.dto';

export class CurrencyAmountDTO {
  @Expose() currency!: string;
  // Positive = the group owes this user. Negative = this user owes the group.
  @Expose() amount!: string;
}

export class UserBalanceDTO {
  @Expose() userId!: string;

  @Expose()
  @Type(() => UserDTO)
  user?: UserDTO;

  @Expose()
  @Type(() => CurrencyAmountDTO)
  balances!: CurrencyAmountDTO[];
}

export class SimplifiedTransferDTO {
  @Expose() fromUserId!: string;
  @Expose() toUserId!: string;
  @Expose() amount!: string;
  @Expose() currency!: string;
}

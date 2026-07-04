import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SUPPORTED_CURRENCY_CODES } from '../../constants';

export class CreateSettlementDTO {
  // Optional: defaults to the calling user when omitted.
  @IsOptional()
  @IsUUID('4')
  fromUserId?: string;

  @IsUUID('4')
  @IsNotEmpty()
  toUserId!: string;

  @IsNumberString(
    { no_symbols: false },
    { message: 'amount must be a numeric string (e.g. "20.00")' },
  )
  @IsNotEmpty()
  amount!: string;

  // ISO 4217 currency code. Defaults to the group's defaultCurrency, and must
  // match it when provided (groups are single-currency).
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_CODES, {
    message: 'currency must be a supported ISO 4217 code',
  })
  currency?: string;

  @IsOptional()
  @IsDateString()
  settledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

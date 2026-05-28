import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

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

  // ISO 4217 currency code. Defaults to the group's defaultCurrency.
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  settledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

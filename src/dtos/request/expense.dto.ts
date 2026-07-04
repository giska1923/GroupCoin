import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SplitType, SUPPORTED_CURRENCY_CODES } from '../../constants';

const SPLIT_TYPES = [...Object.values(SplitType)];

export class CreateExpenseDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description!: string;

  // Decimal as string to keep precision when DTOs are serialized.
  @IsNumberString(
    { no_symbols: false },
    { message: 'amount must be a numeric string (e.g. "10.00")' },
  )
  @IsNotEmpty()
  amount!: string;

  // Defaults to the calling user when omitted.
  @IsOptional()
  @IsUUID('4')
  paidBy?: string;

  // ISO 4217 currency code. Defaults to the group's defaultCurrency, and must
  // match it when provided (groups are single-currency).
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_CODES, {
    message: 'currency must be a supported ISO 4217 code',
  })
  currency?: string;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsIn(SPLIT_TYPES)
  splitType?: (typeof SplitType)[keyof typeof SplitType];

  // For EQUAL splits: list of group-member user IDs the cost is split among.
  // If omitted, defaults to all current members of the group.
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  participantIds?: string[];
}

export class UpdateExpenseDTO {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: false })
  amount?: string;

  @IsOptional()
  @IsUUID('4')
  paidBy?: string;

  @IsOptional()
  @IsIn(SUPPORTED_CURRENCY_CODES, {
    message: 'currency must be a supported ISO 4217 code',
  })
  currency?: string;

  @IsOptional()
  @IsDateString()
  expenseDate?: string;

  @IsOptional()
  @IsIn(SPLIT_TYPES)
  splitType?: (typeof SplitType)[keyof typeof SplitType];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Type(() => String)
  participantIds?: string[];
}

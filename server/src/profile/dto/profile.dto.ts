import { IsBoolean, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { TIME_RE } from '../../common/utils/dates';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ValidateIf((dto: UpdateProfileDto) => dto.phone !== undefined && dto.phone !== null)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ValidateIf((dto: UpdateProfileDto) => dto.avatarUrl !== undefined && dto.avatarUrl !== null)
  @IsString()
  @MaxLength(500)
  avatarUrl?: string | null;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  refreshToken?: string;
}

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Matches(TIME_RE, { message: 'time должно быть в формате HH:MM' })
  time?: string;
}

export class PushSubscriptionDto {
  @IsString()
  @MaxLength(2000)
  endpoint: string;

  @ValidateIf((dto: PushSubscriptionDto) => dto.expirationTime !== undefined && dto.expirationTime !== null)
  @IsString()
  @MaxLength(100)
  expirationTime?: string | null;

  @IsObject()
  keys: Record<string, string>;
}

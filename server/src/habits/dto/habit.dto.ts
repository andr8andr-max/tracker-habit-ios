import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { TIME_RE } from '../../common/utils/dates';

export class ScheduleDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days: number[];
}

export class CreateHabitDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @ValidateIf((dto: CreateHabitDto) => dto.description !== undefined && dto.description !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  targetCount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ValidateIf((dto: CreateHabitDto) => dto.remindAt !== undefined && dto.remindAt !== null)
  @Matches(TIME_RE, { message: 'remindAt должен быть в формате HH:MM' })
  remindAt?: string | null;
}

export class UpdateHabitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ValidateIf((dto: UpdateHabitDto) => dto.description !== undefined && dto.description !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  targetCount?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ValidateIf((dto: UpdateHabitDto) => dto.remindAt !== undefined && dto.remindAt !== null)
  @Matches(TIME_RE, { message: 'remindAt должен быть в формате HH:MM' })
  remindAt?: string | null;
}

export class LogHabitDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date должен быть в формате YYYY-MM-DD' })
  date?: string;

  @IsIn(['done', 'skipped', 'pending'])
  status: 'done' | 'skipped' | 'pending';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

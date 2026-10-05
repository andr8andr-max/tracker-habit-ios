import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export const CONTACT_TAGS = ['vip', 'partner', 'client', 'inactive'] as const;

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ValidateIf((dto: CreateContactDto) => dto.phone !== undefined && dto.phone !== null)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ValidateIf((dto: CreateContactDto) => dto.company !== undefined && dto.company !== null)
  @IsString()
  @MaxLength(160)
  company?: string | null;

  @ValidateIf((dto: CreateContactDto) => dto.city !== undefined && dto.city !== null)
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @IsOptional()
  @IsIn(CONTACT_TAGS)
  tag?: (typeof CONTACT_TAGS)[number];

  @ValidateIf((dto: CreateContactDto) => dto.note !== undefined && dto.note !== null)
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ValidateIf((dto: CreateContactDto) => dto.linkedEmployeeId !== undefined && dto.linkedEmployeeId !== null)
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'linkedEmployeeId должен быть UUID',
  })
  linkedEmployeeId?: string | null;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ValidateIf((dto: UpdateContactDto) => dto.phone !== undefined && dto.phone !== null)
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @ValidateIf((dto: UpdateContactDto) => dto.company !== undefined && dto.company !== null)
  @IsString()
  @MaxLength(160)
  company?: string | null;

  @ValidateIf((dto: UpdateContactDto) => dto.city !== undefined && dto.city !== null)
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @IsOptional()
  @IsIn(CONTACT_TAGS)
  tag?: (typeof CONTACT_TAGS)[number];

  @ValidateIf((dto: UpdateContactDto) => dto.note !== undefined && dto.note !== null)
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @ValidateIf((dto: UpdateContactDto) => dto.linkedEmployeeId !== undefined && dto.linkedEmployeeId !== null)
  @IsString()
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'linkedEmployeeId должен быть UUID',
  })
  linkedEmployeeId?: string | null;
}

export class CreateContactLogDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  action: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  durationMin?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

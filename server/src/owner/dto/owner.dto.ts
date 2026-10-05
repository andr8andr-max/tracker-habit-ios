import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class UpdateClubDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ValidateIf((dto: UpdateClubDto) => dto.logoUrl !== undefined && dto.logoUrl !== null)
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;

  @ValidateIf((dto: UpdateClubDto) => dto.address !== undefined && dto.address !== null)
  @IsString()
  @MaxLength(255)
  address?: string | null;
}

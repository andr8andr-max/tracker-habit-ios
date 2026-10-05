import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CONTACT_TAGS } from './contact.dto';

export class ListContactsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(CONTACT_TAGS)
  tag?: (typeof CONTACT_TAGS)[number];

  @IsOptional()
  @IsIn(['alpha', 'last'])
  sort?: 'alpha' | 'last';
}

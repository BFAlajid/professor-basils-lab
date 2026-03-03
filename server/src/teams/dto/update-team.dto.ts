import {
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  format?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  data?: unknown[];
}

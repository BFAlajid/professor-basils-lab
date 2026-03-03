import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  format?: string;

  @IsArray()
  @ArrayMaxSize(6, { message: 'A team can have at most 6 Pokémon' })
  data: unknown[];
}

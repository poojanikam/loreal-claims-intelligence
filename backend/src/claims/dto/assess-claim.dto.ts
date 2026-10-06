import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class EvidenceDto {
  @ApiProperty({ example: 'Randomized controlled clinical study' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  studyType!: string;

  @ApiProperty({ example: 'Adults aged 40-60, n=80' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  population!: string;

  @ApiProperty({ example: '4 weeks' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  duration!: string;

  @ApiProperty({ example: 'Validated wrinkle imaging; baseline and week 4' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  method!: string;

  @ApiProperty({ example: 'Mean wrinkle score reduced by 21%; control reduced by 4%' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  results!: string;

  @ApiPropertyOptional({ example: 'Single site; details of blinding not provided' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  limitations?: string;
}

export class AssessClaimDto {
  @ApiProperty({ example: 'Example serum' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName!: string;

  @ApiProperty({ example: 'Reduces wrinkles by 20% in 4 weeks' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  claimText!: string;

  @ApiPropertyOptional({ example: 'Formula and use conditions' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  formulaSummary?: string;

  @ApiProperty({ type: EvidenceDto })
  @ValidateNested()
  @Type(() => EvidenceDto)
  evidence!: EvidenceDto;
}

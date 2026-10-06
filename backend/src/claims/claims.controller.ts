import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssessClaimDto } from './dto/assess-claim.dto';
import { ClaimsService } from './claims.service';

@ApiTags('claims')
@Controller('claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post('assess')
  @ApiOperation({ summary: 'Assess a product claim against submitted study evidence' })
  @ApiCreatedResponse({ description: 'The saved assessment and its claim identifier.' })
  assess(@Body() dto: AssessClaimDto) {
    return this.claimsService.assess(dto);
  }
}

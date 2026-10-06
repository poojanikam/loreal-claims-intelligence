const mockCreate = jest.fn();

jest.mock('openai', () => ({
  __esModule: true,
  default: Object.assign(
    jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: (...args: unknown[]) => mockCreate(...args),
        },
      },
    })),
    {
      APIError: class MockAPIError extends Error {
        constructor(readonly status?: number) {
          super('mock OpenAI API error');
        }
      },
    },
  ),
}));

import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { AssessClaimDto } from './dto/assess-claim.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ApiException } from '../common/api-exception';

describe('ClaimsService', () => {
  const dto = Object.assign(new AssessClaimDto(), {
    productName: 'Example serum',
    claimText: 'Reduces wrinkles by 20% in 4 weeks',
    evidence: {
      studyType: 'Randomized controlled clinical study',
      population: 'Adults aged 40-60, n=80',
      duration: '4 weeks',
      method: 'Validated wrinkle imaging',
      results: 'Mean wrinkle score reduced by 21%',
    },
  });

  let service: ClaimsService;
  let transaction: {
    claim: { create: jest.Mock };
    assessment: { create: jest.Mock };
  };
  let prisma: { $transaction: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            justified: true,
            confidenceScore: 0.82,
            reasoning: 'The reported four-week reduction aligns with the claim.',
            limitations: ['The sample size requires evaluator review.'],
          }),
        },
      }],
    });
    transaction = {
      claim: { create: jest.fn().mockResolvedValue({ id: 'claim-id' }) },
      assessment: {
        create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve({ id: 'assessment-id', ...data }),
        ),
      },
    };
    prisma = {
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const config = new ConfigService({
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'gpt-4o-mini',
    });
    service = new ClaimsService(
      prisma as unknown as PrismaService,
      config,
    );
  });

  it('assesses the claim, saves both records, and returns the assessment', async () => {
    const result = await service.assess(dto);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.claim.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productName: dto.productName,
        claimText: dto.claimText,
      }),
    });
    expect(transaction.assessment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        claimId: 'claim-id',
        justified: true,
        confidenceScore: 0.82,
        humanReviewRequired: true,
      }),
    });
    expect(result).toEqual({
      claimId: 'claim-id',
      assessment: expect.objectContaining({
        id: 'assessment-id',
        justified: true,
        confidenceScore: 0.82,
        humanReviewRequired: true,
      }),
    });
  });

  it('does not persist a claim when the assessment provider fails', async () => {
    mockCreate.mockRejectedValueOnce(new Error('provider unavailable'));

    await expect(service.assess(dto)).rejects.toMatchObject({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'ASSESSMENT_PROVIDER_UNAVAILABLE',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not expose provider credentials or response details to callers', async () => {
    mockCreate.mockRejectedValueOnce(
      new Error('provider error containing sensitive diagnostic details'),
    );

    let thrown: unknown;
    try {
      await service.assess(dto);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiException);
    expect((thrown as ApiException).message).toBe(
      'The assessment provider is temporarily unavailable. Please try again.',
    );
    expect((thrown as ApiException).message).not.toContain('sensitive diagnostic details');
  });
});

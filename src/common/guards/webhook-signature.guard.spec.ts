import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WebhookSignatureGuard } from './webhook-signature.guard';
import * as crypto from 'crypto';

describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  const testAppSecret = 'test-app-secret';

  const createMockExecutionContext = (
    signature: string | undefined,
    rawBody: Buffer | string | undefined,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            'x-hub-signature-256': signature,
          },
          rawBody,
        }),
      }),
    } as ExecutionContext;
  };

  const generateValidSignature = (payload: string, secret: string): string => {
    return (
      'sha256=' +
      crypto.createHmac('sha256', secret).update(payload).digest('hex')
    );
  };

  describe('with app secret configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(testAppSecret),
            },
          },
        ],
      }).compile();

      guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);
    });

    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should allow request with valid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = generateValidSignature(payload, testAppSecret);
      const context = createMockExecutionContext(signature, payload);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw UnauthorizedException for missing signature', () => {
      const context = createMockExecutionContext(undefined, 'test payload');

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Missing webhook signature');
    });

    it('should throw UnauthorizedException for missing raw body', () => {
      const signature = generateValidSignature('test', testAppSecret);
      const context = createMockExecutionContext(signature, undefined);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Cannot verify webhook signature');
    });

    it('should throw UnauthorizedException for invalid signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const invalidSignature = 'sha256=invalid-signature-hash';
      const context = createMockExecutionContext(invalidSignature, payload);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(context)).toThrow('Invalid webhook signature');
    });

    it('should throw UnauthorizedException for tampered payload', () => {
      const originalPayload = JSON.stringify({ test: 'data' });
      const tamperedPayload = JSON.stringify({ test: 'tampered' });
      const signature = generateValidSignature(originalPayload, testAppSecret);
      const context = createMockExecutionContext(signature, tamperedPayload);

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should work with Buffer payload', () => {
      const payload = JSON.stringify({ test: 'data' });
      const buffer = Buffer.from(payload);
      const signature = generateValidSignature(payload, testAppSecret);
      const context = createMockExecutionContext(signature, buffer);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('without app secret configured', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebhookSignatureGuard,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(''),
            },
          },
        ],
      }).compile();

      guard = module.get<WebhookSignatureGuard>(WebhookSignatureGuard);
    });

    it('should allow request without verification when no secret is configured', () => {
      const context = createMockExecutionContext(undefined, 'test');

      // Should return true (skip verification) when no secret is configured
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});

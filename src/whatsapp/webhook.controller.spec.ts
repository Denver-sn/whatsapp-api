import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WhatsappService } from './whatsapp.service';
import { WebhooksService } from '../services/webhooks.service';
import { ConversationsService } from '../services/conversations.service';
import { MessageStatusService } from '../services/message-status.service';

describe('WebhookController', () => {
  let controller: WebhookController;
  let whatsappService: WhatsappService;
  let webhooksService: WebhooksService;
  let conversationsService: ConversationsService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'WHATSAPP_WEBHOOK_VERIFY_TOKEN') {
        return 'test-verify-token';
      }
      return null;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'WHATSAPP_WEBHOOK_VERIFY_TOKEN') {
        return 'test-verify-token';
      }
      throw new Error(`Configuration key "${key}" does not exist`);
    }),
  };

  const mockWhatsappService = {
    processIncomingMessage: jest.fn(),
    handleIncomingMessage: jest.fn(),
  };

  const mockWebhooksService = {
    addWebhook: jest.fn().mockResolvedValue({}),
    updateStatus: jest.fn().mockResolvedValue({}),
  };

  const mockConversationsService = {
    findByPhoneNumber: jest.fn(),
    addMessage: jest.fn(),
    create: jest.fn(),
  };

  const mockMessageStatusService = {
    createMessageStatus: jest.fn().mockResolvedValue({}),
    updateStatus: jest.fn().mockResolvedValue({}),
    getByMessageId: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WhatsappService, useValue: mockWhatsappService },
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: ConversationsService, useValue: mockConversationsService },
        { provide: MessageStatusService, useValue: mockMessageStatusService },
      ],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    whatsappService = module.get<WhatsappService>(WhatsappService);
    webhooksService = module.get<WebhooksService>(WebhooksService);
    conversationsService = module.get<ConversationsService>(ConversationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verifyWebhook', () => {
    it('should return challenge when verification succeeds', () => {
      const result = controller.verifyWebhook(
        'subscribe',
        'test-verify-token',
        'challenge-string-123',
      );

      expect(result).toBe('challenge-string-123');
    });

    it('should throw 403 when mode is not subscribe', () => {
      expect(() =>
        controller.verifyWebhook('unsubscribe', 'test-verify-token', 'challenge'),
      ).toThrow(HttpException);

      try {
        controller.verifyWebhook('unsubscribe', 'test-verify-token', 'challenge');
      } catch (error: unknown) {
        const err = error as HttpException;
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });

    it('should throw 403 when token is invalid', () => {
      expect(() =>
        controller.verifyWebhook('subscribe', 'wrong-token', 'challenge'),
      ).toThrow(HttpException);

      try {
        controller.verifyWebhook('subscribe', 'wrong-token', 'challenge');
      } catch (error: unknown) {
        const err = error as HttpException;
        expect(err.getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });
  });

  describe('receiveWebhook', () => {
    it('should return ignored status when no value in webhook', async () => {
      const result = await controller.receiveWebhook({
        entry: [{ changes: [{}] }],
      });

      expect(result).toEqual({
        status: 'ignored',
        message: 'No value in webhook data',
      });
    });

    it('should process incoming message', async () => {
      const webhookData = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid.test',
                      from: '221777460452',
                      timestamp: '1699999999',
                      type: 'text',
                      text: { body: 'Hello' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'John Doe' },
                      wa_id: '221777460452',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const processedMessage = {
        id: 'wamid.test',
        from: '221777460452',
        timestamp: '1699999999',
        type: 'text',
        text: 'Hello',
        contact: { name: 'John Doe', wa_id: '221777460452' },
      };

      mockWhatsappService.processIncomingMessage.mockReturnValue(processedMessage);
      mockConversationsService.findByPhoneNumber.mockResolvedValue(null);
      mockConversationsService.create.mockResolvedValue({});

      const result = await controller.receiveWebhook(webhookData);

      expect(result).toEqual({ status: 'ok' });
      expect(webhooksService.addWebhook).toHaveBeenCalledWith(
        'message',
        webhookData.entry[0].changes[0].value,
      );
      expect(whatsappService.handleIncomingMessage).toHaveBeenCalledWith(processedMessage);
    });

    it('should update existing conversation for incoming message', async () => {
      const webhookData = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid.test',
                      from: '221777460452',
                      timestamp: '1699999999',
                      type: 'text',
                      text: { body: 'Hello again' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'John Doe' },
                      wa_id: '221777460452',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const processedMessage = {
        id: 'wamid.test',
        from: '221777460452',
        timestamp: '1699999999',
        type: 'text',
        text: 'Hello again',
        contact: { name: 'John Doe', wa_id: '221777460452' },
      };

      const existingConversation = {
        id: 'conv123',
        contact: { phoneNumber: '221777460452' },
      };

      mockWhatsappService.processIncomingMessage.mockReturnValue(processedMessage);
      mockConversationsService.findByPhoneNumber.mockResolvedValue(existingConversation);
      mockConversationsService.addMessage.mockResolvedValue({});

      const result = await controller.receiveWebhook(webhookData);

      expect(result).toEqual({ status: 'ok' });
      expect(conversationsService.addMessage).toHaveBeenCalledWith(
        'conv123',
        expect.objectContaining({
          content: 'Hello again',
          direction: 'incoming',
        }),
      );
    });

    it('should process status updates', async () => {
      const webhookData = {
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    {
                      id: 'wamid.test',
                      status: 'delivered',
                      timestamp: '1699999999',
                      recipient_id: '221777460452',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = await controller.receiveWebhook(webhookData);

      expect(result).toEqual({ status: 'ok' });
      expect(webhooksService.addWebhook).toHaveBeenCalledWith(
        'status',
        webhookData.entry[0].changes[0].value,
      );
      expect(mockMessageStatusService.updateStatus).toHaveBeenCalledWith(
        'wamid.test',
        'delivered',
        expect.any(Date),
        undefined,
        undefined,
      );
      expect(webhooksService.updateStatus).toHaveBeenCalledWith('wamid.test', 'delivered');
    });

    it('should return error status on exception', async () => {
      const webhookData = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid.test',
                      from: '221777460452',
                      timestamp: '1699999999',
                      type: 'text',
                      text: { body: 'Error test' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      mockWhatsappService.processIncomingMessage.mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = await controller.receiveWebhook(webhookData);

      expect(result).toEqual({
        status: 'error',
        message: 'Test error',
      });
    });
  });

  describe('testWebhook', () => {
    it('should return test response', () => {
      const result = controller.testWebhook();

      expect(result).toEqual({
        message: 'Webhook endpoint is working!',
        timestamp: expect.any(String),
        verifyToken: 'configured',
      });
    });
  });
});

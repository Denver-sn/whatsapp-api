import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { WhatsappService } from './whatsapp.service';
import { ConversationsService } from '../services/conversations.service';
import { WebhooksService } from '../services/webhooks.service';
import { MessageType } from './dto/send-message.dto';

describe('WhatsappService', () => {
  let service: WhatsappService;
  let httpService: HttpService;
  let webhooksService: WebhooksService;
  let conversationsService: ConversationsService;

  const mockConfigService = {
    getOrThrow: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        WHATSAPP_ACCESS_TOKEN: 'test-token',
        WHATSAPP_PHONE_NUMBER_ID: '123456789',
        WHATSAPP_API_VERSION: 'v18.0',
      };
      return config[key] || defaultValue;
    }),
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        WHATSAPP_ACCESS_TOKEN: 'test-token',
        WHATSAPP_PHONE_NUMBER_ID: '123456789',
      };
      return config[key];
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockWebhooksService = {
    addWebhook: jest.fn().mockResolvedValue({}),
  };

  const mockConversationsService = {
    findByPhoneNumber: jest.fn(),
    addMessage: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: WebhooksService, useValue: mockWebhooksService },
        { provide: ConversationsService, useValue: mockConversationsService },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
    httpService = module.get<HttpService>(HttpService);
    webhooksService = module.get<WebhooksService>(WebhooksService);
    conversationsService = module.get<ConversationsService>(ConversationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    const mockResponse = {
      data: {
        messaging_product: 'whatsapp',
        contacts: [{ wa_id: '221777460452' }],
        messages: [{ id: 'wamid.test123' }],
      },
    };

    it('should send a text message successfully', async () => {
      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.sendMessage({
        to: '221777460452',
        message: 'Hello World',
        type: MessageType.TEXT,
      });

      expect(result).toEqual(mockResponse.data);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '221777460452',
          type: 'text',
          text: { body: 'Hello World' },
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
      expect(webhooksService.addWebhook).toHaveBeenCalledWith(
        'message_sent',
        expect.any(Object),
      );
    });

    it('should throw HttpException on API error', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: {
            status: 400,
            data: { error: { message: 'Invalid phone number' } },
          },
        })),
      );

      await expect(
        service.sendMessage({
          to: 'invalid',
          message: 'Test',
          type: MessageType.TEXT,
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('sendTextMessage', () => {
    it('should call sendMessage with text type', async () => {
      const mockResponse = { data: { messages: [{ id: 'test' }] } };
      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.sendTextMessage('221777460452', 'Hello');

      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('sendTemplateMessage', () => {
    it('should send template message successfully', async () => {
      const mockResponse = { data: { messages: [{ id: 'test' }] } };
      mockHttpService.post.mockReturnValue(of(mockResponse));
      mockConversationsService.findByPhoneNumber.mockResolvedValue({
        id: 'conv123',
        contact: { phoneNumber: '221777460452' },
      });

      const result = await service.sendTemplateMessage(
        '221777460452',
        'hello_world',
        'fr',
      );

      expect(result).toEqual(mockResponse.data);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/messages'),
        expect.objectContaining({
          type: 'template',
          template: expect.objectContaining({
            name: 'hello_world',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('processIncomingMessage', () => {
    it('should process incoming message correctly', () => {
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

      const result = service.processIncomingMessage(webhookData);

      expect(result).toEqual({
        id: 'wamid.test',
        from: '221777460452',
        timestamp: '1699999999',
        type: 'text',
        text: 'Hello',
        contact: {
          name: 'John Doe',
          wa_id: '221777460452',
        },
      });
    });

    it('should return null for invalid webhook data', () => {
      const result = service.processIncomingMessage({});
      expect(result).toBeNull();
    });

    it('should return null when no messages in webhook', () => {
      const webhookData = {
        entry: [{ changes: [{ value: {} }] }],
      };

      const result = service.processIncomingMessage(webhookData);
      expect(result).toBeNull();
    });
  });

  describe('handleIncomingMessage', () => {
    const mockMessage = {
      id: 'wamid.test',
      from: '221777460452',
      timestamp: '1699999999',
      type: 'text',
      text: 'Hello',
      contact: { name: 'John', wa_id: '221777460452' },
    };

    it('should update existing conversation', async () => {
      mockConversationsService.findByPhoneNumber.mockResolvedValue({
        id: 'conv123',
      });
      mockConversationsService.addMessage.mockResolvedValue({});
      const mockResponse = { data: { messages: [{ id: 'test' }] } };
      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.handleIncomingMessage(mockMessage);

      expect(conversationsService.addMessage).toHaveBeenCalledWith(
        'conv123',
        expect.objectContaining({
          content: 'Hello',
          direction: 'incoming',
        }),
      );
    });

    it('should create new conversation if not exists', async () => {
      mockConversationsService.findByPhoneNumber.mockResolvedValue(null);
      mockConversationsService.create.mockResolvedValue({});
      const mockResponse = { data: { messages: [{ id: 'test' }] } };
      mockHttpService.post.mockReturnValue(of(mockResponse));

      await service.handleIncomingMessage(mockMessage);

      expect(conversationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contact: { name: 'John', phoneNumber: '221777460452' },
          unreadCount: 1,
        }),
      );
    });
  });
});

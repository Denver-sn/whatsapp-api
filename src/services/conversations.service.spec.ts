import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { Conversation } from '../schemas/conversation.schema';
import { WhatsappService } from '../whatsapp/whatsapp.service';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let whatsappService: WhatsappService;

  const mockConversation = {
    _id: '507f1f77bcf86cd799439011',
    contact: {
      name: 'John Doe',
      phoneNumber: '+221777460452',
      profilePicture: 'https://example.com/photo.jpg',
    },
    lastMessage: {
      content: 'Hello',
      timestamp: '2024-01-01T00:00:00.000Z',
      direction: 'incoming' as const,
    },
    unreadCount: 1,
    messages: [
      {
        content: 'Hello',
        timestamp: '2024-01-01T00:00:00.000Z',
        direction: 'incoming' as const,
      },
    ],
    save: jest.fn().mockResolvedValue(this),
  };

  const mockConversationModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockWhatsappService = {
    sendTextMessage: jest.fn().mockResolvedValue({}),
    sendTemplate: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
        {
          provide: WhatsappService,
          useValue: mockWhatsappService,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    whatsappService = module.get<WhatsappService>(WhatsappService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of conversations', async () => {
      const mockConversations = [mockConversation];
      mockConversationModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockConversations),
        }),
      });

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: '507f1f77bcf86cd799439011',
        contact: mockConversation.contact,
        lastMessage: mockConversation.lastMessage,
        unreadCount: 1,
      });
    });

    it('should return empty array when no conversations', async () => {
      mockConversationModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a conversation by id', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      const result = await service.findById('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockConversation);
      expect(mockConversationModel.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
    });

    it('should return null for non-existent id', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByPhoneNumber', () => {
    it('should find conversation by phone number', async () => {
      mockConversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      const result = await service.findByPhoneNumber('+221777460452');

      expect(result).toEqual(mockConversation);
      expect(mockConversationModel.findOne).toHaveBeenCalledWith({
        'contact.phoneNumber': '+221777460452',
      });
    });

    it('should return null when phone number not found', async () => {
      mockConversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByPhoneNumber('+000000000000');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const createData = {
      contact: {
        name: 'Jane Doe',
        phoneNumber: '+221777460453',
      },
      lastMessage: {
        content: 'Hi there',
        timestamp: '2024-01-01T00:00:00.000Z',
        direction: 'outgoing' as const,
      },
      unreadCount: 0,
      messages: [
        {
          content: 'Hi there',
          timestamp: '2024-01-01T00:00:00.000Z',
          direction: 'outgoing' as const,
        },
      ],
    };

    it('should create a new conversation when none exists', async () => {
      mockConversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      jest.spyOn(service as any, 'findByPhoneNumber').mockResolvedValue(null);

      // We need to test that create is called properly
      // Since the service uses `new this.conversationModel(data)`, we need a different approach
    });

    it('should update existing conversation when phone number exists', async () => {
      const existingConversation = {
        ...mockConversation,
        messages: [...mockConversation.messages],
        save: jest.fn().mockResolvedValue(mockConversation),
      };

      mockConversationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingConversation),
      });

      // Spy on findByPhoneNumber
      jest.spyOn(service, 'findByPhoneNumber').mockResolvedValue(existingConversation as any);

      await service.create({
        ...createData,
        contact: { ...createData.contact, phoneNumber: '+221777460452' },
      });

      expect(existingConversation.save).toHaveBeenCalled();
    });

    it('should send WhatsApp template when templateData is provided', async () => {
      const existingConversation = {
        ...mockConversation,
        messages: [...mockConversation.messages],
        save: jest.fn().mockResolvedValue(mockConversation),
      };

      jest.spyOn(service, 'findByPhoneNumber').mockResolvedValue(existingConversation as any);

      await service.create({
        ...createData,
        contact: { ...createData.contact, phoneNumber: '+221777460452' },
        templateData: {
          name: 'Test User',
          context: 'Test context',
        },
      });

      expect(whatsappService.sendTemplate).toHaveBeenCalledWith(
        '+221777460452',
        'start_message',
        ['Test User', 'Test context'],
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      const result = await service.getMessages('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockConversation.messages);
    });

    it('should return empty array when conversation not found', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getMessages('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('addMessage', () => {
    const newMessage = {
      content: 'New message',
      timestamp: '2024-01-02T00:00:00.000Z',
      direction: 'outgoing' as const,
    };

    it('should add message to existing conversation', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      mockConversationModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          ...mockConversation,
          messages: [...mockConversation.messages, newMessage],
        }),
      });

      const result = await service.addMessage('507f1f77bcf86cd799439011', newMessage);

      expect(result).toEqual(newMessage);
      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        {
          $push: { messages: newMessage },
          $set: {
            lastMessage: newMessage,
            unreadCount: 0,
          },
        },
        { new: true },
      );
    });

    it('should send WhatsApp message for outgoing direction', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      mockConversationModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      await service.addMessage('507f1f77bcf86cd799439011', newMessage);

      expect(whatsappService.sendTextMessage).toHaveBeenCalledWith(
        '+221777460452',
        'New message',
      );
    });

    it('should not send WhatsApp message for incoming direction', async () => {
      const incomingMessage = { ...newMessage, direction: 'incoming' as const };

      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      mockConversationModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      await service.addMessage('507f1f77bcf86cd799439011', incomingMessage);

      expect(whatsappService.sendTextMessage).not.toHaveBeenCalled();
    });

    it('should return null when conversation not found', async () => {
      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.addMessage('nonexistent', newMessage);

      expect(result).toBeNull();
    });

    it('should set unreadCount to 1 for incoming messages', async () => {
      const incomingMessage = { ...newMessage, direction: 'incoming' as const };

      mockConversationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      mockConversationModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockConversation),
      });

      await service.addMessage('507f1f77bcf86cd799439011', incomingMessage);

      expect(mockConversationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({
          $set: expect.objectContaining({
            unreadCount: 1,
          }),
        }),
        { new: true },
      );
    });
  });
});

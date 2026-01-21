export interface WhatsappApiResponse {
  messaging_product: string;
  contacts: Contact[];
  messages: MessageStatus[];
}

export interface Contact {
  input: string;
  wa_id: string;
}

export interface MessageStatus {
  id: string;
  message_status?: string;
}

export interface WhatsappMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text: string;
  contact: {
    name: string;
    wa_id: string;
  };
  // Media fields (optional, based on message type)
  media?: {
    id?: string;
    mimeType?: string;
    sha256?: string;
    caption?: string;
    filename?: string;
  };
}

export interface MediaPayload {
  link?: string;
  id?: string;
  caption?: string;
  filename?: string;
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: {
      name: string;
    };
    wa_id: string;
  }>;
  messages?: Array<{
    from: string;
    id: string;
    timestamp: string;
    text?: {
      body: string;
    };
    type: string;
    // Media message fields
    image?: {
      id: string;
      mime_type: string;
      sha256: string;
      caption?: string;
    };
    video?: {
      id: string;
      mime_type: string;
      sha256: string;
      caption?: string;
    };
    audio?: {
      id: string;
      mime_type: string;
      sha256: string;
    };
    document?: {
      id: string;
      mime_type: string;
      sha256: string;
      filename?: string;
      caption?: string;
    };
    sticker?: {
      id: string;
      mime_type: string;
      sha256: string;
    };
    // Location message
    location?: {
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    };
  }>;
  statuses?: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
  }>;
}

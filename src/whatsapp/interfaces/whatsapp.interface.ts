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
  }>;
  statuses?: Array<{
    id: string;
    status: string;
    timestamp: string;
    recipient_id: string;
  }>;
}

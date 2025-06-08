export interface Webhook {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
  status: "processed" | "pending" | "failed";
}

export interface WebhookStats {
  total: number;
  processed: number;
  pending: number;
  failed: number;
}

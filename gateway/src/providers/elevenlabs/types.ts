import { z } from 'zod';

export interface ELOutboundCallRequest {
  agent_id: string;
  agent_phone_number_id: string;
  to_number: string;
  conversation_initiation_client_data: {
    type: 'conversation_initiation_client_data';
    dynamic_variables: Record<string, string>;
  };
}

export interface ELOutboundCallResponse {
  conversation_id: string;
  [key: string]: unknown;
}

export interface ELTranscriptResponse {
  conversation_id: string;
  status: string;
  transcript: Array<{
    role: 'agent' | 'user';
    message: string;
    time_in_call_secs: number;
  }>;
  metadata?: {
    start_time_unix_secs?: number;
    call_duration_secs?: number;
  };
}

export interface ELWebhookMessage {
  role: 'agent' | 'user';
  message: string;
  time_in_call_secs: number;
}

export interface ELWebhookPayload {
  type: string;
  event_timestamp: number;
  data: {
    conversation_id: string;
    agent_id: string;
    status: string;
    transcript: ELWebhookMessage[];
    metadata?: {
      start_time_unix_secs?: number;
      call_duration_secs?: number;
      recording_url?: string;
    };
    analysis?: {
      data_collection_results?: Record<string, { value?: string }>;
    };
  };
}

/**
 * Runtime schema for the inbound ElevenLabs webhook.
 *
 * The TypeScript interface above is a compile-time fiction: express hands us
 * `req.body` as `any`, and ElevenLabs has been observed to deliver payloads with
 * a missing or renamed `data` envelope. Without this boundary the parser throws
 * on `body.data.metadata`, the route swallows the error, and the provider is
 * told 200 OK while the transcript is lost forever.
 */
export const ELWebhookSchema = z.object({
  type: z.string().optional(),
  event_timestamp: z.number().optional(),
  data: z.object({
    conversation_id: z.string().min(1),
    agent_id: z.string().optional(),
    status: z.string().optional(),
    transcript: z
      .array(
        z.object({
          role: z.string(),
          message: z.string(),
          time_in_call_secs: z.number().optional().default(0),
        }),
      )
      .optional()
      .default([]),
    metadata: z
      .object({
        start_time_unix_secs: z.number().optional(),
        call_duration_secs: z.number().optional(),
        recording_url: z.string().optional(),
      })
      .optional(),
    analysis: z
      .object({
        data_collection_results: z
          .record(z.string(), z.object({ value: z.string().optional() }).passthrough())
          .optional(),
      })
      .optional(),
  }),
});

export type ELWebhookBody = z.infer<typeof ELWebhookSchema>;

import { WebhookPayload, TranscriptData, CallStatus } from '../types';
import redisService from './redisService';

class WebhookService {
  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const { lead_id, conversation_id, transcript, status } = payload;

      const transcriptData: TranscriptData = {
        leadId: lead_id,
        conversationId: conversation_id,
        status: status,
        messages: transcript.map(msg => ({
          speaker: msg.speaker,
          text: msg.text,
          timestamp: new Date(msg.timestamp),
        })),
      };

      await redisService.saveTranscript(lead_id, transcriptData);

      await redisService.updateCallStatus(lead_id, this.mapStatus(status));

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapStatus(webhookStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      'ringing': 'in_progress',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'failed',
      'no-answer': 'failed',
    };

    return statusMap[webhookStatus.toLowerCase()] || 'completed';
  }

  async verifyWebhookSignature(signature: string, body: string): Promise<boolean> {
    const webhookSecret = import.meta.env.VITE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured');
      return true;
    }

    // Note: crypto.subtle is available in browsers
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  }
}

export const webhookService = new WebhookService();
export default webhookService;

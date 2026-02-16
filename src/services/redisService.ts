import { LeadFormData, CallStatus, TranscriptData } from '../types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

class RedisService {
  private async fetchAPI(url: string, options?: RequestInit) {
    const response = await fetch(`${BACKEND_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    if (response.status === 404) {
      return null;
    }

    return await response.json();
  }

  async saveLead(leadId: string, data: LeadFormData, _ttlSeconds: number = 86400): Promise<void> {
    await this.fetchAPI('/api/lead', {
      method: 'POST',
      body: JSON.stringify({ leadId, data }),
    });
  }

  async getLead(leadId: string): Promise<LeadFormData | null> {
    const result = await this.fetchAPI(`/api/lead/${leadId}`);
    return result ? result.data : null;
  }

  async updateCallStatus(leadId: string, status: CallStatus): Promise<void> {
    await this.fetchAPI(`/api/status/${leadId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getCallStatus(leadId: string): Promise<string | null> {
    const result = await this.fetchAPI(`/api/status/${leadId}`);
    return result ? result.status : null;
  }

  async saveTranscript(leadId: string, transcript: TranscriptData, _ttlSeconds: number = 86400): Promise<void> {
    await this.fetchAPI(`/api/transcript/${leadId}`, {
      method: 'POST',
      body: JSON.stringify(transcript),
    });
  }

  async getTranscript(leadId: string): Promise<TranscriptData | null> {
    return await this.fetchAPI(`/api/transcript/${leadId}`);
  }

  async saveConversationId(leadId: string, conversationId: string, _ttlSeconds: number = 86400): Promise<void> {
    await this.fetchAPI(`/api/conversation/${leadId}`, {
      method: 'POST',
      body: JSON.stringify({ conversationId }),
    });
  }

  async getConversationId(leadId: string): Promise<string | null> {
    const result = await this.fetchAPI(`/api/conversation/${leadId}`);
    return result ? result.conversationId : null;
  }

  async deleteLead(_leadId: string): Promise<void> {
    // Not implemented in backend yet, but keeping for interface compatibility
    console.warn('deleteLead not yet implemented in backend API');
  }

  async getAllLeads(): Promise<Array<{ leadId: string; data: LeadFormData; status: string }>> {
    // Not implemented in backend yet
    console.warn('getAllLeads not yet implemented in backend API');
    return [];
  }

  // Legacy methods for compatibility - no longer needed
  async connect(): Promise<void> {
    // No-op: using HTTP API instead of direct Redis connection
  }
}

export const redisService = new RedisService();
export default redisService;

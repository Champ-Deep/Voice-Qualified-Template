import { VoiceAPIRequest, TranscriptData, LeadFormData } from '../types';

const API_URL = import.meta.env.VITE_VOICE_API_URL || 'https://api.elevenlabs.io/v1';
const API_KEY = import.meta.env.VITE_VOICE_API_KEY || '';
const AGENT_ID = import.meta.env.VITE_AGENT_ID || 'agent_3501kf4e3ak0eqkrxg1rttttk881';
const PHONE_NUMBER_ID = import.meta.env.VITE_PHONE_NUMBER_ID || 'phnum_4901kg4yjvgpetqbeknvhgm1stk4';

class VoiceService {
  private headers: HeadersInit;

  constructor() {
    this.headers = {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    };
  }

  async initiateCall(formData: LeadFormData, leadId: string): Promise<any> {
    const request: VoiceAPIRequest = {
      agent_id: AGENT_ID,
      agent_phone_number_id: PHONE_NUMBER_ID,
      to_number: formData.phoneNumber,
      conversation_initiation_client_data: {
        type: 'conversation_initiation_client_data',
        dynamic_variables: {
          lead_name: formData.username,
          leadId: leadId,
          company: formData.companyName,
          email: formData.companyEmail,
        },
      },
    };

    try {
      const response = await fetch(`${API_URL}/convai/twilio/outbound-call`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice API Error:', error);
      throw error;
    }
  }

  async getCallStatus(conversationId: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/convai/conversations/${conversationId}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to get call status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting call status:', error);
      throw error;
    }
  }

  async getTranscript(conversationId: string): Promise<TranscriptData | null> {
    try {
      const response = await fetch(`${API_URL}/convai/conversations/${conversationId}`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get transcript: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform the response to match our TranscriptData interface
      if (data.transcript && data.transcript.length > 0) {
        return {
          leadId: '', // Will be set by the caller
          conversationId: data.conversation_id,
          status: data.status || 'completed',
          messages: data.transcript.map((msg: any) => ({
            speaker: msg.role === 'agent' ? 'agent' : 'lead',
            text: msg.message,
            timestamp: new Date(msg.time_in_call_secs * 1000),
          })),
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting transcript:', error);
      throw error;
    }
  }

  async cancelCall(callId: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/conversational-ai/calls/${callId}`, {
        method: 'DELETE',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to cancel call: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error canceling call:', error);
      throw error;
    }
  }
}

export const voiceService = new VoiceService();
export default voiceService;

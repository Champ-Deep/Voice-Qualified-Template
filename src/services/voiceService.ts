import { TranscriptData, LeadFormData } from '../types';

// Call initiation goes through our own backend so the ElevenLabs API key
// never leaves the server. Only non-secret vars are read from VITE_ env.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const ELEVENLABS_API_URL = import.meta.env.VITE_VOICE_API_URL || 'https://api.elevenlabs.io/v1';

class VoiceService {
  // Initiate call via backend proxy — API key stays server-side
  async initiateCall(formData: LeadFormData, leadId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/calls/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, formData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Call initiation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Voice API Error:', error);
      throw error;
    }
  }

  async getCallStatus(conversationId: string): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversation-status/${conversationId}`);
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
      const response = await fetch(`${ELEVENLABS_API_URL}/convai/conversations/${conversationId}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to get transcript: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.transcript && data.transcript.length > 0) {
        return {
          leadId: '',
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
}

export const voiceService = new VoiceService();
export default voiceService;

export interface LeadFormData {
  username: string;
  companyName: string;
  companyEmail: string;
  phoneNumber: string;
}

export interface LeadRecord {
  leadId: string;
  data: LeadFormData;
  callStatus: CallStatus;
  createdAt: Date;
  transcript?: TranscriptData;
}

export type CallStatus = 'idle' | 'pending' | 'initiating' | 'initiated' | 'in_progress' | 'completed' | 'failed';

export interface TranscriptData {
  leadId: string;
  conversationId: string;
  status: string;
  messages: Array<{
    speaker: 'agent' | 'lead';
    text: string;
    timestamp: Date;
  }>;
}

export interface VoiceAPIRequest {
  agent_id: string;
  agent_phone_number_id: string;
  to_number: string;
  conversation_initiation_client_data: {
    type: 'conversation_initiation_client_data';
    dynamic_variables: {
      lead_name: string;
      leadId: string;
      company: string;
      email: string;
    };
  };
}

export interface WebhookPayload {
  lead_id: string;
  conversation_id: string;
  transcript: Array<{
    speaker: 'agent' | 'lead';
    text: string;
    timestamp: string;
  }>;
  status: string;
}

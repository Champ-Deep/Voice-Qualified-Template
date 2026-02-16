import { useState, useCallback } from 'react';
import { generateLeadId } from '../utils/leadIdGenerator';
import { validateForm } from '../utils/validation';
import redisService from '../services/redisService';
import voiceService from '../services/voiceService';
import { LeadFormData, CallStatus } from '../types';

interface UseLeadGenerationReturn {
  leadId: string | null;
  callStatus: CallStatus;
  isLoading: boolean;
  error: string | null;
  submitLead: (formData: LeadFormData) => Promise<boolean>;
  reset: () => void;
}

export const useLeadGeneration = (): UseLeadGenerationReturn => {
  const [leadId, setLeadId] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLead = useCallback(async (formData: LeadFormData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setError(Object.values(validationErrors)[0]);
      setIsLoading(false);
      return false;
    }

    try {
      const newLeadId = generateLeadId();

      await redisService.saveLead(newLeadId, formData);

      setLeadId(newLeadId);
      setCallStatus('initiating');

      await redisService.updateCallStatus(newLeadId, 'initiating');

      const callResponse = await voiceService.initiateCall(formData, newLeadId);

      // Store conversation ID for future polling fallback
      if (callResponse?.conversation_id) {
        await redisService.saveConversationId(newLeadId, callResponse.conversation_id);
      }

      setCallStatus('initiated');
      await redisService.updateCallStatus(newLeadId, 'initiated');

      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setCallStatus('failed');
      if (leadId) {
        await redisService.updateCallStatus(leadId, 'failed');
      }
      setIsLoading(false);
      return false;
    }
  }, [leadId]);

  const reset = useCallback(() => {
    setLeadId(null);
    setCallStatus('idle');
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    leadId,
    callStatus,
    isLoading,
    error,
    submitLead,
    reset,
  };
};

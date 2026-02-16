import { useState, useEffect, useCallback } from 'react';
import redisService from '../services/redisService';
import voiceService from '../services/voiceService';
import { TranscriptData } from '../types';

interface UseTranscriptReturn {
  transcript: TranscriptData | null;
  isLoading: boolean;
  error: string | null;
  refreshTranscript: () => Promise<void>;
  clearTranscript: () => void;
}

export const useTranscript = (leadId: string | null): UseTranscriptReturn => {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTranscript = useCallback(async () => {
    if (!leadId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try Redis first (webhook may have already delivered transcript)
      let data = await redisService.getTranscript(leadId);

      // If not in Redis, poll Voice API directly as fallback
      if (!data) {
        const conversationId = await redisService.getConversationId(leadId);
        if (conversationId) {
          try {
            const apiData = await voiceService.getTranscript(conversationId);
            if (apiData) {
              // Set the leadId in the transcript data
              apiData.leadId = leadId;
              // Cache in Redis for next poll
              await redisService.saveTranscript(leadId, apiData);
              data = apiData;
            }
          } catch (apiError) {
            // Silently fail API polling - webhook might still deliver
            console.log('API polling failed, waiting for webhook:', apiError);
          }
        }
      }

      setTranscript(data);
    } catch (err) {
      setError('Failed to fetch transcript');
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!leadId) {
      setTranscript(null);
      return;
    }

    fetchTranscript();

    const interval = setInterval(fetchTranscript, 5000);

    return () => clearInterval(interval);
  }, [leadId, fetchTranscript]);

  const clearTranscript = useCallback(() => {
    setTranscript(null);
    setError(null);
  }, []);

  return {
    transcript,
    isLoading,
    error,
    refreshTranscript: fetchTranscript,
    clearTranscript,
  };
};

import { useState, useEffect, useCallback } from 'react';
import redisService from '../services/redisService';
import { CallStatus } from '../types';

interface UseCallStatusReturn {
  status: CallStatus;
  lastUpdated: Date | null;
  isLoading: boolean;
  updateStatus: (newStatus: CallStatus) => Promise<void>;
  refreshStatus: () => Promise<void>;
}

export const useCallStatus = (leadId: string | null): UseCallStatusReturn => {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!leadId) return;

    setIsLoading(true);
    try {
      const statusStr = await redisService.getCallStatus(leadId);
      if (statusStr) {
        setStatus(statusStr as CallStatus);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch call status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  const updateStatus = useCallback(async (newStatus: CallStatus) => {
    if (!leadId) return;

    try {
      await redisService.updateCallStatus(leadId, newStatus);
      setStatus(newStatus);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to update call status:', err);
    }
  }, [leadId]);

  useEffect(() => {
    if (!leadId) {
      setStatus('idle');
      return;
    }

    fetchStatus();

    const interval = setInterval(fetchStatus, 3000);

    return () => clearInterval(interval);
  }, [leadId, fetchStatus]);

  return {
    status,
    lastUpdated,
    isLoading,
    updateStatus,
    refreshStatus: fetchStatus,
  };
};

import React from 'react';
import { CallStatus as CallStatusType } from '../../types';

interface CallStatusProps {
  status: CallStatusType;
  lastUpdated: Date | null;
}

const CallStatus: React.FC<CallStatusProps> = ({ status, lastUpdated }) => {
  const statusConfig: Record<CallStatusType, { color: string; icon: string }> = {
    'idle': { color: '#6b7280', icon: '⏸️' },
    'pending': { color: '#f59e0b', icon: '⏳' },
    'initiating': { color: '#3b82f6', icon: '📞' },
    'initiated': { color: '#10b981', icon: '✅' },
    'in_progress': { color: '#8b5cf6', icon: '🔄' },
    'completed': { color: '#059669', icon: '💯' },
    'failed': { color: '#ef4444', icon: '❌' },
  };

  const config = statusConfig[status] || statusConfig.idle;

  return (
    <div className="call-status-indicator" style={{ borderColor: config.color }}>
      <div className="status-icon">{config.icon}</div>
      <div className="status-info">
        <span className="status-label" style={{ color: config.color }}>
          {status.replace(/_/g, ' ').toUpperCase()}
        </span>
        {lastUpdated && (
          <span className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default CallStatus;

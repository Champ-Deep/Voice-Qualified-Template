import React from 'react';
import { CallStatus } from '../../types';

interface LeadDisplayProps {
  leadId: string;
  status: CallStatus;
}

const LeadDisplay: React.FC<LeadDisplayProps> = ({ leadId, status }) => {
  const getStatusColor = (status: CallStatus): string => {
    const colors: Record<CallStatus, string> = {
      'idle': '#6b7280',
      'pending': '#f59e0b',
      'initiating': '#3b82f6',
      'initiated': '#10b981',
      'in_progress': '#8b5cf6',
      'completed': '#059669',
      'failed': '#ef4444',
    };
    return colors[status] || colors.idle;
  };

  const getStatusLabel = (status: CallStatus): string => {
    const labels: Record<CallStatus, string> = {
      'idle': 'Ready',
      'pending': 'Pending',
      'initiating': 'Initiating...',
      'initiated': 'Call Started',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'failed': 'Failed',
    };
    return labels[status] || status;
  };

  return (
    <div className="lead-display">
      <div className="lead-id">
        <span className="label">Lead ID:</span>
        <span className="value">{leadId}</span>
      </div>
      <div className="call-status">
        <span className="label">Status:</span>
        <span className="status-badge" style={{ backgroundColor: getStatusColor(status) }}>
          {getStatusLabel(status)}
        </span>
      </div>
    </div>
  );
};

export default LeadDisplay;

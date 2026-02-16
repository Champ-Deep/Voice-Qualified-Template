import React from 'react';
import { useTranscript } from '../../hooks/useTranscript';

interface TranscriptViewerProps {
  leadId: string | null;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ leadId }) => {
  const { transcript, isLoading, error, refreshTranscript } = useTranscript(leadId);

  if (!leadId) {
    return null;
  }

  return (
    <div className="transcript-viewer">
      <div className="transcript-header">
        <h3>Call Transcript</h3>
        <button onClick={refreshTranscript} disabled={isLoading} className="refresh-button">
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!transcript && !isLoading && (
        <div className="no-transcript">
          <p>No transcript available yet. The transcript will appear after the call completes.</p>
        </div>
      )}

      {isLoading && !transcript && (
        <div className="loading">Loading transcript...</div>
      )}

      {transcript && (
        <div className="transcript-content">
          <div className="transcript-meta">
            <span>Conversation ID: {transcript.conversationId}</span>
            <span>Status: {transcript.status}</span>
          </div>

          <div className="transcript-messages">
            {transcript.messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.speaker === 'agent' ? 'agent' : 'lead'}`}
              >
                <span className="speaker-label">
                  {message.speaker === 'agent' ? 'AI Agent' : 'Lead'}
                </span>
                <p className="message-text">{message.text}</p>
                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TranscriptViewer;

# Eleven Labs Voice Agent Lead Management System

## Project Overview

A React-based frontend application for lead capture that generates unique lead IDs stored in Redis cache, initiates AI voice calls via Eleven Labs API directly from the frontend, and receives post-call transcripts through webhook callbacks for display.

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Cache Storage**: Redis (ioredis)
- **HTTP Client**: Axios / Native Fetch API
- **API Integration**: Eleven Labs Conversational AI

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   React Frontend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐   │
│  │ Lead Form   │  │ Lead ID      │  │ Transcript     │   │
│  │ Input       │  │ Generator    │  │ Display        │   │
│  └─────────────┘  └─────────────┘  └────────────────┘   │
│         │               │                  │             │
│         └───────────────┼──────────────────┘             │
│                         ▼                                 │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Frontend Service Layer                           │  │
│  │  - Redis Cache (Client-side/External)             │  │
│  │  - Eleven Labs API Direct Integration            │  │
│  │  - Webhook Receiver Endpoint (External)           │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Configuration (.env)

```env
REACT_APP_ELEVEN_LABS_API_URL=https://api.elevenlabs.io/v1
REACT_APP_ELEVEN_LABS_API_KEY=your_api_key_here
REACT_APP_AGENT_ID=agent_3501kf4e3ak0eqkrxg1rttttk881
REACT_APP_PHONE_NUMBER_ID=phnum_4901kg4yjvgpetqbeknvhgm1stk4
REACT_APP_REDIS_URL=redis://localhost:6379
REACT_APP_WEBHOOK_URL=https://your-webhook-receiver.com/api/callback
```

## Data Types (src/types/index.ts)

```typescript
interface LeadFormData {
  username: string;
  companyName: string;
  companyEmail: string;
  phoneNumber: string;
}

interface LeadRecord {
  leadId: string;
  data: LeadFormData;
  callStatus: CallStatus;
  createdAt: Date;
  transcript?: TranscriptData;
}

type CallStatus = 'idle' | 'pending' | 'initiating' | 'initiated' | 'in_progress' | 'completed' | 'failed';

interface TranscriptData {
  leadId: string;
  conversationId: string;
  status: string;
  messages: Array<{
    speaker: 'agent' | 'lead';
    text: string;
    timestamp: Date;
  }>;
}

interface ElevenLabsRequest {
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

interface WebhookPayload {
  lead_id: string;
  conversation_id: string;
  transcript: Array<{
    speaker: 'agent' | 'lead';
    text: string;
    timestamp: string;
  }>;
  status: string;
}
```

## Project Structure

```
/home/hemang/Desktop/template_Calling_V1/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── LeadForm/
│   │   │   ├── LeadForm.tsx
│   │   │   ├── LeadForm.css
│   │   │   └── LeadForm.test.tsx
│   │   ├── LeadDisplay/
│   │   │   ├── LeadDisplay.tsx
│   │   │   └── LeadDisplay.css
│   │   ├── TranscriptViewer/
│   │   │   ├── TranscriptViewer.tsx
│   │   │   └── TranscriptViewer.css
│   │   └── CallStatus/
│   │       ├── CallStatus.tsx
│   │       └── CallStatus.css
│   ├── services/
│   │   ├── redisService.ts
│   │   ├── elevenLabsService.ts
│   │   └── webhookService.ts
│   ├── hooks/
│   │   ├── useLeadGeneration.ts
│   │   ├── useCallStatus.ts
│   │   └── useTranscript.ts
│   ├── utils/
│   │   ├── leadIdGenerator.ts
│   │   └── validation.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── App.css
│   ├── index.tsx
│   └── index.css
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Core Services

### Redis Service (src/services/redisService.ts)

```typescript
import Redis from 'ioredis';

class RedisService {
  private redis: Redis | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const redisUrl = process.env.REACT_APP_REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  async connect(): Promise<void> {
    if (!this.redis) {
      await this.init();
    }
    if (this.redis?.status !== 'ready') {
      await this.redis?.connect();
    }
  }

  async saveLead(leadId: string, data: LeadFormData, ttlSeconds: number = 86400): Promise<void> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    await this.redis.setex(`lead:${leadId}`, ttlSeconds, JSON.stringify(data));
  }

  async getLead(leadId: string): Promise<LeadFormData | null> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    const data = await this.redis.get(`lead:${leadId}`);
    return data ? JSON.parse(data) : null;
  }

  async updateCallStatus(leadId: string, status: CallStatus): Promise<void> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    await this.redis.hset(`lead:status:${leadId}`, 'status', status, 'updatedAt', new Date().toISOString());
  }

  async getCallStatus(leadId: string): Promise<string | null> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    return await this.redis.hget(`lead:status:${leadId}`, 'status');
  }

  async saveTranscript(leadId: string, transcript: TranscriptData, ttlSeconds: number = 86400): Promise<void> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    await this.redis.setex(`transcript:${leadId}`, ttlSeconds, JSON.stringify(transcript));
  }

  async getTranscript(leadId: string): Promise<TranscriptData | null> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    const data = await this.redis.get(`transcript:${leadId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteLead(leadId: string): Promise<void> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    await this.redis.del(`lead:${leadId}`, `lead:status:${leadId}`, `transcript:${leadId}`);
  }

  async getAllLeads(): Promise<Array<{ leadId: string; data: LeadFormData; status: string }>> {
    await this.connect();
    if (!this.redis) throw new Error('Redis not initialized');
    const keys = await this.redis.keys('lead:*');
    const leads: Array<{ leadId: string; data: LeadFormData; status: string }> = [];

    for (const key of keys) {
      if (key.includes('lead:') && !key.includes('status:') && !key.includes('transcript:')) {
        const leadId = key.replace('lead:', '');
        const data = await this.getLead(leadId);
        const status = await this.getCallStatus(leadId);
        if (data) {
          leads.push({ leadId, data, status: status || 'unknown' });
        }
      }
    }

    return leads;
  }
}

export const redisService = new RedisService();
export default redisService;
```

### Eleven Labs API Service (src/services/elevenLabsService.ts)

```typescript
import { ElevenLabsRequest, TranscriptData } from '../types';

const API_URL = process.env.REACT_APP_ELEVEN_LABS_API_URL || 'https://api.elevenlabs.io/v1';
const API_KEY = process.env.REACT_APP_ELEVEN_LABS_API_KEY || '';
const AGENT_ID = process.env.REACT_APP_AGENT_ID || '';
const PHONE_NUMBER_ID = process.env.REACT_APP_PHONE_NUMBER_ID || '';

class ElevenLabsService {
  private headers: HeadersInit;

  constructor() {
    this.headers = {
      'Content-Type': 'application/json',
      'xi-api-key': API_KEY,
    };
  }

  async initiateCall(formData: LeadFormData, leadId: string): Promise<any> {
    const request: ElevenLabsRequest = {
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
      const response = await fetch(`${API_URL}/conversational-ai/calls`, {
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
      console.error('Eleven Labs API Error:', error);
      throw error;
    }
  }

  async getCallStatus(callId: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/conversational-ai/calls/${callId}`, {
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

  async getTranscript(callId: string): Promise<TranscriptData | null> {
    try {
      const response = await fetch(`${API_URL}/conversational-ai/calls/${callId}/transcript`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get transcript: ${response.statusText}`);
      }

      return await response.json();
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

export const elevenLabsService = new ElevenLabsService();
export default elevenLabsService;
```

### Webhook Service (src/services/webhookService.ts)

```typescript
import { WebhookPayload, TranscriptData } from '../types';
import redisService from './redisService';

class WebhookService {
  async handleWebhook(payload: WebhookPayload): Promise<{ success: boolean; message: string }> {
    try {
      const { lead_id, conversation_id, transcript, status } = payload;

      const transcriptData: TranscriptData = {
        leadId: lead_id,
        conversationId: conversation_id,
        status: status,
        messages: transcript.map(msg => ({
          speaker: msg.speaker,
          text: msg.text,
          timestamp: new Date(msg.timestamp),
        })),
      };

      await redisService.saveTranscript(lead_id, transcriptData);

      await redisService.updateCallStatus(lead_id, this.mapStatus(status));

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapStatus(webhookStatus: string): CallStatus {
    const statusMap: Record<string, CallStatus> = {
      'ringing': 'in_progress',
      'in-progress': 'in_progress',
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'failed',
      'no-answer': 'failed',
    };

    return statusMap[webhookStatus.toLowerCase()] || 'completed';
  }

  async verifyWebhookSignature(signature: string, body: string): Promise<boolean> {
    const webhookSecret = process.env.REACT_APP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('Webhook secret not configured');
      return true;
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  }
}

export const webhookService = new WebhookService();
export default webhookService;
```

## Utility Functions

### Lead ID Generator (src/utils/leadIdGenerator.ts)

```typescript
import { v4 as uuidv4 } from 'uuid';

export const generateLeadId = (): string => {
  const uuid = uuidv4();
  const shortUuid = uuid.split('-')[0];
  return `lead_${shortUuid}`;
};

export const isValidLeadId = (id: string): boolean => {
  return /^lead_[a-f0-9]{8}$/.test(id);
};

export const formatLeadId = (id: string): string => {
  return id.toLowerCase().trim();
};
```

### Validation Utilities (src/utils/validation.ts)

```typescript
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z\s]{2,50}$/;
  return usernameRegex.test(username.trim());
};

export const validateCompanyName = (company: string): boolean => {
  return company.trim().length >= 2 && company.trim().length <= 100;
};

export const validateForm = (formData: LeadFormData): Record<string, string> => {
  const errors: Record<string, string> = {};

  if (!validateUsername(formData.username)) {
    errors.username = 'Username must be 2-50 letters or spaces';
  }

  if (!validateCompanyName(formData.companyName)) {
    errors.companyName = 'Company name must be 2-100 characters';
  }

  if (!validateEmail(formData.companyEmail)) {
    errors.companyEmail = 'Please enter a valid email address';
  }

  if (!validatePhoneNumber(formData.phoneNumber)) {
    errors.phoneNumber = 'Please enter a valid phone number (E.164 format)';
  }

  return errors;
};
```

## Custom Hooks

### useLeadGeneration (src/hooks/useLeadGeneration.ts)

```typescript
import { useState, useCallback } from 'react';
import { generateLeadId } from '../utils/leadIdGenerator';
import { validateForm } from '../utils/validation';
import redisService from '../services/redisService';
import elevenLabsService from '../services/elevenLabsService';
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

      await elevenLabsService.initiateCall(formData, newLeadId);

      setCallStatus('initiated');
      await redisService.updateCallStatus(newLeadId, 'initiated');

      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setCallStatus('failed');
      await redisService.updateCallStatus(leadId || '', 'failed');
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
```

### useTranscript (src/hooks/useTranscript.ts)

```typescript
import { useState, useEffect, useCallback } from 'react';
import redisService from '../services/redisService';
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
      const data = await redisService.getTranscript(leadId);
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
```

### useCallStatus (src/hooks/useCallStatus.ts)

```typescript
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
```

## Components

### LeadForm Component (src/components/LeadForm/LeadForm.tsx)

```typescript
import React, { useState } from 'react';
import { LeadFormData } from '../../types';

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => Promise<void>;
  isLoading?: boolean;
}

const LeadForm: React.FC<LeadFormProps> = ({ onSubmit, isLoading: externalLoading }) => {
  const [formData, setFormData] = useState<LeadFormData>({
    username: '',
    companyName: '',
    companyEmail: '',
    phoneNumber: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResults = validateForm(formData);
    if (Object.keys(validationResults).length > 0) {
      setErrors(validationResults);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ username: '', companyName: '', companyEmail: '', phoneNumber: '' });
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = externalLoading || isSubmitting;

  return (
    <form onSubmit={validateAndSubmit} className="lead-form">
      <div className="form-group">
        <label htmlFor="username">Full Name</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="Enter your full name"
          disabled={isLoading}
        />
        {errors.username && <span className="error">{errors.username}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="companyName">Company Name</label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          value={formData.companyName}
          onChange={handleChange}
          placeholder="Enter company name"
          disabled={isLoading}
        />
        {errors.companyName && <span className="error">{errors.companyName}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="companyEmail">Company Email</label>
        <input
          type="email"
          id="companyEmail"
          name="companyEmail"
          value={formData.companyEmail}
          onChange={handleChange}
          placeholder="Enter company email"
          disabled={isLoading}
        />
        {errors.companyEmail && <span className="error">{errors.companyEmail}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phoneNumber">Phone Number</label>
        <input
          type="tel"
          id="phoneNumber"
          name="phoneNumber"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="+1234567890"
          disabled={isLoading}
        />
        {errors.phoneNumber && <span className="error">{errors.phoneNumber}</span>}
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Initiating Call...' : 'Start Call'}
      </button>
    </form>
  );
};

export default LeadForm;
```

### LeadDisplay Component (src/components/LeadDisplay/LeadDisplay.tsx)

```typescript
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
```

### TranscriptViewer Component (src/components/TranscriptViewer/TranscriptViewer.tsx)

```typescript
import React, { useEffect } from 'react';
import { TranscriptData } from '../../types';
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
        <button onClick={refreshTranscript} disabled={isLoading}>
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
                  {message.speaker === 'agent' ? '🤖 AI Agent' : '👤 Lead'}
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
```

### CallStatus Component (src/components/CallStatus/CallStatus.tsx)

```typescript
import React from 'react';
import { CallStatus } from '../../types';

interface CallStatusProps {
  status: CallStatus;
  lastUpdated: Date | null;
}

const CallStatus: React.FC<CallStatusProps> = ({ status, lastUpdated }) => {
  const statusConfig: Record<CallStatus, { color: string; icon: string }> = {
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
```

## Main App Component (src/App.tsx)

```typescript
import React from 'react';
import { useLeadGeneration } from './hooks/useLeadGeneration';
import LeadForm from './components/LeadForm/LeadForm';
import LeadDisplay from './components/LeadDisplay/LeadDisplay';
import TranscriptViewer from './components/TranscriptViewer/TranscriptViewer';
import './App.css';

const App: React.FC = () => {
  const {
    leadId,
    callStatus,
    isLoading,
    error,
    submitLead,
    reset,
  } = useLeadGeneration();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Eleven Labs Voice Agent</h1>
        <p>AI-Powered Lead Call Management System</p>
      </header>

      <main className="app-main">
        <section className="form-section">
          <LeadForm
            onSubmit={submitLead}
            isLoading={isLoading}
          />
          {error && <div className="error-message">{error}</div>}
        </section>

        {leadId && (
          <section className="result-section">
            <LeadDisplay leadId={leadId} status={callStatus} />
            <TranscriptViewer leadId={leadId} />
            <button className="reset-btn" onClick={reset}>
              New Call
            </button>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by Eleven Labs Conversational AI</p>
      </footer>
    </div>
  );
};

export default App;
```

## Webhook Receiver (api/webhook.ts)

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import webhookService from '../src/services/webhookService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const signature = req.headers['x-webhook-signature'] as string;
  const body = JSON.stringify(req.body);

  const isValid = await webhookService.verifyWebhookSignature(signature, body);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const result = await webhookService.handleWebhook(req.body);

  return res.status(200).json(result);
}
```

## Implementation Steps

### Phase 1: Project Setup (1-2 hours)

1. Initialize React TypeScript project:
   ```bash
   npx create-react-app . --template typescript
   # or
   npm create vite@latest . -- --template react-ts
   ```

2. Install dependencies:
   ```bash
   npm install axios ioredis uuid zustand class-validator
   npm install -D @types/uuid tailwindcss postcss autoprefixer @types/ioredis
   ```

3. Configure Tailwind CSS:
   ```bash
   npx tailwindcss init -p
   ```

4. Create environment files:
   ```bash
   cp .env.example .env
   ```

### Phase 2: Core Services (2-3 hours)

1. Create types definitions
2. Implement Redis service
3. Implement Eleven Labs API service
4. Implement Webhook service
5. Write unit tests for services

### Phase 3: Utility Functions (1 hour)

1. Create Lead ID generator
2. Create validation utilities
3. Write unit tests

### Phase 4: Custom Hooks (1-2 hours)

1. Implement useLeadGeneration hook
2. Implement useTranscript hook
3. Implement useCallStatus hook
4. Write unit tests

### Phase 5: Components (3-4 hours)

1. Build LeadForm component
2. Build LeadDisplay component
3. Build TranscriptViewer component
4. Build CallStatus component
5. Style all components

### Phase 6: Main App Integration (1-2 hours)

1. Integrate all components in App.tsx
2. Configure routing if needed
3. Add global styles

### Phase 7: Webhook Receiver (1 hour)

1. Set up Vercel/Netlify functions
2. Configure webhook endpoint
3. Test webhook integration

### Phase 8: Testing & Polish (2-3 hours)

1. Write integration tests
2. Fix bugs and edge cases
3. Optimize performance
4. Add loading states and error handling

### Phase 9: Deployment (1-2 hours)

1. Build for production
2. Deploy to Vercel/Netlify
3. Configure environment variables
4. Set up Redis instance

## Estimated Timeline

| Phase | Task | Duration |
|-------|------|----------|
| 1 | Project Setup | 1-2 hours |
| 2 | Core Services | 2-3 hours |
| 3 | Utility Functions | 1 hour |
| 4 | Custom Hooks | 1-2 hours |
| 5 | Components | 3-4 hours |
| 6 | App Integration | 1-2 hours |
| 7 | Webhook Receiver | 1 hour |
| 8 | Testing & Polish | 2-3 hours |
| 9 | Deployment | 1-2 hours |
| | **Total** | **14-21 hours** |

## Security Considerations

1. **API Key Protection**: Store all API keys in environment variables, never commit to version control
2. **Input Validation**: Validate all user inputs both on frontend and backend
3. **Webhook Verification**: Implement signature verification for webhook endpoints
4. **CORS Configuration**: Configure proper CORS headers if using backend proxy
5. **Rate Limiting**: Implement debouncing to prevent abuse
6. **Error Handling**: Don't expose sensitive information in error messages

## Environment Setup

### Redis Options

1. **Local Redis**:
   ```bash
   docker run --name redis -p 6379:6379 -d redis:alpine
   ```

2. **Redis Cloud**: Sign up at https://redis.com/cloud

3. **Upstash**: Serverless Redis at https://upstash.com

### Eleven Labs Setup

1. Get API key from https://elevenlabs.io
2. Create agent with ID: `agent_3501kf4e3ak0eqkrxg1rttttk881`
3. Configure phone number ID: `phnum_4901kg4yjvgpetqbeknvhgm1stk4`
4. Set up webhook URL in Eleven Labs dashboard

## Success Metrics

1. ✅ Lead form submits successfully with validation
2. ✅ Unique Lead ID generates and saves to Redis
3. ✅ Eleven Labs API call succeeds with correct payload
4. ✅ Dynamic variables pass correctly to AI agent
5. ✅ Webhook receives call completion data
6. ✅ Transcript displays in frontend
7. ✅ Call status updates in real-time via polling

## Next Steps

1. Review this plan
2. Set up development environment
3. Configure environment variables
4. Initialize React project
5. Begin implementation phase by phase
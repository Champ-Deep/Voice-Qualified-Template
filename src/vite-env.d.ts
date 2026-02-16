/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VOICE_API_URL: string;
  readonly VITE_VOICE_API_KEY: string;
  readonly VITE_AGENT_ID: string;
  readonly VITE_PHONE_NUMBER_ID: string;
  readonly VITE_REDIS_URL: string;
  readonly VITE_WEBHOOK_URL: string;
  readonly VITE_WEBHOOK_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import { Config } from '../config/schema.js';
import { IVoiceProvider } from './types.js';
import { ElevenLabsProvider } from './elevenlabs/client.js';

export class ProviderRegistry {
  private providers: Map<string, IVoiceProvider> = new Map();

  constructor(config: Config) {
    if (config.providers.elevenlabs) {
      this.providers.set('elevenlabs', new ElevenLabsProvider(config.providers.elevenlabs));
    }
  }

  get(name: string): IVoiceProvider {
    const p = this.providers.get(name);
    if (!p) {
      throw new Error(
        `Provider "${name}" is not configured. Run: champiq-voice config set ${name}.api_key <KEY>`
      );
    }
    return p;
  }

  has(name: string): boolean {
    return this.providers.has(name);
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

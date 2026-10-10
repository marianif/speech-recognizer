import type { PermissionsResult, TranscriptUpdateEvent } from './SpeechRecognizerModule';

// Web stub — there is no speech recognition implementation on web. Every
// method is a no-op (or rejects) so bundling for web keeps working while the
// API surface mirrors the native platforms.
export default {
  addListener(_eventName: string, _listener: (event: TranscriptUpdateEvent) => void) {
    return { remove: () => {} };
  },
  removeListener() {},
  async requestPermissions(): Promise<PermissionsResult> {
    return { speech: false, microphone: false };
  },
  async startRecognition(_locale?: string): Promise<void> {},
  async stopRecognition(): Promise<void> {},
  async transcribeFile(_fileUri: string, _locale?: string): Promise<string> {
    throw new Error('transcribeFile is not supported on web.');
  },
};

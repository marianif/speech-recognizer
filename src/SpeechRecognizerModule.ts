import { NativeModule, requireNativeModule } from 'expo-modules-core';

export type TranscriptUpdateEvent = {
  /** The current transcript, from the start of the session. */
  transcript: string;
  /** Whether this is the final event for the session (recognition ended). */
  isFinal: boolean;
  /** Present when the session ended with an error. */
  error?: string;
};

export type PermissionsResult = {
  /** Whether speech recognition is authorized (iOS) / available (Android). */
  speech: boolean;
  /** Whether microphone access is granted. */
  microphone: boolean;
};

export type SpeechRecognizerModuleEvents = {
  onTranscriptUpdate: (event: TranscriptUpdateEvent) => void;
};

declare class SpeechRecognizerNativeModule extends NativeModule<SpeechRecognizerModuleEvents> {
  /** Requests speech recognition and microphone permissions. */
  requestPermissions(): Promise<PermissionsResult>;
  /**
   * Starts live recognition. `locale` is a BCP-47 tag ("it-IT"); when it is
   * omitted or the platform has no recognizer for it, the system default (then
   * en-US) takes over.
   */
  startRecognition(locale?: string): Promise<void>;
  /**
   * Stops live recognition. A final `onTranscriptUpdate` event may still arrive
   * after this resolves.
   */
  stopRecognition(): Promise<void>;
  /**
   * Transcribes an audio file on the device, resolving with the final
   * transcript. iOS only — Android and web reject with an `UNSUPPORTED` error.
   * `locale` falls back to the system recognizer (then en-US) when omitted.
   */
  transcribeFile(fileUri: string, locale?: string): Promise<string>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<SpeechRecognizerNativeModule>('SpeechRecognizer');

import { useEventListener } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';

import SpeechRecognizer from './SpeechRecognizerModule';
import type { TranscriptUpdateEvent } from './SpeechRecognizerModule';

export type UseSpeechRecognitionOptions = {
  /**
   * BCP-47 locale tag used for recognition (e.g. "it-IT"). When omitted — or
   * when the platform has no recognizer for it — the system default (then
   * en-US) takes over.
   */
  locale?: string;
  /**
   * Request permissions and start recording automatically on mount.
   * Defaults to `false`.
   */
  autoStart?: boolean;
};

export type UseSpeechRecognitionReturn = {
  isRecording: boolean;
  transcript: string;
  permissionsGranted: boolean | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleRecording: () => Promise<void>;
};

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { autoStart = false, locale } = options;
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Whether the user *intends* to be recording. iOS auto-finalizes after a
  // brief silence, so a session can end within a second of landing if the user
  // hasn't started speaking yet. We keep this intent flag to auto-restart the
  // recognizer through that initial silence (see the event listener below).
  const wantsRecording = useRef(false);
  // Whether the current session has captured any speech. We only auto-restart
  // empty silent timeouts — once there are words, an empty final is intentional.
  const hasTranscript = useRef(false);
  // Pending auto-restart timer, so we can cancel it on unmount / manual stop.
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the auto-start effect so a single mount starts a single session,
  // even though `startRecording` gets a new identity when permissions change.
  const autoStarted = useRef(false);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    const result = await SpeechRecognizer.requestPermissions();
    const granted = result.speech && result.microphone;
    setPermissionsGranted(granted);
    return granted;
  }, []);

  // Low-level start: spins up native recognition and flips UI state. Does NOT
  // reset the transcript, so it can be reused to silently restart a session
  // that iOS auto-finalized during the opening silence.
  const beginRecognition = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      await SpeechRecognizer.startRecognition(locale);
      setIsRecording(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      console.error('[SpeechRecognizer] startRecognition failed:', message);
    }
  }, [locale]);

  const startRecording = useCallback(async (): Promise<void> => {
    if (!permissionsGranted) {
      const granted = await requestPermissions();
      if (!granted) return;
    }
    wantsRecording.current = true;
    hasTranscript.current = false;
    setTranscript('');
    await beginRecognition();
  }, [permissionsGranted, requestPermissions, beginRecognition]);

  const stopRecording = useCallback(async (): Promise<void> => {
    wantsRecording.current = false;
    if (restartTimer.current) {
      clearTimeout(restartTimer.current);
      restartTimer.current = null;
    }
    await SpeechRecognizer.stopRecognition();
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(async (): Promise<void> => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  useEffect(() => {
    if (autoStart && !autoStarted.current) {
      autoStarted.current = true;
      void startRecording();
    }
  }, [autoStart, startRecording]);

  useEffect(() => {
    return () => {
      wantsRecording.current = false;
      if (restartTimer.current) {
        clearTimeout(restartTimer.current);
        restartTimer.current = null;
      }
      SpeechRecognizer.stopRecognition();
    };
  }, []);

  useEventListener(
    SpeechRecognizer,
    'onTranscriptUpdate',
    (event: TranscriptUpdateEvent) => {
      if (event.error) {
        setError(event.error);
      }
      // Stopping recognition can deliver a final, empty-string event (the task
      // is cancelled before it finalizes). Never let that clobber a transcript
      // the user already dictated — only overwrite with non-empty text.
      if (event.transcript) {
        hasTranscript.current = true;
        setTranscript(event.transcript);
      }
      if (event.isFinal) {
        // iOS auto-finalizes after a brief silence. If that happens before the
        // user has said anything but they still intend to record (e.g. they
        // just landed on the screen), restart the session after a short delay
        // so the mic stays open instead of dying within a second.
        if (wantsRecording.current && !hasTranscript.current && !event.error) {
          restartTimer.current = setTimeout(() => {
            restartTimer.current = null;
            if (wantsRecording.current) {
              beginRecognition();
            }
          }, 400);
          return;
        }
        setIsRecording(false);
      }
    }
  );

  return {
    isRecording,
    transcript,
    permissionsGranted,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}

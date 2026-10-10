# Changelog

## 0.1.0

Initial release.

- `SpeechRecognizer` native module: `requestPermissions`, `startRecognition`,
  `stopRecognition`, `transcribeFile` (iOS) and the `onTranscriptUpdate` event.
- Real-time transcription on iOS (`SFSpeechRecognizer` + `AVAudioEngine`) and
  Android (`android.speech.SpeechRecognizer`), both streaming partial results.
- Offline file transcription on iOS via `SFSpeechURLRecognitionRequest`.
- `useSpeechRecognition` React hook with permission handling, transcript
  streaming, and iOS silence auto-restart behavior.
- Config plugin for iOS usage descriptions and the Android `RECORD_AUDIO`
  permission.
- Web resolves to a no-op stub.

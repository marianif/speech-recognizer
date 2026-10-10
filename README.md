# expo-speech-recognizer

Real-time speech recognition for [Expo](https://expo.dev) apps, built on the
native platform APIs:

- **iOS** — [`SFSpeechRecognizer`](https://developer.apple.com/documentation/speech/sfspeechrecognizer)
  with `AVAudioEngine` buffering, streaming partial results as you speak.
- **Android** — [`android.speech.SpeechRecognizer`](https://developer.android.com/reference/android/speech/SpeechRecognizer)
  with partial results.
- **File transcription (iOS)** — transcribe existing audio files, e.g.
  recordings captured elsewhere (watch, voice memos).
- **Web** — a no-op stub keeps bundling for web working; there is no
  recognition implementation.

The package ships a typed native module **and** a `useSpeechRecognition` React
hook that handles the recording lifecycle, permissions and the iOS
silence-finalization behavior (see [Notable behaviors](#notable-behaviors)).

## Requirements

- A **development build** — speech recognition is not available in Expo Go.
- iOS 15.1+, Android with an on-device speech recognition service.

## Installation

```sh
npx expo install expo-speech-recognizer
```

## Configuration

Add the config plugin to your app config so the required permission
descriptions are added to `Info.plist` (iOS) and `RECORD_AUDIO` is declared
(Android):

```json
{
  "expo": {
    "plugins": [
      [
        "expo-speech-recognizer",
        {
          "speechRecognitionPermission": "Allow $(PRODUCT_NAME) to use speech recognition.",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access the microphone for speech recognition."
        }
      ]
    ]
  }
}
```

Both props are optional:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `speechRecognitionPermission` | `string \| false` | `Allow $(PRODUCT_NAME) to use speech recognition.` | iOS `NSSpeechRecognitionUsageDescription`. `false` leaves the key untouched. |
| `microphonePermission` | `string \| false` | `Allow $(PRODUCT_NAME) to access the microphone for speech recognition.` | iOS `NSMicrophoneUsageDescription`. `false` leaves the key untouched. |

An existing value is respected unless you explicitly override it with a prop.

Then rebuild your development build (native code changed):

```sh
npx expo prebuild && npx expo run:ios   # or run:android, or EAS Build
```

## Usage

### Hook

```tsx
import { useSpeechRecognition } from 'expo-speech-recognizer';

export function VoiceInput() {
  const {
    isRecording,
    transcript,
    permissionsGranted,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
  } = useSpeechRecognition({ locale: 'en-US' });

  return (
    <View>
      <Button
        title={isRecording ? 'Stop' : 'Start'}
        onPress={toggleRecording}
      />
      <Text>{transcript}</Text>
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
```

The hook requests permissions on first start, streams the transcript, and —
on iOS — automatically restarts recognition when the system finalizes the
session during the initial silence, so the mic stays open until the user
actually speaks.

### Native module

```ts
import { SpeechRecognizer } from 'expo-speech-recognizer';

// 1. Ask for permissions (speech + microphone on iOS, microphone + service
//    availability on Android).
const { speech, microphone } = await SpeechRecognizer.requestPermissions();
if (!speech || !microphone) return;

// 2. Listen for partial and final transcripts.
const subscription = SpeechRecognizer.addListener(
  'onTranscriptUpdate',
  ({ transcript, isFinal, error }) => {
    if (error) console.warn(error);
    setTranscript(transcript);
  }
);

// 3. Start / stop. `locale` is a BCP-47 tag; it falls back to the system
//    default (then en-US) when omitted or unavailable.
await SpeechRecognizer.startRecognition('it-IT');
await SpeechRecognizer.stopRecognition();

subscription.remove();
```

### File transcription (iOS only)

```ts
const text = await SpeechRecognizer.transcribeFile(fileUri, 'en-US');
```

Transcribes a local audio file with `SFSpeechURLRecognitionRequest` and
resolves with the final transcript. Android and web reject with an
`UNSUPPORTED` error — the Android recognizer only consumes the live mic.

## API

### `useSpeechRecognition(options?)`

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `locale` | `string` | system default | BCP-47 locale tag, e.g. `"it-IT"`. |
| `autoStart` | `boolean` | `false` | Request permissions and start recording on mount. |

Returns:

| Value | Type | Description |
| --- | --- | --- |
| `isRecording` | `boolean` | Whether a recognition session is active. |
| `transcript` | `string` | Latest transcript (partial or final). |
| `permissionsGranted` | `boolean \| null` | `null` until permissions have been requested. |
| `error` | `string \| null` | Last error reported by the native module. |
| `startRecording` | `() => Promise<void>` | Requests permissions if needed, then starts. |
| `stopRecording` | `() => Promise<void>` | Stops the session. |
| `toggleRecording` | `() => Promise<void>` | Start/stop based on `isRecording`. |

### Module methods

| Method | Signature | Description |
| --- | --- | --- |
| `requestPermissions` | `() => Promise<{ speech: boolean; microphone: boolean }>` | Requests speech recognition and microphone permissions. |
| `startRecognition` | `(locale?: string) => Promise<void>` | Starts live recognition. |
| `stopRecognition` | `() => Promise<void>` | Stops live recognition; a final event may still arrive. |
| `transcribeFile` | `(fileUri: string, locale?: string) => Promise<string>` | iOS only; transcribes an audio file. |

### Events

| Event | Payload | Description |
| --- | --- | --- |
| `onTranscriptUpdate` | `{ transcript: string; isFinal: boolean; error?: string }` | Fired for every partial result and for the final result or error. |

Use `SpeechRecognizer.addListener('onTranscriptUpdate', listener)` (or
`useEventListener` from `expo`) and call `.remove()` on the returned
subscription when done.

## Platform support

| Feature | iOS | Android | Web |
| --- | --- | --- | --- |
| Live recognition (partial results) | ✅ | ✅ | — (stub) |
| `transcribeFile` | ✅ | ❌ rejects | ❌ rejects |
| Permission request | ✅ speech + mic | ✅ mic + service availability | ❌ reports `false` |

## Notable behaviors

- **iOS finalizes on silence.** `SFSpeechRecognizer` ends a session after a
  brief silence. The `useSpeechRecognition` hook auto-restarts the session
  while the user intends to record and no speech has been captured yet;
  once there are words, a silent final ends the recording for good.
- **`stopRecognition` flushes, it does not cancel.** Buffered audio is
  finalized so the last words are delivered, rather than discarded.
- **Android availability.** Recognition requires a speech recognition service
  on the device; `requestPermissions` reports `speech: false` when none is
  available. `SpeechRecognizer.isRecognitionAvailable` is used under the hood.
- **Errors are per-session.** Native errors are delivered as a final
  `onTranscriptUpdate` event with an `error` string, not as a rejected promise
  (except errors from `startRecognition` / `transcribeFile` themselves).

## Development

```sh
npm install          # installs the package tooling
npm run build        # compiles ./src to ./build (required before running the example)
cd example
npm install
npx expo prebuild --clean
npx expo run:ios     # or run:android
```

The example app resolves the package through Metro (`extraNodeModules`) and
autolinking (`nativeModulesDir: ".."`), so it always uses the local sources —
including the native ones.

## License

MIT © Federica Mariani

// @ts-check
const {
  AndroidConfig,
  createRunOncePlugin,
  withPlugins,
} = require('expo/config-plugins');

const { version } = require('../package.json');

const DEFAULT_SPEECH_RECOGNITION_PERMISSION =
  'Allow $(PRODUCT_NAME) to use speech recognition.';
const DEFAULT_MICROPHONE_PERMISSION =
  'Allow $(PRODUCT_NAME) to access the microphone for speech recognition.';

/**
 * Config plugin that wires the permissions required for speech recognition.
 *
 * - iOS: sets `NSSpeechRecognitionUsageDescription` and `NSMicrophoneUsageDescription`
 *   (both are required by iOS, the app crashes without them).
 * - Android: adds the `RECORD_AUDIO` permission. The module's own manifest
 *   already declares it — this keeps the requirement explicit and resilient.
 *
 * Existing usage descriptions are respected: a string set by another plugin or
 * by `ios.infoPlist` directly is only overridden when a prop is provided, and
 * passing `false` leaves the key untouched entirely.
 *
 * @type {import('expo/config-plugins').ConfigPlugin<{
 *   speechRecognitionPermission?: string | false;
 *   microphonePermission?: string | false;
 * } | undefined>}
 */
const withSpeechRecognizerPermissions = (config, props = {}) => {
  if (!config.ios) {
    config.ios = {};
  }
  if (!config.ios.infoPlist) {
    config.ios.infoPlist = {};
  }

  if (props.speechRecognitionPermission !== false) {
    config.ios.infoPlist.NSSpeechRecognitionUsageDescription =
      props.speechRecognitionPermission ||
      config.ios.infoPlist.NSSpeechRecognitionUsageDescription ||
      DEFAULT_SPEECH_RECOGNITION_PERMISSION;
  }

  if (props.microphonePermission !== false) {
    config.ios.infoPlist.NSMicrophoneUsageDescription =
      props.microphonePermission ||
      config.ios.infoPlist.NSMicrophoneUsageDescription ||
      DEFAULT_MICROPHONE_PERMISSION;
  }

  return withPlugins(config, [
    [
      AndroidConfig.Permissions.withPermissions,
      ['android.permission.RECORD_AUDIO'],
    ],
  ]);
};

module.exports = createRunOncePlugin(
  withSpeechRecognizerPermissions,
  'expo-speech-recognizer',
  version
);

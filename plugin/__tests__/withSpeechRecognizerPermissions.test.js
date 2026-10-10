const withSpeechRecognizerPermissions = require('../withSpeechRecognizerPermissions');

const makeConfig = () => ({
  _internal: { projectRoot: __dirname },
  ios: {},
  android: {},
});

describe('withSpeechRecognizerPermissions', () => {
  it('adds default iOS usage descriptions', () => {
    const config = withSpeechRecognizerPermissions(makeConfig(), undefined);

    expect(config.ios.infoPlist.NSSpeechRecognitionUsageDescription).toBe(
      'Allow $(PRODUCT_NAME) to use speech recognition.'
    );
    expect(config.ios.infoPlist.NSMicrophoneUsageDescription).toBe(
      'Allow $(PRODUCT_NAME) to access the microphone for speech recognition.'
    );
  });

  it('applies prop overrides and preserves existing values', () => {
    const config = withSpeechRecognizerPermissions(
      {
        _internal: { projectRoot: __dirname },
        ios: { infoPlist: { NSMicrophoneUsageDescription: 'Existing mic string' } },
        android: {},
      },
      { speechRecognitionPermission: 'Custom speech string' }
    );

    expect(config.ios.infoPlist.NSSpeechRecognitionUsageDescription).toBe(
      'Custom speech string'
    );
    expect(config.ios.infoPlist.NSMicrophoneUsageDescription).toBe('Existing mic string');
  });

  it('leaves keys untouched when a prop is false', () => {
    const config = withSpeechRecognizerPermissions(makeConfig(), {
      microphonePermission: false,
      speechRecognitionPermission: false,
    });

    expect(config.ios.infoPlist.NSSpeechRecognitionUsageDescription).toBeUndefined();
    expect(config.ios.infoPlist.NSMicrophoneUsageDescription).toBeUndefined();
  });

  it('attaches the Android RECORD_AUDIO manifest mod', () => {
    const config = withSpeechRecognizerPermissions(makeConfig(), undefined);

    expect(config.mods.android.manifest).toHaveLength(1);
  });
});

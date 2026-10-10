import SpeechRecognizer from '../SpeechRecognizerModule.web';

describe('SpeechRecognizerModule.web', () => {
  it('reports no permissions', async () => {
    await expect(SpeechRecognizer.requestPermissions()).resolves.toEqual({
      speech: false,
      microphone: false,
    });
  });

  it('no-ops start and stop recognition', async () => {
    await expect(SpeechRecognizer.startRecognition('it-IT')).resolves.toBeUndefined();
    await expect(SpeechRecognizer.stopRecognition()).resolves.toBeUndefined();
  });

  it('rejects file transcription', async () => {
    await expect(SpeechRecognizer.transcribeFile('file:///audio.m4a')).rejects.toThrow(
      'not supported on web'
    );
  });

  it('returns a removable subscription from addListener', () => {
    const subscription = SpeechRecognizer.addListener('onTranscriptUpdate', () => {});
    expect(typeof subscription.remove).toBe('function');
    expect(() => subscription.remove()).not.toThrow();
  });
});

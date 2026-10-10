import ExpoModulesCore
import Speech
import AVFoundation

private let onTranscriptUpdate = "onTranscriptUpdate"

public class SpeechRecognizerModule: Module {
  private var audioEngine: AVAudioEngine?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var speechRecognizer: SFSpeechRecognizer?

  public func definition() -> ModuleDefinition {
    Name("SpeechRecognizer")
    Events(onTranscriptUpdate)

    AsyncFunction("requestPermissions") { (promise: Promise) in
      SFSpeechRecognizer.requestAuthorization { speechStatus in
        AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
          promise.resolve([
            "speech": speechStatus == .authorized,
            "microphone": micGranted
          ])
        }
      }
    }

    AsyncFunction("startRecognition") { (localeIdentifier: String?, promise: Promise) in
      DispatchQueue.main.async {
        do {
          try self.startRecognitionInternal(localeIdentifier: localeIdentifier)
          promise.resolve(nil)
        } catch {
          promise.reject("START_FAILED", error.localizedDescription)
        }
      }
    }

    AsyncFunction("stopRecognition") { (promise: Promise) in
      DispatchQueue.main.async {
        self.stopRecognitionInternal()
        promise.resolve(nil)
      }
    }

    // One-shot file transcription, e.g. for audio recorded elsewhere (watch,
    // voice memos). `localeIdentifier` falls back to the system recognizer
    // (then en-US) when omitted.
    AsyncFunction("transcribeFile") { (fileUri: String, localeIdentifier: String?, promise: Promise) in
      guard let url = URL(string: fileUri) else {
        promise.reject("INVALID_URL", "The provided file URI is invalid")
        return
      }

      guard let recognizer = Self.makeRecognizer(localeIdentifier: localeIdentifier) else {
        promise.reject("TRANSCRIBE_FAILED", "Speech recognizer is unavailable")
        return
      }

      let request = SFSpeechURLRecognitionRequest(url: url)
      recognizer.recognitionTask(with: request) { result, error in
        if let error = error {
          promise.reject("TRANSCRIBE_FAILED", error.localizedDescription)
          return
        }
        if let result = result, result.isFinal {
          promise.resolve(result.bestTranscription.formattedString)
        }
      }
    }

    OnDestroy {
      self.stopRecognitionInternal()
    }
  }

  // MARK: - Private

  // Prefer the requested locale, then the system default, then en-US. Note:
  // isAvailable can be false on the simulator even when recognition works, so
  // the first creatable recognizer is kept as a fallback rather than treated
  // as failure.
  private static func makeRecognizer(localeIdentifier: String?) -> SFSpeechRecognizer? {
    let preferred = localeIdentifier.map { Locale(identifier: $0) }
    let candidates: [SFSpeechRecognizer?] = [
      preferred.flatMap { SFSpeechRecognizer(locale: $0) },
      SFSpeechRecognizer(),
      SFSpeechRecognizer(locale: Locale(identifier: "en-US")),
    ]

    var fallback: SFSpeechRecognizer?
    for candidate in candidates {
      guard let recognizer = candidate else { continue }
      if fallback == nil { fallback = recognizer }
      if recognizer.isAvailable {
        return recognizer
      }
    }
    return fallback
  }

  private func startRecognitionInternal(localeIdentifier: String?) throws {
    stopRecognitionInternal()

    guard let recognizer = Self.makeRecognizer(localeIdentifier: localeIdentifier) else {
      throw NSError(
        domain: "SpeechRecognizer",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "Speech recognizer not available"]
      )
    }
    speechRecognizer = recognizer

    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

    let engine = AVAudioEngine()
    let request = SFSpeechAudioBufferRecognitionRequest()
    request.shouldReportPartialResults = true

    let inputNode = engine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
      request.append(buffer)
    }

    engine.prepare()
    try engine.start()

    let task = recognizer.recognitionTask(with: request) { [weak self] result, error in
      guard let self = self else { return }

      if let result = result {
        self.sendEvent(onTranscriptUpdate, [
          "transcript": result.bestTranscription.formattedString,
          "isFinal": result.isFinal
        ])
        if result.isFinal {
          self.stopRecognitionInternal()
        }
      }

      if let error = error {
        let nsError = error as NSError
        // Code 301 = normal cancellation from stopRecognitionInternal(), not a real error
        if nsError.code != 301 {
          self.sendEvent(onTranscriptUpdate, [
            "transcript": "",
            "isFinal": true,
            "error": error.localizedDescription
          ])
        }
        self.stopRecognitionInternal()
      }
    }

    audioEngine = engine
    recognitionRequest = request
    recognitionTask = task
  }

  private func stopRecognitionInternal() {
    audioEngine?.inputNode.removeTap(onBus: 0)
    audioEngine?.stop()
    // endAudio() lets the recognizer flush buffered audio into a final result
    // (delivering the dictated text), whereas cancel() would discard it. Use
    // finish() to wind the task down gracefully; only fall back to cancel() if
    // there's nothing to finalize.
    recognitionRequest?.endAudio()
    recognitionTask?.finish()
    audioEngine = nil
    recognitionRequest = nil
    recognitionTask = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}

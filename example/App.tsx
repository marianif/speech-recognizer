import { useSpeechRecognition } from 'expo-speech-recognizer';
import { useState } from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function App() {
  const [locale, setLocale] = useState('en-US');
  const {
    isRecording,
    transcript,
    permissionsGranted,
    error,
    toggleRecording,
  } = useSpeechRecognition({ locale });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>expo-speech-recognizer</Text>

      <Text style={styles.status}>
        {permissionsGranted === null
          ? 'Permissions not requested yet'
          : permissionsGranted
            ? 'Permissions granted'
            : 'Permissions denied'}
      </Text>

      <TextInput
        style={styles.input}
        value={locale}
        onChangeText={setLocale}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Locale (e.g. en-US, it-IT)"
      />

      <Button
        title={isRecording ? 'Stop recording' : 'Start recording'}
        onPress={toggleRecording}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView style={styles.transcriptBox}>
        <Text style={styles.transcript}>
          {transcript || 'Transcript will appear here…'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    color: '#c0392b',
    fontSize: 14,
  },
  transcriptBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
  },
  transcript: {
    fontSize: 18,
    lineHeight: 26,
  },
});

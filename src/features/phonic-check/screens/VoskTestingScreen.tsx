import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Switch } from 'react-native';
import { AppText as Text } from '../../../components/AppText';
import { loadModel, start, stop, onResult, onPartialResult, onFinalResult, onError, unload } from 'react-native-vosk';
import { Audio } from 'expo-av';
import BackButton from '../../../components/BackButton';
import { DT } from '../../../utils/DyslexiaTheme';
import { getApiBaseUrl } from '../../../config/apiConfig';

export default function VoskTestingScreen() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Initializing...');
  const [results, setResults] = useState<any[]>([]);
  const [targetWord, setTargetWord] = useState('hit');
  const [useGrammar, setUseGrammar] = useState(true);
  const [rawLogs, setRawLogs] = useState<string[]>([]);
  
  // Backend Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isBackendTesting, setIsBackendTesting] = useState(false);

  useEffect(() => {
    setupVosk();
    return () => {
      stop();
      unload();
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  const setupVosk = async () => {
    try {
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      if (micStatus !== 'granted') {
        setStatus('Microphone permission denied.');
        return;
      }

      setStatus('Loading model... (this takes a few seconds)');
      await loadModel('model-en');
      
      onResult((resStr: string) => {
        try {
          addRawLog(`RESULT: ${resStr}`);
          const res = JSON.parse(resStr);
          if (res.text) { addResult(res, 'VOSK-RESULT'); }
        } catch (e) { addRawLog(`PARSE ERR: ${e} | RAW: ${resStr}`); }
      });

      onFinalResult((resStr: string) => {
        try {
          addRawLog(`FINAL: ${resStr}`);
          const res = JSON.parse(resStr);
          if (res.text) { addResult(res, 'VOSK-FINAL'); }
        } catch (e) { addRawLog(`PARSE ERR: ${e} | RAW: ${resStr}`); }
      });

      onError((err: any) => {
        addRawLog(`ERROR: ${err}`);
        setStatus(`Error: ${err}`);
      });

      setIsModelLoaded(true);
      setStatus('Model loaded. Ready to test!');
    } catch (e) {
      setStatus(`Failed to load model: ${e}`);
    }
  };

  const addRawLog = (log: string) => {
    console.log(log);
    setRawLogs((prev) => [log, ...prev].slice(0, 10));
  };

  const addResult = (parsedJson: any, type: string) => {
    setResults((prev) => [
      ...prev, 
      { type, text: parsedJson.text, words: parsedJson.result || [], backendData: parsedJson.phonemes }
    ]);
  };

  const toggleVoskRecording = async () => {
    if (isRecording) {
      setStatus('Stopping Vosk...');
      stop();
      setIsRecording(false);
      setStatus('Model loaded. Ready to test!');
    } else {
      setStatus(`Vosk Listening for: "${targetWord}"...`);
      try {
        setResults([]); setRawLogs([]);
        let options = undefined;
        if (useGrammar && targetWord.trim()) {
          options = { grammar: [targetWord.toLowerCase().trim(), "[unk]"] };
          addRawLog(`STARTING WITH GRAMMAR: ${JSON.stringify(options)}`);
        } else {
          addRawLog(`STARTING WITHOUT GRAMMAR`);
        }
        await start(options);
        setIsRecording(true);
      } catch (e) {
        setStatus(`Start failed: ${e}`);
      }
    }
  };

  const testBackendPhonemes = async () => {
    try {
      if (isBackendTesting) {
        setStatus('Stopping Backend Test...');
        setIsBackendTesting(false);
        
        const currentRecording = recording;
        setRecording(null); // Clear state immediately

        if (currentRecording) {
          try { await currentRecording.stopAndUnloadAsync(); } catch (e) { console.log(e); }
          
          const uri = currentRecording.getURI();
          setStatus('Sending to Backend...');
          addRawLog('Uploading to backend...');
          
          if (!uri) return;

          const formData = new FormData();
          formData.append('audio', {
            uri,
            name: 'test.wav',
            type: 'audio/wav',
          } as any);
          formData.append('word', targetWord.trim() || 'hello');

          const API_BASE = getApiBaseUrl();
          const response = await fetch(`${API_BASE}/test-phoneme`, {
            method: 'POST',
            body: formData,
            headers: { 'Accept': 'application/json' },
          });

          const data = await response.json();
          addRawLog(`BACKEND RESPONSE: ${JSON.stringify(data)}`);
          
          setResults((prev) => [
            ...prev, 
            { 
              type: 'BACKEND-IPA', 
              text: data.transcription_heard, 
              words: [], 
              backendData: data.phonemes,
              score: data.phoneme_accuracy
            }
          ]);
          setStatus('Backend Test Complete!');
        }
        return;
      }

      setResults([]); setRawLogs([]);
      setStatus(`Backend Listening for: "${targetWord}"... (Tap to stop)`);
      setIsBackendTesting(true);

      // Failsafe: Ensure no old recording is stuck
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch (e) {}
        setRecording(null);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
      
    } catch (err) {
      console.error('Failed to start recording', err);
      setStatus(`Backend Error: ${err}`);
      setIsBackendTesting(false);
      setRecording(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BackButton color={DT.accent.navy} />
        <Text style={styles.title}>Accuracy Lab</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.statusText}>Status: {status}</Text>

        <View style={styles.grammarToggleContainer}>
          <Text style={styles.label}>Force Vosk Grammar</Text>
          <Switch value={useGrammar} onValueChange={setUseGrammar} />
        </View>

        {useGrammar && (
          <TextInput 
             style={styles.input}
             value={targetWord}
             onChangeText={setTargetWord}
             placeholder="e.g. hit"
             autoCapitalize="none"
             autoCorrect={false}
          />
        )}
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, isRecording ? styles.buttonRecording : (isModelLoaded ? styles.buttonReady : styles.buttonDisabled)]}
            onPress={toggleVoskRecording}
            disabled={!isModelLoaded || isBackendTesting}
          >
            <Text style={styles.buttonText}>
              {isRecording ? 'Stop Vosk' : 'Test Vosk'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, isBackendTesting ? styles.buttonRecording : styles.buttonBackend]}
            onPress={testBackendPhonemes}
            disabled={isRecording}
          >
            <Text style={styles.buttonText}>
              {isBackendTesting ? 'Stop Backend' : 'Test Backend IPA'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView}>
          <Text style={styles.resultsTitle}>Detailed Scores:</Text>
          {results.map((res, i) => (
            <View key={i} style={styles.resultBlock}>
              <Text style={styles.resultType}>[{res.type}] Heard: "{res.text}" {res.score ? `(${res.score}%)` : ''}</Text>
              
              {/* VOSK WORD SCORES */}
              {res.words && res.words.map((w: any, j: number) => (
                <Text key={j} style={styles.wordScore}>
                  • {w.word} (Confidence: {Math.round(w.conf * 100)}%)
                </Text>
              ))}

              {/* BACKEND PHONEME SCORES */}
              {res.backendData && res.backendData.map((p: any, j: number) => (
                <Text key={j} style={styles.wordScore}>
                  • Sound: /{p.p}/ ➔ Score: {p.score}% ({p.feedback})
                </Text>
              ))}
            </View>
          ))}

          <Text style={[styles.resultsTitle, { marginTop: 20, color: 'red' }]}>RAW DEBUG LOGS:</Text>
          {rawLogs.map((log, i) => (
            <Text key={i} style={styles.debugText}>{log}</Text>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DT.bg.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    borderBottomWidth: 1, borderBottomColor: DT.surface.divider,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginLeft: 15 },
  content: { flex: 1, padding: 20 },
  statusText: { fontSize: 16, marginBottom: 15, fontWeight: 'bold', color: DT.text.secondary },
  grammarToggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: 'bold', color: DT.text.primary },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: DT.surface.cardBorder,
    borderRadius: 8, padding: 12, fontSize: 18, marginBottom: 20
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  button: { padding: 15, borderRadius: 10, alignItems: 'center', flex: 0.48 },
  buttonReady: { backgroundColor: DT.accent.teal },
  buttonBackend: { backgroundColor: DT.accent.indigo },
  buttonRecording: { backgroundColor: DT.accent.rose },
  buttonDisabled: { backgroundColor: DT.surface.cardBorder },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  resultsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  scrollView: { flex: 1 },
  resultBlock: { marginBottom: 15, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: DT.surface.cardBorder },
  resultType: { fontSize: 15, fontWeight: 'bold', color: DT.accent.navy, marginBottom: 5 },
  wordScore: { fontSize: 14, color: DT.text.primary, marginLeft: 10, fontFamily: 'monospace' },
  debugText: { fontSize: 12, color: 'red', fontFamily: 'monospace', marginBottom: 5, backgroundColor: '#ffe5e5', padding: 5 }
});

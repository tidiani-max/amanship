// ==================== PHASE 2: VOICE COMMANDS + BARCODE SCANNER ====================
// File: client/components/VoicePickingAssistant.tsx

// 📦 INSTALLATION REQUIRED FIRST:
// npm install expo-speech @react-native-voice/voice expo-barcode-scanner

// ==================== IMPORTS ====================
import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Feather } from '@expo/vector-icons';

// Import your components
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';

// ==================== VOICE COMMANDS COMPONENT ====================

interface VoicePickingAssistantProps {
  enabled: boolean;
  currentItem: {
    name: string;
    location: string;
    quantity: number;
  } | null;
  onCommand: (command: 'next' | 'done' | 'skip' | 'repeat') => void;
}

export const VoicePickingAssistant: React.FC<VoicePickingAssistantProps> = ({
  enabled,
  currentItem,
  onCommand
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    if (!enabled) return;

    // Setup voice recognition
    Voice.onSpeechResults = (e: any) => {
      const text = e.value[0]?.toLowerCase() || '';
      setRecognizedText(text);
      handleVoiceCommand(text);
    };

    Voice.onSpeechError = (e: any) => {
      console.log('Voice error:', e);
      setIsListening(false);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, [enabled]);

  useEffect(() => {
    // Auto-speak instructions when item changes
    if (enabled && currentItem) {
      speakInstructions();
    }
  }, [currentItem, enabled]);

  const speakInstructions = async () => {
    if (!currentItem) return;
    
    await Speech.speak(
      `Pick ${currentItem.quantity} units of ${currentItem.name} from ${currentItem.location}`,
      {
        language: 'en-US',
        rate: 1.0,
        pitch: 1.0,
      }
    );
  };

  const handleVoiceCommand = (text: string) => {
    if (text.includes('next') || text.includes('done')) {
      Speech.speak('Item marked as picked');
      onCommand('done');
    } else if (text.includes('skip')) {
      Speech.speak('Skipping item');
      onCommand('skip');
    } else if (text.includes('repeat')) {
      speakInstructions();
    }
  };

  const startListening = async () => {
    try {
      setIsListening(true);
      await Voice.start('en-US');
    } catch (e) {
      console.error('Voice start error:', e);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (e) {
      console.error('Voice stop error:', e);
    }
  };

  if (!enabled) return null;

  return (
    <View style={styles.voiceAssistant}>
      <View style={styles.voiceHeader}>
        <Feather name="mic" size={20} color="#10b981" />
        <ThemedText style={{ color: '#10b981', fontWeight: '700', marginLeft: 8 }}>
          Voice Assistant Active
        </ThemedText>
      </View>

      {recognizedText && (
        <View style={styles.recognizedTextBubble}>
          <ThemedText style={{ fontSize: 12, color: '#666' }}>
            You said: "{recognizedText}"
          </ThemedText>
        </View>
      )}

      <View style={styles.voiceCommands}>
        <ThemedText type="caption" style={{ color: '#666', marginBottom: 8 }}>
          Say: "Done" • "Next" • "Skip" • "Repeat"
        </ThemedText>
        
        <TouchableOpacity
          style={[
            styles.voiceButton,
            { backgroundColor: isListening ? '#ef4444' : '#10b981' }
          ]}
          onPress={isListening ? stopListening : startListening}
        >
          <Feather 
            name={isListening ? "mic-off" : "mic"} 
            size={20} 
            color="white" 
          />
          <ThemedText style={{ color: 'white', fontWeight: '700', marginLeft: 8 }}>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ==================== SMART BARCODE SCANNER COMPONENT ====================

interface SmartBarcodeScannerProps {
  visible: boolean;
  expectedProductId: string;
  expectedProductName: string;
  onScanSuccess: () => void;
  onScanWrong: (scannedProduct: any) => void;
  onClose: () => void;
}

export const SmartBarcodeScanner: React.FC<SmartBarcodeScannerProps> = ({
  visible,
  expectedProductId,
  expectedProductName,
  onScanSuccess,
  onScanWrong,
  onClose
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned) return;
    
    setScanned(true);
    
    // Verify with backend
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/picker/verify-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: data,
          expectedProductId,
        })
      });

      const result = await response.json();

      if (result.isCorrect) {
        // ✅ Correct item scanned
        await Speech.speak('Correct item verified');
        onScanSuccess();
      } else {
        // ❌ Wrong item
        await Speech.speak('Warning, wrong item scanned');
        onScanWrong(result.scannedProduct);
      }
    } catch (error) {
      console.error('Scan verification error:', error);
      Alert.alert('Error', 'Failed to verify scan');
    }

    // Reset after 2 seconds
    setTimeout(() => setScanned(false), 2000);
  };

  if (!visible) return null;

  if (hasPermission === null) {
    return <ThemedText>Requesting camera permission...</ThemedText>;
  }

  if (hasPermission === false) {
    return <ThemedText>No access to camera</ThemedText>;
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.scannerContainer}>
        <View style={styles.scannerHeader}>
          <ThemedText type="h3">Scan Barcode</ThemedText>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.expectedItemBanner}>
          <ThemedText style={{ color: 'white', fontWeight: '700' }}>
            Expected Item: {expectedProductName}
          </ThemedText>
        </View>

        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame} />
          <ThemedText style={styles.scannerInstruction}>
            Align barcode within frame
          </ThemedText>
        </View>

        {scanned && (
          <View style={styles.scannedOverlay}>
            <ActivityIndicator size="large" color="#10b981" />
            <ThemedText style={{ color: 'white', marginTop: 10 }}>
              Verifying...
            </ThemedText>
          </View>
        )}
      </View>
    </Modal>
  );
};

// ==================== STYLES ====================

const styles = StyleSheet.create({
  voiceAssistant: {
    backgroundColor: '#f0fdf4',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recognizedTextBubble: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  voiceCommands: {
    alignItems: 'center',
  },
  voiceButton: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  expectedItemBanner: {
    padding: 15,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#10b981',
    borderRadius: 20,
  },
  scannerInstruction: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  scannedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
});
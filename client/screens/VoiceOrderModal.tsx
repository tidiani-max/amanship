import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { mockProducts } from "@/data/mockData";
import { CartItem } from "@/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const samplePhrases = [
  "2 cartons of milk and a dozen eggs",
  "I need some snacks and mineral water",
  "Get me fruits and vegetables",
  "Frozen chicken nuggets and drinks",
];

export default function VoiceOrderModal() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [simulatedText, setSimulatedText] = useState("");
  
  const pulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
      waveOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 400 }),
          withTiming(0.1, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
      waveOpacity.value = withTiming(0);
    }
  }, [isListening]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: waveOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleMicPress = () => {
    if (!isListening) {
      setIsListening(true);
      setTranscript("");
      
      const randomPhrase = samplePhrases[Math.floor(Math.random() * samplePhrases.length)];
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex < randomPhrase.length) {
          setSimulatedText(randomPhrase.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
          setTranscript(randomPhrase);
          setIsListening(false);
        }
      }, 50);
    } else {
      setIsListening(false);
    }
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1);
  };

  const handleConfirm = () => {
    const detectedItems: CartItem[] = [
      { product: mockProducts[0], quantity: 2 },
      { product: mockProducts[1], quantity: 1 },
    ];
    navigation.replace("VoiceConfirm", { items: detectedItems });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={handleCancel} style={styles.headerButton}>
          <ThemedText type="body" style={{ color: theme.error }}>
            Cancel
          </ThemedText>
        </Pressable>
        <ThemedText type="h3">Voice Order</ThemedText>
        <Pressable
          onPress={transcript ? handleConfirm : undefined}
          style={styles.headerButton}
          disabled={!transcript}
        >
          <ThemedText
            type="body"
            style={{ color: transcript ? theme.primary : theme.textSecondary }}
          >
            Done
          </ThemedText>
        </Pressable>
      </View>
      
      <View style={styles.content}>
        <View style={styles.transcriptContainer}>
          {isListening ? (
            <ThemedText type="h2" style={styles.transcript}>
              {simulatedText}
              <ThemedText type="h2" style={{ opacity: 0.5 }}>|</ThemedText>
            </ThemedText>
          ) : transcript ? (
            <ThemedText type="h2" style={styles.transcript}>
              {transcript}
            </ThemedText>
          ) : (
            <ThemedText type="body" style={[styles.placeholder, { color: theme.textSecondary }]}>
              Tap the microphone and tell us what you need
            </ThemedText>
          )}
        </View>
        
        <View style={styles.micContainer}>
          <Animated.View
            style={[
              styles.pulseRing,
              { backgroundColor: theme.primary },
              pulseAnimatedStyle,
            ]}
          />
          <Animated.View style={buttonAnimatedStyle}>
            <Pressable
              style={[
                styles.micButton,
                { backgroundColor: isListening ? theme.error : theme.primary },
                Shadows.fab,
              ]}
              onPress={handleMicPress}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              <Feather
                name={isListening ? "mic-off" : "mic"}
                size={40}
                color={theme.buttonText}
              />
            </Pressable>
          </Animated.View>
          <ThemedText type="body" style={[styles.micLabel, { color: theme.textSecondary }]}>
            {isListening ? "Listening..." : "Tap to speak"}
          </ThemedText>
        </View>
        
        {isListening ? (
          <View style={styles.waveformContainer}>
            {[...Array(7)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    backgroundColor: theme.primary,
                    height: 20 + Math.random() * 40,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>
      
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {transcript ? (
          <Button onPress={handleConfirm}>Confirm Order</Button>
        ) : (
          <View style={styles.tipsContainer}>
            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              Try saying:
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.text, fontStyle: "italic" }}>
              "2 cartons of milk and a dozen eggs"
            </ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerButton: {
    padding: Spacing.sm,
    minWidth: 60,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptContainer: {
    minHeight: 100,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  transcript: {
    textAlign: "center",
  },
  placeholder: {
    textAlign: "center",
  },
  micContainer: {
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  micLabel: {
    marginTop: Spacing.lg,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xxl,
    height: 60,
  },
  waveBar: {
    width: 6,
    borderRadius: 3,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
  },
  tipsContainer: {
    alignItems: "center",
  },
});

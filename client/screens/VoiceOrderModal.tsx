import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import { Audio } from "expo-av";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Shadows } from "@/constants/theme";
import { Product, CartItem } from "@/types";

export default function VoiceOrderModal() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);

  const pulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);

  // ================= FETCH PRODUCTS =================
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["voice-products"],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const products: Product[] = Array.isArray(productsData) ? productsData : [];

  // ================= AUDIO =================
  const startRecording = async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Microphone permission required");
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await recording.startAsync();

    recordingRef.current = recording;
    setIsListening(true);
  };

  const stopRecording = async () => {
    setIsListening(false);
    const recording = recordingRef.current;
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recordingRef.current = null;

    if (uri) await sendAudio(uri);
  };

  const sendAudio = async (uri: string) => {
    const formData = new FormData();
    formData.append("file", {
      uri,
      name: "voice.m4a",
      type: "audio/m4a",
    } as any);

    const res = await fetch(
      `${process.env.EXPO_PUBLIC_DOMAIN}/api/speech-to-text`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    setTranscript(data.text || "");
  };

  // ================= MATCH PRODUCTS =================
  const findItemsInTranscript = (text: string): CartItem[] => {
    const lower = text.toLowerCase();
    const matched: CartItem[] = [];
    const used = new Set<string>();

    products.forEach((p) => {
      if (lower.includes(p.name.toLowerCase()) && !used.has(p.id)) {
        matched.push({ product: p, quantity: 1 });
        used.add(p.id);
      }
    });

    return matched;
  };

  const handleProcessVoice = () => {
    const items = findItemsInTranscript(transcript);
    if (!items.length) {
      Alert.alert("No items found");
      return;
    }
    navigation.navigate("VoiceConfirm", { items });
  };

  // ================= ANIMATION =================
  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.3), withTiming(1)),
        -1,
        true
      );
      waveOpacity.value = withRepeat(
        withSequence(withTiming(0.4), withTiming(0.1)),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
      waveOpacity.value = withTiming(0);
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: waveOpacity.value,
  }));

  // ================= UI =================
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.transcriptArea}>
        <ThemedText type="h2" style={styles.transcriptText}>
          {transcript || (isListening ? "Listening..." : "Say a product name")}
        </ThemedText>
      </View>

      <View style={styles.micArea}>
        <Animated.View
          style={[styles.pulse, { backgroundColor: theme.primary }, pulseStyle]}
        />
        <Pressable
          onPress={isListening ? stopRecording : startRecording}
          style={[
            styles.micBtn,
            { backgroundColor: isListening ? theme.error : theme.primary },
            Shadows.medium,
          ]}
        >
          <Feather name={isListening ? "square" : "mic"} size={40} color="white" />
        </Pressable>
      </View>

      {transcript.length > 0 && !isListening && (
        <View style={styles.footer}>
          <Button onPress={handleProcessVoice}>Review My Basket</Button>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  transcriptArea: { minHeight: 150, paddingHorizontal: 40 },
  transcriptText: { textAlign: "center", lineHeight: 36 },
  micArea: { alignItems: "center", marginTop: 40 },
  pulse: { position: "absolute", width: 120, height: 120, borderRadius: 60 },
  micBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
  },
});

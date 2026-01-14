import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, withSpring } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

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
  const recognitionRef = useRef<any>(null);
  
  const pulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);

  // --- 1. Fetch products from your API ---
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch('${process.env.EXPO_PUBLIC_DOMAIN}/api/products'); 
      if (!response.ok) throw new Error("Check backend route!");
      return response.json();
    }
  });

  // --- 2. Hidden Search Logic ---
const findItemsInTranscript = (text: string): CartItem[] => {
  const lowerText = text.toLowerCase();
  const matched: CartItem[] = [];
  const addedProductIds = new Set<string>();

  // 1. QUANTITY DETECTION (Detects "2", "3", "two", "three", etc.)
  const numberMap: { [key: string]: number } = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
  };

  const getQuantity = (phrase: string) => {
    const words = phrase.split(' ');
    for (let i = 0; i < words.length; i++) {
      // Check for digits (2) or words (two)
      if (!isNaN(parseInt(words[i]))) return parseInt(words[i]);
      if (numberMap[words[i]]) return numberMap[words[i]];
    }
    return 1; // Default
  };

  // 2. SMARTER MATCHING (Scoring System)
  // We split the transcript by "and" or commas to handle multiple items
  const sentences = lowerText.split(/and|,|\n/);

  sentences.forEach((sentence) => {
    let bestMatch: Product | null = null;
    let highestScore = 0;

    products.forEach((product) => {
      const pName = product.name.toLowerCase();
      const pBrand = (product.brand || "").toLowerCase();
      let score = 0;

      // Exact match gets highest score
      if (sentence.includes(pName)) score += 10;
      // Brand match adds value
      if (pBrand && sentence.includes(pBrand)) score += 5;
      // Partial word match
      const pWords = pName.split(' ');
      pWords.forEach(word => {
        if (word.length > 2 && sentence.includes(word)) score += 2;
      });

      if (score > highestScore) {
        highestScore = score;
        bestMatch = product;
      }
    });

    // Only add the best match for this specific part of the sentence
    if (bestMatch && !addedProductIds.has((bestMatch as Product).id)) {
      const qty = getQuantity(sentence);
      matched.push({ product: bestMatch, quantity: qty });
      addedProductIds.add((bestMatch as Product).id);
    }
  });

  return matched;
};

  // --- Web Speech Setup ---
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(withSequence(withTiming(1.3), withTiming(1)), -1, true);
      waveOpacity.value = withRepeat(withSequence(withTiming(0.4), withTiming(0.1)), -1, true);
    } else {
      pulseScale.value = withSpring(1);
      waveOpacity.value = withTiming(0);
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: waveOpacity.value,
  }));

const handleProcessVoice = () => {
  console.log("Button Pressed!"); // Add this to debug in your console
  
  if (isListening) {
     setIsListening(false);
     recognitionRef.current?.stop();
  }

  const matchedItems = findItemsInTranscript(transcript);
  
  if (matchedItems.length > 0) {
    // Try .navigate if .replace is causing issues with your specific stack setup
    navigation.navigate("VoiceConfirm", { items: matchedItems });
  } else {
    Alert.alert("No Items Found", "Try saying something like 'I need Water'");
  }
};

  const handleMicPress = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <ThemedText style={{ color: theme.error }}>Cancel</ThemedText>
        </Pressable>
        <ThemedText type="h3">Voice Assistant</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.transcriptArea}>
           <ThemedText type="h2" style={styles.transcriptText}>
             {transcript || (isListening ? "Listening..." : "Tell me what food or water you need...")}
           </ThemedText>
        </View>

        <View style={styles.micArea}>
          <Animated.View style={[styles.pulse, { backgroundColor: theme.primary }, pulseStyle]} />
          <Pressable
            onPress={handleMicPress}
            style={[styles.micBtn, { backgroundColor: isListening ? theme.error : theme.primary }, Shadows.medium]}
          >
            <Feather name={isListening ? "square" : "mic"} size={40} color="white" />
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        {transcript.length > 0 && !isListening && (
          <Button onPress={handleProcessVoice}>
            Review My Basket
          </Button>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20 },
  headerBtn: { padding: 10 },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  transcriptArea: { minHeight: 150, paddingHorizontal: 40 },
  transcriptText: { textAlign: "center", lineHeight: 36 },
  micArea: { alignItems: "center", marginTop: 40 },
  pulse: { position: "absolute", width: 120, height: 120, borderRadius: 60 },
  micBtn: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  footer: { 
  position: "absolute", 
  bottom: 0, 
  left: 0, 
  right: 0, 
  padding: 20, 
  paddingBottom: 40,
  zIndex: 10, // <--- This ensures the button is always "on top" of animations
},
});
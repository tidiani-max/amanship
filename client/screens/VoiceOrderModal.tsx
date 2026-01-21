import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Pressable, Alert, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, withSpring } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

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
  const [permissionGranted, setPermissionGranted] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const pulseScale = useSharedValue(1);
  const waveOpacity = useSharedValue(0);

  // ✅ Fetch products from API with proper typing
  const { data: productsData, isLoading, error } = useQuery({
    queryKey: ["voice-products"],
    queryFn: async () => {
      console.log("🔍 Fetching products for voice recognition...");
      const response = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/products`); 
      if (!response.ok) {
        console.error("❌ Products fetch failed:", response.status);
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      console.log("✅ Products fetched:", data.length || 0);
      return data;
    }
  });

  // ✅ Safely extract products array with type assertion
  const products: Product[] = React.useMemo(() => {
    if (!productsData) return [];
    if (Array.isArray(productsData)) return productsData;
    if (Array.isArray(productsData.products)) return productsData.products;
    if (Array.isArray(productsData.data)) return productsData.data;
    console.warn("⚠️ Unexpected products data format:", productsData);
    return [];
  }, [productsData]);

  // ✅ Log products for debugging
  React.useEffect(() => {
    if (products.length > 0) {
      console.log(`📦 ${products.length} products available for voice recognition`);
      console.log("Sample products:", products.slice(0, 3).map(p => p.name));
    }
  }, [products]);

  // ========== MOBILE SPEECH RECOGNITION (expo-speech-recognition) ==========
  useSpeechRecognitionEvent("result", (event) => {
    setTranscript(event.results[0]?.transcript || "");
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event.error);
    setIsListening(false);
    Alert.alert("Error", "Speech recognition failed. Please try again.");
  });

  // ========== REQUEST PERMISSIONS ==========
  useEffect(() => {
    const requestPermissions = async () => {
      if (Platform.OS === 'web') {
        setPermissionGranted(true);
        return;
      }

      try {
        const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        setPermissionGranted(result.granted);
        
        if (!result.granted) {
          Alert.alert(
            "Permission Required",
            "Please enable microphone access in your device settings to use voice orders."
          );
        }
      } catch (error) {
        console.error("Permission error:", error);
        setPermissionGranted(false);
      }
    };

    requestPermissions();
  }, []);

  // ========== WEB SPEECH API SETUP (for laptop/desktop) ==========
  useEffect(() => {
    if (Platform.OS !== 'web') return;

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
      
      recognitionRef.current.onerror = (event: any) => {
        console.error("Web Speech error:", event.error);
        setIsListening(false);
        Alert.alert("Error", "Speech recognition failed. Please try again.");
      };
    }
  }, []);

  // ========== ANIMATIONS ==========
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

  // ========== ITEM DETECTION LOGIC ==========
  const findItemsInTranscript = React.useCallback((text: string): CartItem[] => {
    // ✅ FORCE TypeScript to recognize products as Product[]
    const productList = products as Product[];
    
    if (!productList || productList.length === 0) {
      console.warn("No products available for matching");
      return [];
    }

    const lowerText = text.toLowerCase();
    const matched: CartItem[] = [];
    const addedProductIds = new Set<string>();

    // Quantity detection
    const numberMap: Record<string, number> = {
      one: 1, two: 2, three: 3, four: 4, five: 5,
      six: 6, seven: 7, eight: 8, nine: 9, ten: 10
    };

    const getQuantity = (phrase: string): number => {
      const words = phrase.split(' ');
      for (let i = 0; i < words.length; i++) {
        const num = parseInt(words[i]);
        if (!isNaN(num)) return num;
        if (numberMap[words[i]]) return numberMap[words[i]];
      }
      return 1;
    };

    // Split transcript by "and" or commas
    const sentences = lowerText.split(/and|,|\n/);

    sentences.forEach((sentence: string) => {
      let bestMatch: Product | null = null;
      let highestScore = 0;

      // ✅ ITERATE WITH INDEX to avoid TypeScript inference issues
      for (let i = 0; i < productList.length; i++) {
        const product = productList[i] as Product;
        
        const pName = (product.name || "").toLowerCase();
        const pBrand = (product.brand || "").toLowerCase();
        let score = 0;

        if (sentence.includes(pName)) score += 10;
        if (pBrand && sentence.includes(pBrand)) score += 5;
        
        const pWords = pName.split(' ');
        for (let j = 0; j < pWords.length; j++) {
          const word = pWords[j];
          if (word.length > 2 && sentence.includes(word)) score += 2;
        }

        if (score > highestScore) {
          highestScore = score;
          bestMatch = product;
        }
      }

      if (bestMatch && bestMatch.id && !addedProductIds.has(bestMatch.id)) {
        const qty = getQuantity(sentence);
        matched.push({ product: bestMatch, quantity: qty });
        addedProductIds.add(bestMatch.id);
      }
    });

    return matched;
  }, [products]);

  // ========== PROCESS VOICE INPUT ==========
  const handleProcessVoice = () => {
    if (isListening) {
      setIsListening(false);
      if (Platform.OS === 'web') {
        recognitionRef.current?.stop();
      } else {
        ExpoSpeechRecognitionModule.stop();
      }
    }

    if (isLoading) {
      Alert.alert("Loading", "Products are still loading. Please wait...");
      return;
    }

    if (!products || products.length === 0) {
      Alert.alert("Error", "No products available. Please check your connection.");
      return;
    }

    const matchedItems = findItemsInTranscript(transcript);
    
    if (matchedItems.length > 0) {
      navigation.navigate("VoiceConfirm", { items: matchedItems });
    } else {
      Alert.alert("No Items Found", "Try saying something like 'I need water and two apples'");
    }
  };

  // ========== START/STOP RECORDING ==========
  const handleMicPress = async () => {
    if (!permissionGranted && Platform.OS !== 'web') {
      Alert.alert(
        "Permission Required",
        "Please enable microphone access in your device settings."
      );
      return;
    }

    if (isListening) {
      // Stop recording
      if (Platform.OS === 'web') {
        recognitionRef.current?.stop();
      } else {
        ExpoSpeechRecognitionModule.stop();
      }
      setIsListening(false);
    } else {
      // Start recording
      setTranscript("");
      setIsListening(true);
      
      if (Platform.OS === 'web') {
        if (recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          Alert.alert("Error", "Speech recognition not supported on this browser");
          setIsListening(false);
        }
      } else {
        try {
          await ExpoSpeechRecognitionModule.start({
            lang: "en-US",
            interimResults: true,
            maxAlternatives: 1,
            continuous: true,
            requiresOnDeviceRecognition: false,
            addsPunctuation: false,
            contextualStrings: products.map(p => p.name),
          });
        } catch (error) {
          console.error("Failed to start speech recognition:", error);
          Alert.alert("Error", "Failed to start speech recognition");
          setIsListening(false);
        }
      }
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <ThemedText style={{ color: theme.error }}>Cancel</ThemedText>
          </Pressable>
          <ThemedText type="h3">Voice Assistant</ThemedText>
          <View style={{ width: 60 }} />
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText type="body" style={{ marginTop: 20, color: theme.textSecondary }}>
            Loading products...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

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
            {transcript || (isListening ? "Listening..." : "Tell me what you need...")}
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

        {Platform.OS !== 'web' && !permissionGranted && (
          <ThemedText type="caption" style={styles.permissionText}>
            Microphone permission required
          </ThemedText>
        )}

        <ThemedText type="caption" style={[styles.permissionText, { marginTop: 20 }]}>
          {products.length} products loaded
        </ThemedText>
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
  permissionText: { marginTop: 20, color: "#999", textAlign: "center" },
  footer: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: 20, 
    paddingBottom: 40,
    zIndex: 10,
  },
});
import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface PhoneSignupScreenProps {
  onComplete: () => void;
}

export default function PhoneSignupScreen({ onComplete }: PhoneSignupScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOTP = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onComplete();
    }, 1000);
  };

  const handleSocialLogin = (provider: string) => {
    onComplete();
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: headerHeight + Spacing.xxl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.content}>
        <ThemedText type="h2" style={styles.title}>
          Enter Your Phone
        </ThemedText>
        
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          We'll send you a verification code
        </ThemedText>
        
        <View style={styles.phoneInputContainer}>
          <View style={[styles.countryCode, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText type="body">+62</ThemedText>
          </View>
          
          <TextInput
            style={[
              styles.phoneInput,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Phone number"
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
        
        <Button 
          onPress={handleSendOTP} 
          disabled={phone.length < 9 || isLoading}
          style={styles.sendButton}
        >
          {isLoading ? "Sending..." : "Send OTP"}
        </Button>
        
        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText type="caption" style={[styles.dividerText, { color: theme.textSecondary }]}>
            or continue with
          </ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>
        
        <View style={styles.socialButtons}>
          <Pressable
            style={[styles.socialButton, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => handleSocialLogin("google")}
          >
            <Feather name="mail" size={24} color={theme.text} />
            <ThemedText type="body" style={styles.socialButtonText}>
              Google
            </ThemedText>
          </Pressable>
          
          <Pressable
            style={[styles.socialButton, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => handleSocialLogin("apple")}
          >
            <Feather name="smartphone" size={24} color={theme.text} />
            <ThemedText type="body" style={styles.socialButtonText}>
              Apple
            </ThemedText>
          </Pressable>
        </View>

        <Pressable onPress={onComplete} style={styles.skipLink}>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Skip for Demo
          </ThemedText>
        </Pressable>
      </View>
      
      <ThemedText type="small" style={[styles.terms, { color: theme.textSecondary }]}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing.xxl,
  },
  phoneInputContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  countryCode: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    justifyContent: "center",
  },
  phoneInput: {
    flex: 1,
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 16,
  },
  sendButton: {
    marginBottom: Spacing.xxl,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    paddingHorizontal: Spacing.lg,
  },
  socialButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  socialButtonText: {
    fontWeight: "500",
  },
  skipLink: {
    alignSelf: "center",
    marginTop: Spacing.xl,
    padding: Spacing.sm,
  },
  terms: {
    textAlign: "center",
    paddingHorizontal: Spacing.lg,
  },
});

import React, { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface PhoneSignupScreenProps {
  onComplete: () => void;
}

export default function PhoneSignupScreen({ onComplete }: PhoneSignupScreenProps) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { sendOtp, verifyOtp, loginWithApple } = useAuth();
  
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState<string | null>(null);

  const fullPhone = `+62${phone}`;

  const handleSendOTP = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await sendOtp(fullPhone);
    
    setIsLoading(false);
    
    if (result.success) {
      setSentCode(result.code || null);
      setStep("otp");
    } else {
      setError(result.error || "Failed to send OTP");
    }
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await verifyOtp(fullPhone, otpCode);
    
    setIsLoading(false);
    
    if (result.success) {
      onComplete();
    } else {
      setError(result.error || "Invalid OTP");
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ""} ${credential.fullName.familyName || ""}`.trim()
        : undefined;
      
      setIsLoading(true);
      const result = await loginWithApple(credential.user, credential.email || undefined, fullName);
      setIsLoading(false);
      
      if (result.success) {
        onComplete();
      } else {
        setError(result.error || "Apple Sign-In failed");
      }
    } catch (e: any) {
      if (e.code === "ERR_REQUEST_CANCELED") {
        return;
      }
      setError("Apple Sign-In failed");
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Coming Soon", "Google Sign-In will be available soon!");
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
          {step === "phone" ? "Enter Your Phone" : "Enter OTP Code"}
        </ThemedText>
        
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          {step === "phone" 
            ? "We'll send you a verification code" 
            : `Enter the 6-digit code sent to ${fullPhone}`}
        </ThemedText>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.error + "20" }]}>
            <ThemedText type="caption" style={{ color: theme.error }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        {sentCode ? (
          <View style={[styles.codeHint, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText type="caption" style={{ color: theme.primary }}>
              Demo OTP: {sentCode}
            </ThemedText>
          </View>
        ) : null}
        
        {step === "phone" ? (
          <>
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
                onChangeText={(text) => {
                  setPhone(text);
                  setError(null);
                }}
              />
            </View>
            
            <Button 
              onPress={handleSendOTP} 
              disabled={phone.length < 9 || isLoading}
              style={styles.sendButton}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </Button>
          </>
        ) : (
          <>
            <TextInput
              style={[
                styles.otpInput,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Enter 6-digit code"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={(text) => {
                setOtpCode(text);
                setError(null);
              }}
              maxLength={6}
            />
            
            <Button 
              onPress={handleVerifyOTP} 
              disabled={otpCode.length !== 6 || isLoading}
              style={styles.sendButton}
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>

            <View style={styles.otpActions}>
              <Pressable 
                onPress={async () => {
                  setOtpCode("");
                  setError(null);
                  await handleSendOTP();
                }} 
                style={styles.backLink}
                disabled={isLoading}
              >
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  Resend OTP
                </ThemedText>
              </Pressable>
              
              <Pressable 
                onPress={() => {
                  setStep("phone");
                  setOtpCode("");
                  setSentCode(null);
                  setError(null);
                }} 
                style={styles.backLink}
              >
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Change phone number
                </ThemedText>
              </Pressable>
            </View>
          </>
        )}
        
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
            onPress={handleGoogleLogin}
          >
            <Feather name="mail" size={24} color={theme.text} />
            <ThemedText type="body" style={styles.socialButtonText}>
              Google
            </ThemedText>
          </Pressable>
          
          {Platform.OS === "ios" ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={BorderRadius.sm}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          ) : (
            <Pressable
              style={[styles.socialButton, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => Alert.alert("Not Available", "Apple Sign-In is only available on iOS devices")}
            >
              <Feather name="smartphone" size={24} color={theme.text} />
              <ThemedText type="body" style={styles.socialButtonText}>
                Apple
              </ThemedText>
            </Pressable>
          )}
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
    marginBottom: Spacing.lg,
  },
  errorBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  codeHint: {
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
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
  otpInput: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 24,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: Spacing.lg,
  },
  sendButton: {
    marginBottom: Spacing.lg,
  },
  otpActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  backLink: {
    padding: Spacing.sm,
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
  appleButton: {
    flex: 1,
    height: Spacing.buttonHeight,
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

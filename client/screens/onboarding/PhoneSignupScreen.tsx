import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform, Alert, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

interface GoogleSignInButtonProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  onLoadingChange: (loading: boolean) => void;
  theme: any;
}

function GoogleSignInButton({ onSuccess, onError, onLoadingChange, theme }: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    const handleResponse = async () => {
      if (response?.type === "success" && response.authentication?.accessToken) {
        try {
          onLoadingChange(true);
          const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${response.authentication.accessToken}` }
          });
          const userInfo = await userInfoResponse.json();
          const result = await loginWithGoogle(userInfo.sub, userInfo.email, userInfo.name);
          onLoadingChange(false);
          if (result.success) onSuccess();
          else onError(result.error || "Google Login failed");
        } catch (e) {
          onLoadingChange(false);
          onError("Failed to connect to Google Services");
        }
      }
    };
    handleResponse();
  }, [response]);

  return (
    <Pressable 
      style={[styles.socialButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, borderWidth: 1 }]} 
      onPress={() => request && promptAsync()}
    >
      <Feather name="mail" size={20} color={theme.text} />
      <ThemedText type="body" style={styles.socialButtonText}>Google</ThemedText>
    </Pressable>
  );
}

export default function PhoneSignupScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const { sendOtp, verifyOtp, loginWithApple, login } = useAuth();

  type AuthMode = "login" | "signup" | "forgot";

  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<"input" | "otp">("input");

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentCode, setSentCode] = useState<string | null | undefined>(null);

  const fullPhone = `+62${phone}`;

const handleInitialAction = async () => {
  if (mode === "login") {
    const result = await login(fullPhone, password);
    setIsLoading(false);
    
    // ✅ DETECT FIRST LOGIN
    if (result.error === "first_login_required") {
      Alert.alert(
        "First Time Login", 
        "Please verify your phone number to activate your account",
        [{ 
          text: "Verify Now", 
          onPress: () => {
            setMode("signup"); // Use signup flow for OTP
            handleInitialAction(); // Trigger OTP send
          }
        }]
      );
      return;
    }
    
    if (result.success) {
      onComplete();
    } else {
      Alert.alert("Login Failed", result.error || "Invalid credentials");
    }
    return;
  }

    const result = await sendOtp(fullPhone, mode as AuthMode); 
    setIsLoading(true);

    if (result.success) {
      setIsLoading(false);
      setSentCode(result.code); 
      setStep("otp");
    } else {
      setIsLoading(false);
      Alert.alert(
        mode === "signup" ? "Account Exists" : "User Not Found",
        result.error || "This action cannot be completed.",
        [
          { 
            text: mode === "signup" ? "Login Instead" : "Try Again", 
            onPress: () => {
              if (mode === "signup") setMode("login");
            }
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
      setError(result.error ?? "Process failed");
    }
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    setError(null);
    const result = await verifyOtp(fullPhone, otpCode, {
      name: mode === "signup" ? name : undefined,
      email: mode === "signup" ? email : undefined,
      password: (mode === "signup" || mode === "forgot") ? password : undefined,
      mode: mode as AuthMode
    });
    setIsLoading(false);
    if (result.success) onComplete();
    else setError(result.error || "Invalid OTP");
  };

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME, 
          AppleAuthentication.AppleAuthenticationScope.EMAIL
        ],
      });
      const fullName = credential.fullName 
        ? `${credential.fullName.givenName || ""} ${credential.fullName.familyName || ""}`.trim() 
        : undefined;
      
      setIsLoading(true);
      const result = await loginWithApple(credential.user, credential.email || undefined, fullName);
      setIsLoading(false);
      
      if (result.success) onComplete();
      else setError(result.error || "Apple Sign-In failed");
    } catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED") setError("Apple Sign-In failed");
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.container, 
        { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }
      ]}
    >
      <View style={styles.centerWrapper}>
        <View style={styles.content}>
          {step === "input" && (
            <View style={styles.tabContainer}>
              <Pressable 
                onPress={() => { setMode("signup"); setStep("input"); setError(null); }} 
                style={[styles.tab, mode === "signup" && { borderBottomColor: theme.primary }]}
              >
                <ThemedText style={{ color: mode === "signup" ? theme.primary : theme.textSecondary, fontWeight: '600' }}>Signup</ThemedText>
              </Pressable>
              <Pressable 
                onPress={() => { setMode("login"); setStep("input"); setError(null); }} 
                style={[styles.tab, mode === "login" && { borderBottomColor: theme.primary }]}
              >
                <ThemedText style={{ color: mode === "login" ? theme.primary : theme.textSecondary, fontWeight: '600' }}>Login</ThemedText>
              </Pressable>
            </View>
          )}

          <ThemedText type="h2" style={styles.title}>
            {step === "otp" ? "Verify Code" : mode === "forgot" ? "Reset Password" : mode === "signup" ? "Create Account" : "Welcome Back"}
          </ThemedText>

          {error && (
            <View style={[styles.errorBox, { backgroundColor: theme.error + "20" }]}>
              <ThemedText type="caption" style={{ color: theme.error }}>{error}</ThemedText>
            </View>
          )}

          {sentCode && step === "otp" && (
            <View style={[styles.codeHint, { backgroundColor: theme.primary + "20" }]}>
              <ThemedText type="caption" style={{ color: theme.primary }}>Demo OTP: {sentCode}</ThemedText>
            </View>
          )}

          {step === "input" ? (
            <>
              {mode === "signup" && (
                <>
                  <TextInput 
                    style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]} 
                    placeholder="Full Name" 
                    placeholderTextColor={theme.textSecondary}
                    value={name} 
                    onChangeText={setName} 
                  />
                  <TextInput 
                    style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text, marginTop: Spacing.sm }]} 
                    placeholder="Email" 
                    placeholderTextColor={theme.textSecondary}
                    value={email} 
                    onChangeText={setEmail} 
                    keyboardType="email-address" 
                  />
                </>
              )}

              <View style={[styles.phoneInputContainer, { marginTop: Spacing.sm }]}>
                <View style={[styles.countryCode, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                  <ThemedText type="body">+62</ThemedText>
                </View>
                <TextInput 
                  style={[styles.phoneInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]} 
                  placeholder="Phone number" 
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad" 
                  value={phone} 
                  onChangeText={setPhone} 
                />
              </View>

              <TextInput 
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text, marginTop: Spacing.sm }]} 
                placeholder={mode === "forgot" ? "New Password" : "Password"} 
                placeholderTextColor={theme.textSecondary}
                secureTextEntry 
                value={password} 
                onChangeText={setPassword} 
              />

              {mode === "login" && (
                <Pressable onPress={() => setMode("forgot")} style={{ alignSelf: 'flex-end', marginTop: Spacing.sm }}>
                  <ThemedText type="caption" style={{ color: theme.primary }}>Forgot Password?</ThemedText>
                </Pressable>
              )}

              <Button 
                onPress={handleInitialAction} 
                disabled={isLoading || phone.length < 9 || (mode === 'signup' && !name)} 
                style={{ marginTop: Spacing.lg }}
              >
                {isLoading ? "Processing..." : mode === "login" ? "Login" : "Continue"}
              </Button>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.otpInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                placeholder="000000"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={setOtpCode}
                maxLength={6}
              />
              <Button onPress={handleVerifyOTP} disabled={otpCode.length !== 6 || isLoading}>
                {isLoading ? "Verifying..." : "Confirm OTP"}
              </Button>
              <Pressable onPress={() => { setStep("input"); setSentCode(null); }} style={styles.skipLink}>
                <ThemedText type="caption" style={{ color: theme.primary }}>Back to input</ThemedText>
              </Pressable>
            </>
          )}

          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ThemedText type="caption" style={[styles.dividerText, { color: theme.textSecondary }]}>Or continue with</ThemedText>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>

          <View style={styles.socialButtons}>
            <GoogleSignInButton onSuccess={onComplete} onError={setError} onLoadingChange={setIsLoading} theme={theme} />
            {Platform.OS === "ios" && (
              <Pressable 
                style={[styles.socialButton, { 
                  backgroundColor: colorScheme === 'dark' ? '#fff' : '#000',
                  borderWidth: 0
                }]}
                onPress={handleAppleSignIn}
              >
                <Feather name="smartphone" size={20} color={colorScheme === 'dark' ? '#000' : '#fff'} />
                <ThemedText 
                  type="body" 
                  style={[styles.socialButtonText, { color: colorScheme === 'dark' ? '#000' : '#fff' }]}
                >
                  Apple
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { 
    flexGrow: 1, 
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center'
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  content: { 
    width: '100%',
    maxWidth: 400,
  },
  tabContainer: { 
    flexDirection: 'row', 
    marginBottom: Spacing.lg, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  tab: { 
    flex: 1, 
    alignItems: 'center', 
    paddingBottom: Spacing.sm, 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent' 
  },
  title: { marginBottom: Spacing.lg, textAlign: 'center' },
  errorBox: { 
    padding: Spacing.md, 
    borderRadius: BorderRadius.sm, 
    marginBottom: Spacing.md 
  },
  codeHint: { 
    padding: Spacing.md, 
    borderRadius: BorderRadius.sm, 
    marginBottom: Spacing.md 
  },
  input: { 
    height: Spacing.inputHeight, 
    paddingHorizontal: Spacing.lg, 
    borderRadius: BorderRadius.sm, 
    borderWidth: 1, 
    fontSize: 16 
  },
  phoneInputContainer: { 
    flexDirection: "row", 
    gap: Spacing.sm 
  },
  countryCode: { 
    height: Spacing.inputHeight, 
    paddingHorizontal: Spacing.lg, 
    borderRadius: BorderRadius.sm, 
    borderWidth: 1, 
    justifyContent: "center" 
  },
  phoneInput: { 
    flex: 1, 
    height: Spacing.inputHeight, 
    paddingHorizontal: Spacing.lg, 
    borderRadius: BorderRadius.sm, 
    borderWidth: 1, 
    fontSize: 16 
  },
  otpInput: { 
    height: Spacing.inputHeight, 
    borderRadius: BorderRadius.sm, 
    borderWidth: 1, 
    fontSize: 24, 
    textAlign: "center", 
    letterSpacing: 8, 
    marginBottom: Spacing.lg 
  },
  dividerContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginVertical: Spacing.xl 
  },
  divider: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: Spacing.lg },
  socialButtons: { 
    flexDirection: "row", 
    gap: Spacing.md, 
    height: Spacing.buttonHeight 
  },
  socialButton: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    borderRadius: BorderRadius.sm, 
    gap: Spacing.sm 
  },
  socialButtonText: { fontWeight: "500" },
  skipLink: { 
    alignSelf: "center", 
    marginTop: Spacing.xl, 
    padding: Spacing.sm 
  },
});
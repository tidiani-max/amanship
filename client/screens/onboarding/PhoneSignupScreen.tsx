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
      <Feather name="mail" size={24} color={theme.text} />
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

  // Types
  type AuthMode = "login" | "signup" | "forgot";

  // Mode Logic
  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<"input" | "otp">("input");

  // Input States
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // FIX: Explicitly allow string, null, or undefined to match backend response types
  const [sentCode, setSentCode] = useState<string | null | undefined>(null);

  const fullPhone = `+62${phone}`;

// Inside PhoneSignupScreen component...

const handleInitialAction = async () => {
  // 1. Basic Validation before calling API
  if (mode === "signup") {
    if (!name || !email || !password) {
      Alert.alert("Missing Information", "Please fill in all fields to create an account.");
      return;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
  }

  setIsLoading(true);
  setError(null);

  if (mode === "login") {
    const result = await login(fullPhone, password);
    setIsLoading(false);
    if (result.success) {
      onComplete();
    } else {
      // Immediate Alert for login failures (e.g., "User not found")
      Alert.alert("Login Failed", result.error || "Invalid phone or password");
      setError(result.error || "Invalid credentials");
    }
    return;
  }

  // 2. Signup / Forgot Flow (Triggers Backend Check)
  // Your backend POST /api/auth/otp/send should check if the user exists
  const result = await sendOtp(fullPhone, mode as AuthMode); 
  setIsLoading(true); // Keep loading while we process result

  if (result.success) {
    setIsLoading(false);
    setSentCode(result.code); 
    setStep("otp");
  } else {
    setIsLoading(false);
    // 3. IMMEDIATE ALERT if User Exists (Signup) or User Missing (Forgot)
    // The error message comes directly from your backend check
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
      mode: mode as AuthMode // Cast to match Context Interface
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
      <View style={styles.content}>
        {/* Toggle Header */}
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
          <ThemedText type="caption" style={[styles.dividerText, { color: theme.textSecondary }]}>Social Login</ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.socialButtons}>
          <GoogleSignInButton onSuccess={onComplete} onError={setError} onLoadingChange={setIsLoading} theme={theme} />
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={colorScheme === 'dark' ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={BorderRadius.sm}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}
        </View>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: Spacing.lg },
  content: { flex: 1 },
  tabContainer: { flexDirection: 'row', marginBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingBottom: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  title: { marginBottom: Spacing.lg },
  errorBox: { padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  codeHint: { padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.md },
  input: { height: Spacing.inputHeight, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, fontSize: 16 },
  phoneInputContainer: { flexDirection: "row", gap: Spacing.sm },
  countryCode: { height: Spacing.inputHeight, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, justifyContent: "center" },
  phoneInput: { flex: 1, height: Spacing.inputHeight, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, fontSize: 16 },
  otpInput: { height: Spacing.inputHeight, borderRadius: BorderRadius.sm, borderWidth: 1, fontSize: 24, textAlign: "center", letterSpacing: 8, marginBottom: Spacing.lg },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.xl },
  divider: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: Spacing.lg },
  socialButtons: { flexDirection: "row", gap: Spacing.md, height: Spacing.buttonHeight },
  socialButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: BorderRadius.sm, gap: Spacing.sm },
  appleButton: { flex: 1 },
  socialButtonText: { fontWeight: "500" },
  skipLink: { alignSelf: "center", marginTop: Spacing.xl, padding: Spacing.sm },
});
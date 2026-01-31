import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform, Modal, useColorScheme, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from "react-native-reanimated";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

WebBrowser.maybeCompleteAuthSession();

const ZENDO_PURPLE = ['#4f46e5', '#7c3aed'] as const;

// ========================================
// BEAUTIFUL ALERT MODAL COMPONENT
// ========================================
function AlertModal({ visible, title, message, onClose, theme }: any) {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.modalOverlay}>
        <Animated.View entering={ZoomIn} exiting={ZoomOut} style={[styles.alertBox, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.alertIconBg}>
            <Feather name="alert-circle" size={32} color="#ef4444" />
          </View>
          <ThemedText style={styles.alertTitle}>{title}</ThemedText>
          <ThemedText style={styles.alertMessage}>{message}</ThemedText>
          <Pressable onPress={onClose} style={{ width: '100%' }}>
            <LinearGradient colors={ZENDO_PURPLE} style={styles.alertBtn}>
              <ThemedText style={styles.alertBtnText}>Got it</ThemedText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ========================================
// GOOGLE SIGN IN BUTTON
// ========================================
function GoogleSignInButton({ onSuccess, onError, onLoadingChange, theme }: any) {
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
      <ThemedText style={styles.socialButtonText}>Google</ThemedText>
    </Pressable>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function PhoneSignupScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const { sendOtp, verifyOtp, loginWithApple, login, resetFirstLoginPassword, checkPhone } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("signup");
  const [step, setStep] = useState<"phone" | "password" | "otp" | "resetPassword">("phone");

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [sentCode, setSentCode] = useState<string | null | undefined>(null);

  const fullPhone = `+62${phone}`;

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handlePhoneSubmit = async () => {
    if (phone.length < 9) { showAlert("Invalid Phone", "Please enter a valid phone number"); return; }
    setIsLoading(true);

    if (mode === "login") {
      const result = await checkPhone(fullPhone);
      setIsLoading(false);
      if (!result.exists) { showAlert("Account Not Found", result.message || "No account found."); return; }
      if (result.requiresPasswordReset) { setStep("resetPassword"); return; }
      setStep("password");
    } 
    else if (mode === "forgot") {
      const result = await sendOtp(fullPhone, "forgot");
      setIsLoading(false);
      if (result.success) { setSentCode(result.code); setStep("otp"); }
      else showAlert("Error", result.error || "Unable to send OTP");
    }
    else {
      const result = await sendOtp(fullPhone, mode);
      setIsLoading(false);
      if (result.success) { setSentCode(result.code); setStep("otp"); }
      else showAlert("Account Exists", result.error || "This phone is already registered");
    }
  };

  const handlePasswordSubmit = async () => {
    if (password.length < 4) { showAlert("Invalid Password", "At least 4 characters"); return; }
    setIsLoading(true);
    const result = await login(fullPhone, password);
    setIsLoading(false);
    if (result.success) onComplete();
    else showAlert("Login Failed", result.error || "Invalid credentials");
  };

const handleVerifyOTP = async () => {
  if (otpCode.length !== 6) { 
    showAlert("Invalid OTP", "Enter 6 digits"); 
    return; 
  }
  
  setIsLoading(true);
  const result = await verifyOtp(fullPhone, otpCode, { 
      name, email, password, 
      mode: mode === "forgot" ? "forgot" : "signup" 
  });
  setIsLoading(false);

  if (result.success) {
    if (mode === "forgot") {
      setStep("phone"); // Moved from logic chain to separate lines
      setMode("login");
    } else {
      onComplete();
    }
  } else {
    showAlert("Verification Failed", result.error || "Invalid OTP");
  }
};

const handleResetPassword = async () => {
  if (newPassword.length < 4 || newPassword !== confirmPassword) {
    showAlert("Error", "Passwords must match and be at least 4 characters");
    return;
  }
  
  setIsLoading(true); // Call separately
  const result = await resetFirstLoginPassword(fullPhone, newPassword);
  
  if (result.success) { 
    showAlert("Success", "Password updated!"); 
    setStep("phone"); // Call separately
    setMode("login"); 
  } else {
    showAlert("Error", result.error || "Failed");
  }
  setIsLoading(false);
};

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      setIsLoading(true);
      const result = await loginWithApple(credential.user, credential.email || undefined);
      setIsLoading(false);
      if (result.success) onComplete();
    } catch (e) {}
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.centerWrapper}>
          <View style={styles.content}>
            
            {step === "phone" && (
              <View style={styles.tabContainer}>
                <Pressable onPress={() => setMode("signup")} style={[styles.tab, mode === "signup" && styles.activeTab]}>
                  <ThemedText style={[styles.tabText, mode === "signup" && { color: '#4f46e5' }]}>Signup</ThemedText>
                </Pressable>
                <Pressable onPress={() => setMode("login")} style={[styles.tab, mode === "login" && styles.activeTab]}>
                  <ThemedText style={[styles.tabText, mode === "login" && { color: '#4f46e5' }]}>Login</ThemedText>
                </Pressable>
              </View>
            )}

            <ThemedText style={styles.title}>
                {step === "phone" && (mode === "signup" ? "Create Account" : mode === "forgot" ? "Reset Password" : "Welcome Back")}
                {step === "password" && "Enter Password"}
                {step === "otp" && "Verify Code"}
                {step === "resetPassword" && "Set Password"}
            </ThemedText>

            <View style={styles.inputContainer}>
              {/* SIGNUP FIELDS */}
              {step === "phone" && mode === "signup" && (
                <>
                  <TextInput placeholder="Full Name" value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#94a3b8" />
                  <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={[styles.input, { marginTop: 12 }]} keyboardType="email-address" placeholderTextColor="#94a3b8" />
                  <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={[styles.input, { marginTop: 12 }]} secureTextEntry placeholderTextColor="#94a3b8" />
                </>
              )}

              {/* PHONE INPUT */}
              {step === "phone" && (
                <View style={styles.phoneWrapper}>
                  <View style={styles.countryCode}><ThemedText style={{ fontWeight: 'bold' }}>+62</ThemedText></View>
                  <TextInput placeholder="Phone number" value={phone} onChangeText={setPhone} style={styles.phoneInput} keyboardType="phone-pad" placeholderTextColor="#94a3b8" />
                </View>
              )}

              {/* PASSWORD/RESET FIELDS */}
              {step === "password" && (
                <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry placeholderTextColor="#94a3b8" />
              )}
              {step === "resetPassword" && (
                <>
                    <TextInput placeholder="New Password" value={newPassword} onChangeText={setNewPassword} style={styles.input} secureTextEntry placeholderTextColor="#94a3b8" />
                    <TextInput placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} style={[styles.input, { marginTop: 12 }]} secureTextEntry placeholderTextColor="#94a3b8" />
                </>
              )}

              {/* OTP FIELD */}
              {step === "otp" && (
                <TextInput placeholder="000000" value={otpCode} onChangeText={setOtpCode} style={styles.otpInput} maxLength={6} keyboardType="number-pad" />
              )}

              <Pressable 
                onPress={step === "phone" ? handlePhoneSubmit : step === "password" ? handlePasswordSubmit : step === "resetPassword" ? handleResetPassword : handleVerifyOTP} 
                disabled={isLoading} 
                style={{ marginTop: 20 }}
              >
                <LinearGradient colors={ZENDO_PURPLE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.mainBtn}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.btnText}>Continue</ThemedText>}
                </LinearGradient>
              </Pressable>
            </View>

            {step === "phone" && (
                <>
                    <View style={styles.dividerContainer}><View style={styles.line} /><ThemedText style={styles.dividerText}>Or continue with</ThemedText><View style={styles.line} /></View>
                    <View style={styles.socialButtons}>
                        <GoogleSignInButton onSuccess={onComplete} onError={(err: any) => showAlert("Error", err)} onLoadingChange={setIsLoading} theme={theme} />
                    </View>
                </>
            )}
          </View>
        </View>

        <AlertModal visible={alertVisible} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} theme={theme} />
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 25, justifyContent: 'center' },
  centerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { width: '100%', maxWidth: 400 },
  tabContainer: { flexDirection: 'row', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tab: { flex: 1, alignItems: 'center', paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#4f46e5' },
  tabText: { fontWeight: '700', color: '#94a3b8' },
  title: { fontSize: 26, fontWeight: '900', color: '#1e293b', marginBottom: 25, textAlign: 'center' },
  inputContainer: { width: '100%' },
  input: { height: 60, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, borderWidth: 1.5, borderColor: '#e2e8f0', fontSize: 16, color: '#1e293b' },
  phoneWrapper: { flexDirection: 'row', marginTop: 12, gap: 10 },
  countryCode: { height: 60, width: 70, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  phoneInput: { flex: 1, height: 60, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, borderWidth: 1.5, borderColor: '#e2e8f0', fontSize: 16, color: '#1e293b' },
  otpInput: { height: 70, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0', fontSize: 28, textAlign: 'center', fontWeight: 'bold', letterSpacing: 8 },
  mainBtn: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
  line: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { paddingHorizontal: 15, color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  socialButtons: { flexDirection: 'row', gap: 12 },
  socialButton: { flex: 1, height: 55, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5 },
  socialButtonText: { fontWeight: '700', color: '#1e293b' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  alertBox: { width: '100%', maxWidth: 320, borderRadius: 24, padding: 25, alignItems: 'center' },
  alertIconBg: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  alertTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 8 },
  alertMessage: { textAlign: 'center', color: '#64748b', marginBottom: 20, lineHeight: 20 },
  alertBtn: { height: 50, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center' },
  alertBtnText: { color: '#fff', fontWeight: 'bold' }
});
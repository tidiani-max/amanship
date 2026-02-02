import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform, Modal, useColorScheme } from "react-native";
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

// Updated Brand Colors for QIKLY
const QIKLY_BLUE = '#3a7bd5';
const QIKLY_LIGHT_BLUE = '#f0f7ff';

// ========================================
// ALERT MODAL COMPONENT
// ========================================
function AlertModal({ visible, title, message, onClose, theme }: {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  theme: any;
}) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.alertBox, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.alertHeader}>
            <ThemedText type="h3">{title}</ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            {message}
          </ThemedText>
          <Button onPress={onClose} style={{ marginTop: Spacing.lg, backgroundColor: QIKLY_BLUE }}>
            Got it
          </Button>
        </View>
      </View>
    </Modal>
  );
}

// ========================================
// GOOGLE SIGN IN BUTTON
// ========================================
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

// ========================================
// MAIN COMPONENT
// ========================================
export default function PhoneSignupScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const colorScheme = useColorScheme();
  const { sendOtp, verifyOtp, loginWithApple, login, resetFirstLoginPassword, checkPhone } = useAuth();

  type AuthMode = "login" | "signup" | "forgot";
  type Step = "phone" | "password" | "otp" | "resetPassword";

  const [mode, setMode] = useState<AuthMode>("signup");
  const [step, setStep] = useState<Step>("phone");

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
    if (phone.length < 9) {
      showAlert("Invalid Phone", "Please enter a valid phone number");
      return;
    }
    setIsLoading(true);
    if (mode === "login") {
      const result = await checkPhone(fullPhone);
      setIsLoading(false);
      if (!result.exists) {
        showAlert("Account Not Found", result.message || "No account found. Let's create one!");
        setMode("signup");
        return;
      }
      if (result.requiresPasswordReset) {
        setStep("resetPassword");
        return;
      }
      setStep("password");
    } 
    else if (mode === "forgot") {
      const result = await sendOtp(fullPhone, "forgot");
      setIsLoading(false);
      if (result.success) {
        setSentCode(result.code);
        setStep("otp");
      } else {
        showAlert("Error", result.error || "Unable to send OTP");
      }
    }
    else {
      const result = await sendOtp(fullPhone, mode);
      setIsLoading(false);
      if (result.success) {
        setSentCode(result.code);
        setStep("otp");
      } else {
        showAlert("Account Exists", result.error || "This phone is already registered");
      }
    }
  };

  const handlePasswordSubmit = async () => {
    if (password.length < 4) {
      showAlert("Invalid Password", "Password must be at least 4 characters");
      return;
    }
    setIsLoading(true);
    const result = await login(fullPhone, password);
    setIsLoading(false);
    if (result.success) {
      onComplete();
    } else {
      showAlert("Login Failed", result.error || "Invalid credentials");
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      showAlert("Invalid OTP", "Please enter the 6-digit code");
      return;
    }
    if (mode === "forgot") {
      if (!password || password.length < 4) {
        showAlert("Invalid Password", "Please enter a password (min 4 characters)");
        return;
      }
      setIsLoading(true);
      const result = await verifyOtp(fullPhone, otpCode, { password, mode: "forgot" });
      setIsLoading(false);
      if (result.success) {
        showAlert("Success", "Password reset successfully! Please login.");
        setMode("login");
        setStep("phone");
        setPassword("");
        setOtpCode("");
      } else {
        showAlert("Verification Failed", result.error || "Invalid OTP");
      }
      return;
    }
    if (!name || !email || !password) {
      showAlert("Missing Information", "Please fill in all fields");
      return;
    }
    setIsLoading(true);
    const result = await verifyOtp(fullPhone, otpCode, { name, email, password, mode: "signup" });
    setIsLoading(false);
    if (result.success) {
      onComplete();
    } else {
      showAlert("Verification Failed", result.error || "Invalid OTP");
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 4) {
      showAlert("Invalid Password", "Password must be at least 4 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert("Password Mismatch", "Passwords do not match");
      return;
    }
    setIsLoading(true);
    const result = await resetFirstLoginPassword(fullPhone, newPassword);
    setIsLoading(false);
    if (result.success) {
      showAlert("Success", "Password updated successfully!");
      setMode("login");
      setStep("phone");
    } else {
      showAlert("Error", result.error || "Failed to update password");
    }
  };

  if (step === "resetPassword") {
    return (
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
        contentContainerStyle={[styles.container, { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <View style={styles.centerWrapper}>
          <View style={styles.content}>
            <View style={{ marginBottom: Spacing.lg, padding: Spacing.lg, backgroundColor: QIKLY_LIGHT_BLUE, borderRadius: BorderRadius.sm }}>
              <Feather name="lock" size={32} color={QIKLY_BLUE} style={{ alignSelf: 'center', marginBottom: Spacing.md }} />
              <ThemedText type="h2" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>Set Your Password</ThemedText>
            </View>
            <TextInput style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]} placeholder="New Password" placeholderTextColor={theme.textSecondary} secureTextEntry value={newPassword} onChangeText={setNewPassword} />
            <TextInput style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text, marginTop: Spacing.sm }]} placeholder="Confirm Password" placeholderTextColor={theme.textSecondary} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
            <Button onPress={handleResetPassword} disabled={isLoading || !newPassword || !confirmPassword} style={{ marginTop: Spacing.lg, backgroundColor: QIKLY_BLUE }}>
              {isLoading ? "Updating..." : "Set Password"}
            </Button>
          </View>
        </View>
        <AlertModal visible={alertVisible} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} theme={theme} />
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[styles.container, { paddingTop: headerHeight + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }]}
    >
      <View style={styles.centerWrapper}>
        <View style={styles.content}>
          {step === "phone" && (
            <View style={styles.tabContainer}>
              <Pressable onPress={() => { setMode("signup"); setStep("phone"); }} style={[styles.tab, mode === "signup" && { borderBottomColor: QIKLY_BLUE }]}>
                <ThemedText style={{ color: mode === "signup" ? QIKLY_BLUE : theme.textSecondary, fontWeight: '600' }}>Signup</ThemedText>
              </Pressable>
              <Pressable onPress={() => { setMode("login"); setStep("phone"); }} style={[styles.tab, mode === "login" && { borderBottomColor: QIKLY_BLUE }]}>
                <ThemedText style={{ color: mode === "login" ? QIKLY_BLUE : theme.textSecondary, fontWeight: '600' }}>Login</ThemedText>
              </Pressable>
            </View>
          )}

          <ThemedText type="h2" style={styles.title}>
            {step === "phone" && (mode === "signup" ? "Join Qikly" : mode === "forgot" ? "Reset Password" : "Welcome Back")}
            {step === "password" && "Security Check"}
            {step === "otp" && (mode === "forgot" ? "New Password" : "Verify Qikly Account")}
          </ThemedText>

          {sentCode && step === "otp" && (
            <View style={[styles.codeHint, { backgroundColor: QIKLY_LIGHT_BLUE }]}>
              <ThemedText type="caption" style={{ color: QIKLY_BLUE, fontWeight: '700' }}>Demo OTP: {sentCode}</ThemedText>
            </View>
          )}

          {step === "phone" && (
            <>
              {mode === "signup" && (
                <>
                  <TextInput style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]} placeholder="Full Name" placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} />
                  <TextInput style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text, marginTop: Spacing.sm }]} placeholder="Email Address" placeholderTextColor={theme.textSecondary} value={email} onChangeText={setEmail} keyboardType="email-address" />
                  <TextInput style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text, marginTop: Spacing.sm }]} placeholder="Password" placeholderTextColor={theme.textSecondary} secureTextEntry value={password} onChangeText={setPassword} />
                </>
              )}
              <View style={[styles.phoneInputContainer, { marginTop: Spacing.sm }]}>
                <View style={[styles.countryCode, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                  <ThemedText type="body">+62</ThemedText>
                </View>
                <TextInput style={[styles.phoneInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]} placeholder="Phone number" placeholderTextColor={theme.textSecondary} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
              </View>
              {mode === "login" && (
                <Pressable onPress={() => setMode("forgot")} style={{ alignSelf: 'flex-end', marginTop: Spacing.sm }}>
                  <ThemedText type="caption" style={{ color: QIKLY_BLUE }}>Forgot Password?</ThemedText>
                </Pressable>
              )}
              <Button onPress={handlePhoneSubmit} disabled={isLoading || phone.length < 9 || (mode === "signup" && (!name || !email || !password))} style={{ marginTop: Spacing.lg, backgroundColor: QIKLY_BLUE }}>
                {isLoading ? "Processing..." : "Continue"}
              </Button>
            </>
          )}

          {step === "password" && (
            <>
              <View style={[styles.phoneDisplay, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                <ThemedText type="body">{fullPhone}</ThemedText>
                <Pressable onPress={() => setStep("phone")}><Feather name="edit-2" size={16} color={QIKLY_BLUE} /></Pressable>
              </View>
              <TextInput style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text, marginTop: Spacing.md }]} placeholder="Enter Password" placeholderTextColor={theme.textSecondary} secureTextEntry value={password} onChangeText={setPassword} autoFocus />
              <Button onPress={handlePasswordSubmit} disabled={isLoading || password.length < 4} style={{ marginTop: Spacing.lg, backgroundColor: QIKLY_BLUE }}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </>
          )}

          {step === "otp" && (
            <>
              <TextInput style={[styles.otpInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]} placeholder="000000" placeholderTextColor={theme.textSecondary} keyboardType="number-pad" value={otpCode} onChangeText={setOtpCode} maxLength={6} />
              {mode === "forgot" && (
                <TextInput style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text, marginBottom: Spacing.md }]} placeholder="New Password" placeholderTextColor={theme.textSecondary} secureTextEntry value={password} onChangeText={setPassword} />
              )}
              <Button onPress={handleVerifyOTP} disabled={otpCode.length !== 6 || isLoading || (mode === "forgot" && password.length < 4)} style={{ backgroundColor: QIKLY_BLUE }}>
                {isLoading ? "Verifying..." : "Confirm & Continue"}
              </Button>
            </>
          )}

          {step === "phone" && (
            <>
              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <ThemedText type="caption" style={[styles.dividerText, { color: theme.textSecondary }]}>Or connect with</ThemedText>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              </View>
              <View style={styles.socialButtons}>
                <GoogleSignInButton onSuccess={onComplete} onError={(err) => showAlert("Error", err)} onLoadingChange={setIsLoading} theme={theme} />
              </View>
            </>
          )}
        </View>
      </View>
      <AlertModal visible={alertVisible} title={alertTitle} message={alertMessage} onClose={() => setAlertVisible(false)} theme={theme} />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: Spacing.lg, justifyContent: 'center' },
  centerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  content: { width: '100%', maxWidth: 400 },
  tabContainer: { flexDirection: 'row', marginBottom: Spacing.lg, borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', paddingBottom: Spacing.sm, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  title: { marginBottom: Spacing.lg, textAlign: 'center' },
  codeHint: { padding: Spacing.md, borderRadius: BorderRadius.sm, marginBottom: Spacing.md, alignItems: 'center' },
  input: { height: Spacing.inputHeight, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, fontSize: 16 },
  phoneInputContainer: { flexDirection: "row", gap: Spacing.sm },
  countryCode: { height: Spacing.inputHeight, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, justifyContent: "center" },
  phoneInput: { flex: 1, height: Spacing.inputHeight, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1, fontSize: 16 },
  phoneDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: Spacing.inputHeight, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.sm, borderWidth: 1 },
  otpInput: { height: Spacing.inputHeight, borderRadius: BorderRadius.sm, borderWidth: 1, fontSize: 24, textAlign: "center", letterSpacing: 8, marginBottom: Spacing.lg },
  dividerContainer: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.xl },
  divider: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: Spacing.lg },
  socialButtons: { flexDirection: "row", gap: Spacing.md, height: Spacing.buttonHeight },
  socialButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: BorderRadius.sm, gap: Spacing.sm },
  socialButtonText: { fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  alertBox: { width: '100%', maxWidth: 400, padding: Spacing.lg, borderRadius: BorderRadius.sm, elevation: 5 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  closeButton: { padding: Spacing.xs },
});
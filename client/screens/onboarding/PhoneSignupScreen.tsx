import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput, Pressable, Platform, Modal, useColorScheme, ActivityIndicator, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

// Brand Colors
const BRAND_PURPLE = '#6338f2';
const BRAND_PURPLE_LIGHT = '#f5f3ff';
const BRAND_MINT = '#10b981';

// ========================================
// ALERT MODAL COMPONENT (Upgraded)
// ========================================
function AlertModal({ visible, title, message, onClose, theme }: {
  visible: boolean; title: string; message: string; onClose: () => void; theme: any;
}) {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.alertBox, { backgroundColor: 'white' }]}>
          <View style={styles.alertIconBg}>
            <Feather name="info" size={24} color={BRAND_PURPLE} />
          </View>
          <ThemedText style={styles.alertTitle}>{title}</ThemedText>
          <ThemedText style={styles.alertMessage}>{message}</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.alertButton}>
            <ThemedText style={styles.alertButtonText}>Continue</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ========================================
// GOOGLE SIGN IN BUTTON (Styled)
// ========================================
function GoogleSignInButton({ onSuccess, onError, onLoadingChange }: any) {
  const { loginWithGoogle } = useAuth();
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      (async () => {
        try {
          onLoadingChange(true);
          const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${response.authentication?.accessToken}` }
          });
          const user = await res.json();
          const result = await loginWithGoogle(user.sub, user.email, user.name);
          onLoadingChange(false);
          if (result.success) onSuccess();
          else onError(result.error);
        } catch (e) {
          onLoadingChange(false);
          onError("Google login failed");
        }
      })();
    }
  }, [response]);

  return (
    <TouchableOpacity style={styles.googleBtn} onPress={() => promptAsync()}>
      <MaterialCommunityIcons name="google" size={20} color="#1e293b" />
      <ThemedText style={styles.googleBtnText}>Continue with Google</ThemedText>
    </TouchableOpacity>
  );
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function PhoneSignupScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { sendOtp, verifyOtp, login, resetFirstLoginPassword, checkPhone } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("signup");
  const [step, setStep] = useState<"phone" | "password" | "otp" | "resetPassword">("phone");

  const [form, setForm] = useState({ phone: "", name: "", email: "", password: "", otp: "", newPass: "", confPass: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: "", message: "" });
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const showAlert = (title: string, message: string) => setAlert({ visible: true, title, message });
  const fullPhone = `+62${form.phone}`;

  const handlePhoneSubmit = async () => {
    if (form.phone.length < 9) return showAlert("Invalid Phone", "Please enter a valid number");
    setIsLoading(true);
    
    if (mode === "login") {
      const res = await checkPhone(fullPhone);
      setIsLoading(false);
      if (!res.exists) return showAlert("Not Found", "No account linked to this phone.");
      setStep(res.requiresPasswordReset ? "resetPassword" : "password");
    } else {
      const res = await sendOtp(fullPhone, mode === "forgot" ? "forgot" : "signup");
      setIsLoading(false);
      if (res.success) {
        setDemoCode(res.code || null);
        setStep("otp");
      } else {
        showAlert("Error", res.error || "Something went wrong");
      }
    }
  };

  const handleAuthAction = async () => {
    setIsLoading(true);
    let result;
    if (step === "password") {
      result = await login(fullPhone, form.password);
    } else if (step === "otp") {
      result = await verifyOtp(fullPhone, form.otp, { ...form, mode });
    } else if (step === "resetPassword") {
      if (form.newPass !== form.confPass) { setIsLoading(false); return showAlert("Mismatch", "Passwords do not match"); }
      result = await resetFirstLoginPassword(fullPhone, form.newPass);
    }

    setIsLoading(false);
    if (result?.success) {
      if (step === "resetPassword" || (step === "otp" && mode === "forgot")) {
        showAlert("Success", "Password updated! Please login.");
        setMode("login"); setStep("phone");
      } else onComplete();
    } else showAlert("Failed", result?.error || "Check your details");
  };

  return (
    <KeyboardAwareScrollViewCompat style={{ flex: 1, backgroundColor: 'white' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.main, { paddingTop: insets.top + 40 }]}>
        
        {/* LOGO SECTION */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="moped" size={40} color="white" />
          </View>
          <ThemedText style={styles.brandName}>ZendO</ThemedText>
          <ThemedText style={styles.brandSub}>Fast. Reliable. Everywhere.</ThemedText>
        </View>

        {/* STEPPER / TABS */}
        {step === "phone" && (
          <View style={styles.tabBar}>
            <TouchableOpacity onPress={() => setMode("signup")} style={[styles.tab, mode === "signup" && styles.activeTab]}>
              <ThemedText style={[styles.tabText, mode === "signup" && styles.activeTabText]}>Create Account</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMode("login")} style={[styles.tab, mode === "login" && styles.activeTab]}>
              <ThemedText style={[styles.tabText, mode === "login" && styles.activeTabText]}>Sign In</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.formContainer}>
          {step === "phone" && (
            <>
              {mode === "signup" && (
                <View style={styles.inputWrapper}>
                  <Feather name="user" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput placeholder="Full Name" style={styles.premiumInput} value={form.name} onChangeText={t => setForm({...form, name: t})} />
                </View>
              )}
              <View style={styles.inputWrapper}>
                <View style={styles.countryCode}><ThemedText style={styles.countryCodeText}>🇮🇩 +62</ThemedText></View>
                <TextInput placeholder="Phone Number" keyboardType="phone-pad" style={styles.premiumInput} value={form.phone} onChangeText={t => setForm({...form, phone: t})} />
              </View>
              {mode === "signup" && (
                <View style={styles.inputWrapper}>
                  <Feather name="lock" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput placeholder="Password" secureTextEntry style={styles.premiumInput} value={form.password} onChangeText={t => setForm({...form, password: t})} />
                </View>
              )}
              <Button onPress={handlePhoneSubmit} disabled={isLoading} style={styles.primaryBtn}>
                {isLoading ? <ActivityIndicator color="white" /> : "Continue"}
              </Button>
            </>
          )}

          {(step === "password" || step === "otp") && (
            <View style={styles.verificationBox}>
              <ThemedText style={styles.stepTitle}>{step === "otp" ? "Verify OTP" : "Welcome Back"}</ThemedText>
              <ThemedText style={styles.stepSub}>Continuing with <ThemedText style={{fontWeight:'700'}}>{fullPhone}</ThemedText></ThemedText>
              
              {demoCode && step === "otp" && (
                <View style={styles.demoBadge}><ThemedText style={styles.demoText}>Demo Code: {demoCode}</ThemedText></View>
              )}

              <View style={styles.inputWrapper}>
                <Feather name={step === "otp" ? "hash" : "lock"} size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  placeholder={step === "otp" ? "6-digit code" : "Password"} 
                  secureTextEntry={step === "password"}
                  keyboardType={step === "otp" ? "number-pad" : "default"}
                  style={styles.premiumInput} 
                  value={step === "otp" ? form.otp : form.password} 
                  onChangeText={t => setForm({...form, [step === "otp" ? 'otp' : 'password']: t})} 
                />
              </View>
              <Button onPress={handleAuthAction} disabled={isLoading} style={styles.primaryBtn}>
                {isLoading ? <ActivityIndicator color="white" /> : "Verify & Continue"}
              </Button>
              <TouchableOpacity onPress={() => setStep("phone")}><ThemedText style={styles.backLink}>Change Phone Number</ThemedText></TouchableOpacity>
            </View>
          )}

          {step === "phone" && (
            <View style={styles.socialSection}>
              <View style={styles.dividerRow}><View style={styles.line} /><ThemedText style={styles.orText}>OR</ThemedText><View style={styles.line} /></View>
              <GoogleSignInButton onSuccess={onComplete} onError={(e:any) => showAlert("Error", e)} onLoadingChange={setIsLoading} />
            </View>
          )}
        </View>

        <View style={styles.footerTerms}>
          <ThemedText style={styles.termsText}>By continuing, you agree to our Terms & Privacy Policy</ThemedText>
        </View>
      </View>

      <AlertModal visible={alert.visible} title={alert.title} message={alert.message} onClose={() => setAlert({...alert, visible: false})} theme={theme} />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, paddingHorizontal: 30 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 28, backgroundColor: BRAND_PURPLE, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: BRAND_PURPLE, shadowOpacity: 0.3, shadowRadius: 10 },
  brandName: { fontSize: 32, fontWeight: '900', color: '#1e293b', marginTop: 15, letterSpacing: -1 },
  brandSub: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  tabBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 6, marginBottom: 30 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: 'white', elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  activeTabText: { color: BRAND_PURPLE },
  formContainer: { width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, height: 58, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  countryCode: { borderRightWidth: 1, borderRightColor: '#e2e8f0', paddingRight: 12, marginRight: 12 },
  countryCodeText: { fontWeight: '800', fontSize: 14, color: '#1e293b' },
  premiumInput: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
  primaryBtn: { backgroundColor: BRAND_PURPLE, borderRadius: 18, height: 58, marginTop: 10 },
  socialSection: { marginTop: 30 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  orText: { fontSize: 12, fontWeight: '800', color: '#cbd5e1' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, height: 58, borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white' },
  googleBtnText: { fontWeight: '700', color: '#1e293b' },
  verificationBox: { alignItems: 'center' },
  stepTitle: { fontSize: 24, fontWeight: '900', color: '#1e293b', marginBottom: 8 },
  stepSub: { color: '#64748b', marginBottom: 25 },
  demoBadge: { backgroundColor: BRAND_PURPLE_LIGHT, padding: 10, borderRadius: 10, marginBottom: 20 },
  demoText: { color: BRAND_PURPLE, fontWeight: '800', fontSize: 12 },
  backLink: { marginTop: 20, color: BRAND_PURPLE, fontWeight: '700', fontSize: 14 },
  footerTerms: { marginTop: 'auto', paddingVertical: 30, alignItems: 'center' },
  termsText: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  alertBox: { width: '100%', borderRadius: 24, padding: 25, alignItems: 'center' },
  alertIconBg: { width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND_PURPLE_LIGHT, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  alertTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginBottom: 10 },
  alertMessage: { color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  alertButton: { backgroundColor: BRAND_PURPLE, width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
  alertButtonText: { color: 'white', fontWeight: '800' }
});
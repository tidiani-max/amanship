// components/FirstLaunchLanguageModal.tsx
import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { Language } from '@/constants/translations';

const { width, height } = Dimensions.get('window');

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
];

interface FirstLaunchLanguageModalProps {
  visible: boolean;
  onSelectLanguage: (language: Language) => void;
}

export function FirstLaunchLanguageModal({
  visible,
  onSelectLanguage,
}: FirstLaunchLanguageModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  const handleSelect = (code: Language) => {
    setSelectedLanguage(code);
  };

  const handleConfirm = () => {
    if (selectedLanguage) {
      onSelectLanguage(selectedLanguage);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* App Logo */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#00d2ff', '#3a7bd5']}
              style={styles.logo}
            >
              <ThemedText style={styles.logoText} noTranslate>Q</ThemedText>
            </LinearGradient>
          </View>

          {/* Welcome Text */}
          <View style={styles.headerContainer}>
            <ThemedText style={styles.welcomeTitle} noTranslate>
              Welcome to Qikly
            </ThemedText>
            <ThemedText style={styles.welcomeSubtitle} noTranslate>
              Choose your language
            </ThemedText>
            <ThemedText style={styles.welcomeSubtitleID} noTranslate>
              Pilih bahasa Anda
            </ThemedText>
          </View>

          {/* Language Options */}
          <View style={styles.languageList}>
            {languages.map((lang) => (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageButton,
                  selectedLanguage === lang.code && styles.languageButtonSelected,
                ]}
                onPress={() => handleSelect(lang.code)}
              >
                <View style={styles.languageContent}>
                  <ThemedText style={styles.flag} noTranslate>
                    {lang.flag}
                  </ThemedText>
                  <View style={styles.languageTextContainer}>
                    <ThemedText
                      style={[
                        styles.languageName,
                        selectedLanguage === lang.code && styles.languageNameSelected,
                      ]}
                      noTranslate
                    >
                      {lang.name}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.languageNative,
                        selectedLanguage === lang.code && styles.languageNativeSelected,
                      ]}
                      noTranslate
                    >
                      {lang.nativeName}
                    </ThemedText>
                  </View>
                </View>

                {selectedLanguage === lang.code && (
                  <View style={styles.checkmark}>
                    <Feather name="check-circle" size={24} color="#6366f1" />
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* Confirm Button */}
          <Pressable
            style={[
              styles.confirmButton,
              !selectedLanguage && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedLanguage}
          >
            <LinearGradient
              colors={
                selectedLanguage
                  ? ['#6366f1', '#8b5cf6']
                  : ['#e5e7eb', '#e5e7eb']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmGradient}
            >
              <ThemedText style={styles.confirmText} noTranslate>
                {selectedLanguage === 'id' ? 'Lanjutkan' : 'Continue'}
              </ThemedText>
              <Feather
                name="arrow-right"
                size={20}
                color="white"
                style={{ marginLeft: 8 }}
              />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: Math.min(width - 40, 400),
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 48,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  welcomeSubtitleID: {
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  languageList: {
    width: '100%',
    gap: 12,
    marginBottom: 28,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
  },
  languageButtonSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 32,
    marginRight: 16,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 2,
  },
  languageNameSelected: {
    color: '#6366f1',
  },
  languageNative: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  languageNativeSelected: {
    color: '#818cf8',
  },
  checkmark: {
    marginLeft: 12,
  },
  confirmButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  confirmText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
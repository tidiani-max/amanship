import React, { useState } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditAddressScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("Jl. Sudirman No. 123");
  const [details, setDetails] = useState("Apartment Tower A, Unit 15B");
  const [city, setCity] = useState("Jakarta Selatan");

  const handleSave = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            Label
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="e.g., Home, Office"
            placeholderTextColor={theme.textSecondary}
            value={label}
            onChangeText={setLabel}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            Street Address
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Enter street address"
            placeholderTextColor={theme.textSecondary}
            value={address}
            onChangeText={setAddress}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            Additional Details (Optional)
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Apartment, floor, building name, etc."
            placeholderTextColor={theme.textSecondary}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
            City
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Enter city"
            placeholderTextColor={theme.textSecondary}
            value={city}
            onChangeText={setCity}
          />
        </View>
      </View>
      
      <View style={styles.footer}>
        <Button onPress={handleSave}>Save Address</Button>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
  },
  multilineInput: {
    height: 100,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  footer: {
    paddingTop: Spacing.lg,
  },
});

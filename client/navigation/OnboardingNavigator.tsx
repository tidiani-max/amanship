import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "@/screens/onboarding/WelcomeScreen";
import LocationScreen from "@/screens/onboarding/LocationScreen";
import PhoneSignupScreen from "@/screens/onboarding/PhoneSignupScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type OnboardingStackParamList = {
  Welcome: undefined;
  Location: undefined;
  PhoneSignup: undefined;
};

interface OnboardingNavigatorProps {
  onComplete: () => void;
}

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator({ onComplete }: OnboardingNavigatorProps) {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Location"
        component={LocationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PhoneSignup"
        options={{
          headerTitle: "Sign Up",
          headerTransparent: true,
        }}
      >
        {() => <PhoneSignupScreen onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

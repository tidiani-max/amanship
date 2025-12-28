// components/CallButton.tsx
import React from 'react';
import { Linking, TouchableOpacity } from 'react-native';
import { Feather } from "@expo/vector-icons";

export const CallButton = ({ phoneNumber }: { phoneNumber: string }) => {
  if (!phoneNumber) return null;

  return (
    <TouchableOpacity 
      onPress={() => Linking.openURL(`tel:${phoneNumber}`)}
      style={{ 
        backgroundColor: '#2ecc71', 
        padding: 12, 
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Feather name="phone" size={24} color="white" />
    </TouchableOpacity>
  );
};
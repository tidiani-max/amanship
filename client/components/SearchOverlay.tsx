import React from 'react';
import { View, Modal, Pressable, StyleSheet, Animated } from 'react-native';
import { SearchBar } from './SearchBar';
import { useTheme } from '@/hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SearchOverlayProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function SearchOverlay({
  visible,
  onClose,
  value,
  onChangeText,
  placeholder,
  children,
}: SearchOverlayProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
        />
        
        <View
          style={[
            styles.content,
            {
              backgroundColor: theme.backgroundRoot,
              paddingTop: insets.top,
            },
          ]}
        >
          <SearchBar
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            autoFocus
            onClear={() => onChangeText('')}
            showMicButton={false}
          />
          
          {children}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
  },
});
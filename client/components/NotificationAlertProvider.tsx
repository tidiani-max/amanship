// components/NotificationAlertProvider.tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useAuth } from '@/context/AuthContext';

const ALERT_DISMISSED_KEY = '@notification_alert_dismissed';
const CHECK_INTERVAL = 10000; // Check every 10 seconds

export function NotificationAlertProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [showAlert, setShowAlert] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const checkNotificationStatus = async () => {
      if (isChecking) return;
      setIsChecking(true);

      try {
        // Check if user has dismissed alert in this session
        const dismissed = await AsyncStorage.getItem(ALERT_DISMISSED_KEY);
        if (dismissed === 'true') {
          setIsChecking(false);
          return;
        }

        // Check notification permissions
        const { status } = await Notifications.getPermissionsAsync();
        
        if (status !== 'granted') {
          setShowAlert(true);
        }
      } catch (error) {
        console.error('Error checking notification status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Initial check
    checkNotificationStatus();

    // Periodic check
    const interval = setInterval(checkNotificationStatus, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [user?.id]);

  const handleEnableNotifications = async () => {
    // ✅ Skip on web platform
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Push notifications are not supported on web browsers.');
      return;
    }

    if (!Device.isDevice) {
      Alert.alert('Not Supported', 'Push notifications require a physical device.');
      return;
    }

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Needed',
          'Please enable notifications in your device settings to receive important updates.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Notifications.requestPermissionsAsync(),
            },
          ]
        );
        return;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '113ea7fa-db9e-4380-b05f-dd63a05e5632',
      });
      
      const token = tokenData.data;
      console.log('✅ Expo Push Token:', token);

      // Save token to backend
      if (user?.id) {
        const baseUrl = process.env.EXPO_PUBLIC_DOMAIN;
        await fetch(`${baseUrl}/api/users/push-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            token: token,
          }),
        });
        console.log('✅ Token saved to server');
      }

      // Setup Android channels
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD700',
          sound: 'default',
        });
      }

      // Send welcome notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Welcome! 🎉",
          body: "Notifications are now enabled. You'll receive important updates here.",
          data: { type: 'welcome', userId: user?.id },
          sound: 'default',
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2 
        },
      });

      setShowAlert(false);
      Alert.alert('Success! 🎉', 'Push notifications are now enabled. You\'ll receive important updates.');
      
    } catch (error) {
      console.error('Error enabling notifications:', error);
      Alert.alert('Error', 'Failed to enable notifications. Please try again.');
    }
  };

  const handleDismiss = async () => {
    // Mark as dismissed for this session
    await AsyncStorage.setItem(ALERT_DISMISSED_KEY, 'true');
    setShowAlert(false);
  };

  // ✅ Don't render alert on web
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      
      <Modal
        visible={showAlert}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Feather name="bell" size={48} color="#FFD700" />
              <View style={styles.badge}>
                <Feather name="alert-circle" size={20} color="#ff4444" />
              </View>
            </View>

            {/* Title */}
            <ThemedText style={styles.title}>
              Enable Notifications
            </ThemedText>

            {/* Message */}
            <ThemedText style={styles.message}>
              {user?.role === 'picker' 
                ? 'Get instant alerts when new orders arrive at your store!'
                : user?.role === 'driver'
                ? 'Receive notifications for new deliveries and stay updated!'
                : 'Stay updated on your order status and get important alerts!'}
            </ThemedText>

            {/* Features */}
            <View style={styles.features}>
              <View style={styles.featureRow}>
                <Feather name="check-circle" size={16} color="#4CAF50" />
                <ThemedText style={styles.featureText}>
                  {user?.role === 'picker' ? 'New order alerts' : user?.role === 'driver' ? 'Delivery notifications' : 'Order status updates'}
                </ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check-circle" size={16} color="#4CAF50" />
                <ThemedText style={styles.featureText}>
                  Real-time updates
                </ThemedText>
              </View>
              <View style={styles.featureRow}>
                <Feather name="check-circle" size={16} color="#4CAF50" />
                <ThemedText style={styles.featureText}>
                  Chat messages
                </ThemedText>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <TouchableOpacity 
                style={styles.enableButton}
                onPress={handleEnableNotifications}
              >
                <Feather name="bell" size={18} color="white" />
                <ThemedText style={styles.enableText}>
                  Enable Notifications
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.laterButton}
                onPress={handleDismiss}
              >
                <ThemedText style={styles.laterText}>
                  Maybe Later
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Close button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleDismiss}
            >
              <Feather name="x" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  features: {
    marginBottom: 24,
    paddingLeft: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  buttons: {
    gap: 12,
  },
  enableButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  enableText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  laterButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  laterText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
});
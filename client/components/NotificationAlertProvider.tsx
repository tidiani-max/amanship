import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useAuth } from '@/context/AuthContext';

const ALERT_DISMISSED_KEY = '@notification_alert_dismissed';
const CHECK_INTERVAL = 10000;
const BRAND_PURPLE = "#6338f2"; // Your brand purple

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
        const dismissed = await AsyncStorage.getItem(ALERT_DISMISSED_KEY);
        if (dismissed === 'true') {
          setIsChecking(false);
          return;
        }

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

    checkNotificationStatus();
    const interval = setInterval(checkNotificationStatus, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleEnableNotifications = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Push notifications are not supported on web.');
      return;
    }

    if (!Device.isDevice) {
      Alert.alert('Not Supported', 'Physical device required for notifications.');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Permission Needed', 'Enable notifications in settings to stay updated.');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '113ea7fa-db9e-4380-b05f-dd63a05e5632',
      });
      
      const token = tokenData.data;

      if (user?.id) {
        await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/users/push-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, token: token }),
        });
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: BRAND_PURPLE,
        });
      }

      setShowAlert(false);
      Alert.alert('Success! 🔔', 'You will now receive real-time updates.');
      
    } catch (error) {
      Alert.alert('Error', 'Failed to enable notifications.');
    }
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(ALERT_DISMISSED_KEY, 'true');
    setShowAlert(false);
  };

  if (Platform.OS === 'web') return <>{children}</>;

  return (
    <>
      {children}
      <Modal visible={showAlert} transparent animationType="fade" onRequestClose={handleDismiss}>
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            {/* ILLUSTRATION AREA */}
            <View style={styles.iconBackground}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="bell-ring" size={40} color={BRAND_PURPLE} />
              </View>
            </View>

            <ThemedText style={styles.title}>Don't Miss Out!</ThemedText>
            
            <ThemedText style={styles.message}>
              {user?.role === 'picker' 
                ? 'Get instant alerts when new orders arrive at your store!'
                : user?.role === 'driver'
                ? 'Stay notified about new deliveries and stay updated on the go!'
                : 'Track your order live and get notified exactly when it arrives!'}
            </ThemedText>

            {/* FEATURE PILLS */}
            <View style={styles.pillContainer}>
                <View style={styles.pill}><ThemedText style={styles.pillText}>Live Tracking</ThemedText></View>
                <View style={styles.pill}><ThemedText style={styles.pillText}>Chat Alerts</ThemedText></View>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.enableButton} onPress={handleEnableNotifications}>
                <ThemedText style={styles.enableText}>Turn on Notifications</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.laterButton} onPress={handleDismiss}>
                <ThemedText style={styles.laterText}>Maybe Later</ThemedText>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.closeX} onPress={handleDismiss}>
              <Feather name="x" size={20} color="#94a3b8" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)', // Deep slate overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  iconBackground: {
    marginBottom: 20,
    marginTop: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND_PURPLE + '15', // Light purple tint
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 20,
  },
  pillContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  pill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  buttons: {
    width: '100%',
    gap: 10,
  },
  enableButton: {
    backgroundColor: BRAND_PURPLE,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: BRAND_PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  enableText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
  },
  laterButton: {
    paddingVertical: 12,
  },
  laterText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeX: {
    position: 'absolute',
    top: 20,
    right: 20,
  }
});
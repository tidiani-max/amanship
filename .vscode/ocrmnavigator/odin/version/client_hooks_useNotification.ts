// hooks/useNotification.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '@/lib/query-client';
import { useAuth } from '@/context/AuthContext';

// Configure foreground notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotifications();

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📩 Notification received:', notification);
        const data = notification.request.content.data;
        console.log('📩 Notification data:', data);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user?.id]);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice || Platform.OS === 'web') {
      console.log('⚠️ Push notifications require a physical device');
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
        console.log('❌ Push notification permission denied');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '113ea7fa-db9e-4380-b05f-dd63a05e5632',
      });

      const token = tokenData.data;
      console.log('✅ Expo Push Token:', token);

      if (user?.id) {
        await apiRequest('POST', '/api/users/push-token', {
          userId: user.id,
          token,
        });
        console.log('✅ Token saved to server');
        await sendWelcomeNotification();
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD700',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500],
          lightColor: '#4CAF50',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('chat', {
          name: 'Chat Messages',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#2196F3',
          sound: 'default',
        });

        // ── NEW: Delivery proximity channel ─────────────────────────────────
        await Notifications.setNotificationChannelAsync('delivery', {
          name: 'Delivery Alerts',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 200, 500],
          lightColor: '#10b981',
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
    }
  };

  const sendWelcomeNotification = async () => {
    if (Platform.OS === 'web') return;

    try {
      const welcomeMessages: Record<string, { title: string; body: string }> = {
        customer: {
          title: "Welcome to ZendO! 🎉",
          body: "You'll receive live updates and driver location alerts here.",
        },
        picker: {
          title: "Welcome, Picker! 📦",
          body: "You'll be notified about new orders instantly.",
        },
        driver: {
          title: "Welcome, Driver! 🚚",
          body: "You'll receive delivery notifications here.",
        },
        admin: {
          title: "Welcome, Admin! 👑",
          body: "System notifications are enabled.",
        },
      };

      const msg = welcomeMessages[user?.role || 'customer'] || welcomeMessages.customer;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: msg.title,
          body:  msg.body,
          data:  { type: 'welcome', userId: user?.id },
          sound: 'default',
        },
        trigger: {
          type:    Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2,
        },
      });
    } catch (error) {
      console.error('❌ Failed to send welcome notification:', error);
    }
  };

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;
    console.log('🧭 Navigating from notification type:', data.type);

    try {
      switch (data.type) {
        // ── Picker ─────────────────────────────────────────────────────────────
        case 'new_order':
          if (user?.role === 'picker') {
            navigation.navigate('PickerDashboard');
          }
          break;

        // ── Driver ─────────────────────────────────────────────────────────────
        case 'packed_order':
          if (user?.role === 'driver') {
            navigation.navigate('DriverDashboard');
          }
          break;

        // ── Customer: generic order status ─────────────────────────────────────
        case 'order_status':
          if (data.orderId) {
            navigation.navigate('OrderTracking', { orderId: data.orderId });
          }
          break;

        // ── Customer: driver is ≤500 m away — open live tracking ───────────────
        case 'driver_nearby':
          if (data.orderId) {
            console.log(`📍 Driver nearby! ${data.distanceMeters}m — ETA ${data.etaMinutes} min`);
            navigation.navigate('OrderTracking', {
              orderId:       data.orderId,
              highlightMap:  true,   // OrderTracking screen can use this to scroll to map
            });
          }
          break;

        // ── Customer: driver has arrived at door ───────────────────────────────
        case 'driver_arrived':
          if (data.orderId) {
            console.log(`🛵 Driver arrived! PIN: ${data.deliveryPin}`);
            navigation.navigate('OrderTracking', {
              orderId:      data.orderId,
              showPinAlert: true,    // OrderTracking screen shows PIN reminder banner
              deliveryPin:  data.deliveryPin,
            });
          }
          break;

        // ── Chat ───────────────────────────────────────────────────────────────
        case 'chat_message':
          if (data.orderId) {
            navigation.navigate('Chat', { orderId: data.orderId });
          }
          break;

        default:
          console.log('Unknown notification type:', data.type);
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  return { registerForPushNotifications };
}
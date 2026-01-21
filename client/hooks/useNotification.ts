// hooks/useNotifications.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '@/lib/query-client';
import { useAuth } from '@/context/AuthContext';

// ✅ Configure how notifications are handled when app is in foreground (Fixed with all properties)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,  // ✅ Added
    shouldShowList: true,    // ✅ Added
  }),
});

export function useNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  
  // ✅ Fixed: Added initial value (undefined) to useRef
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    if (!user?.id) return;

    registerForPushNotifications();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📩 Notification received:', notification);
      }
    );

    // Listen for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      console.log('⚠️ Push notifications require a physical device');
      return;
    }

    // ✅ Skip notification setup on web
    if (Platform.OS === 'web') {
      console.log('⚠️ Push notifications not supported on web');
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
        console.log('❌ Failed to get push notification permissions');
        return;
      }

      // ✅ Use project ID from app.json extra.eas.projectId
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '113ea7fa-db9e-4380-b05f-dd63a05e5632',
      });
      
      const token = tokenData.data;
      console.log('✅ Expo Push Token:', token);

      // Save token to backend
      if (user?.id) {
        await apiRequest('POST', '/api/users/push-token', {
          userId: user.id,
          token: token,
        });
        console.log('✅ Token saved to server');

        // ✅ NEW: Send welcome notification after successful token registration
        await sendWelcomeNotification();
      }

      // Android-specific channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FFD700',
          sound: 'default',
        });

        // Channel for order updates (high priority)
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500],
          lightColor: '#4CAF50',
          sound: 'default',
        });

        // Channel for chat messages
        await Notifications.setNotificationChannelAsync('chat', {
          name: 'Chat Messages',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250],
          lightColor: '#2196F3',
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
    }
  };

  // ✅ NEW: Send welcome notification on login
  const sendWelcomeNotification = async () => {
    // Skip on web
    if (Platform.OS === 'web') return;

    try {
      // Get role-specific welcome message
      const welcomeMessages: Record<string, { title: string; body: string; emoji: string }> = {
        customer: {
          title: "Welcome to KilatGo! 🎉",
          body: "You'll receive updates about your orders here",
          emoji: "🛒"
        },
        picker: {
          title: "Welcome, Picker! 📦",
          body: "You'll be notified about new orders instantly",
          emoji: "📦"
        },
        driver: {
          title: "Welcome, Driver! 🚚",
          body: "You'll receive delivery notifications here",
          emoji: "🚚"
        },
        admin: {
          title: "Welcome, Admin! 👑",
          body: "System notifications are enabled",
          emoji: "👑"
        }
      };

      const roleMessage = welcomeMessages[user?.role || 'customer'] || welcomeMessages.customer;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: roleMessage.title,
          body: roleMessage.body,
          data: { type: 'welcome', userId: user?.id },
          sound: 'default',
        },
        trigger: { 
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 2 
        },
      });

      console.log('✅ Welcome notification scheduled');
    } catch (error) {
      console.error('❌ Failed to send welcome notification:', error);
    }
  };

  const handleNotificationNavigation = (data: any) => {
    if (!data) return;

    console.log('🧭 Navigating from notification:', data);

    try {
      switch (data.type) {
        case 'new_order':
          if (user?.role === 'picker') {
            navigation.navigate('PickerDashboard');
          }
          break;

        case 'packed_order':
          if (user?.role === 'driver') {
            navigation.navigate('DriverDashboard');
          }
          break;

        case 'order_status':
          if (data.orderId) {
            navigation.navigate('OrderTracking', { orderId: data.orderId });
          }
          break;

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

  return {
    registerForPushNotifications,
  };
}
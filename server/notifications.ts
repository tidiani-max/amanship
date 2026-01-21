// server/notifications.ts
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { db } from './db';
import { users, orders, messages } from '../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

const expo = new Expo();

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'high';
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
      console.log(`⚠️ No valid push token for user ${userId}`);
      return;
    }

    const message: ExpoPushMessage = {
      to: user.pushToken,
      sound: payload.sound || 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: payload.priority || 'high',
      badge: payload.badge,
    };

    const chunks = expo.chunkPushNotifications([message]);
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('✅ Notification sent:', ticketChunk);
        
        // Handle errors in tickets
        ticketChunk.forEach((ticket, index) => {
          if (ticket.status === 'error') {
            console.error(`❌ Notification error for ${user.pushToken}:`, ticket.message);
            if (ticket.details?.error === 'DeviceNotRegistered') {
              // Token is invalid, clear it
              db.update(users)
                .set({ pushToken: null })
                .where(eq(users.id, userId))
                .catch(err => console.error('Failed to clear invalid token:', err));
            }
          }
        });
      } catch (error) {
        console.error('❌ Failed to send notification chunk:', error);
      }
    }
  } catch (error) {
    console.error(`❌ Push notification error for user ${userId}:`, error);
  }
}

/**
 * Notify all pickers in a store about a new order
 */
export async function notifyPickersNewOrder(storeId: string, orderId: string): Promise<void> {
  try {
    // Get all online pickers for this store
    const pickers = await db
      .select({ userId: users.id, pushToken: users.pushToken })
      .from(users)
      .innerJoin(
        db.select().from(require('../shared/schema').storeStaff).where(
          and(
            eq(require('../shared/schema').storeStaff.storeId, storeId),
            eq(require('../shared/schema').storeStaff.role, 'picker'),
            eq(require('../shared/schema').storeStaff.status, 'online')
          )
        ).as('staff'),
        eq(users.id, 'staff.userId' as any)
      );

    const notifications = pickers
      .filter(p => p.pushToken && Expo.isExpoPushToken(p.pushToken))
      .map(p => ({
        to: p.pushToken!,
        sound: 'default' as const,
        title: '📦 New Order Available',
        body: 'A new order is ready for picking!',
        data: { orderId, type: 'new_order', screen: 'PickerDashboard' },
        priority: 'high' as const,
      }));

    if (notifications.length > 0) {
      const chunks = expo.chunkPushNotifications(notifications);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`✅ Notified ${notifications.length} pickers about order ${orderId}`);
    }
  } catch (error) {
    console.error('❌ Failed to notify pickers:', error);
  }
}

/**
 * Notify available drivers about a packed order
 */
export async function notifyDriversPackedOrder(storeId: string, orderId: string): Promise<void> {
  try {
    // Get all online drivers with no active deliveries
    const availableDrivers = await db
      .select({ userId: users.id, pushToken: users.pushToken })
      .from(users)
      .innerJoin(
        db.select().from(require('../shared/schema').storeStaff).where(
          and(
            eq(require('../shared/schema').storeStaff.storeId, storeId),
            eq(require('../shared/schema').storeStaff.role, 'driver'),
            eq(require('../shared/schema').storeStaff.status, 'online')
          )
        ).as('staff'),
        eq(users.id, 'staff.userId' as any)
      )
      .where(
        // No active deliveries
        isNull(
          db.select().from(orders).where(
            and(
              eq(orders.driverId, users.id),
              eq(orders.status, 'delivering')
            )
          ).as('activeOrder')
        )
      );

    const notifications = availableDrivers
      .filter(d => d.pushToken && Expo.isExpoPushToken(d.pushToken))
      .map(d => ({
        to: d.pushToken!,
        sound: 'default' as const,
        title: '🚚 Order Ready for Delivery',
        body: 'A packed order is waiting for pickup!',
        data: { orderId, type: 'packed_order', screen: 'DriverDashboard' },
        priority: 'high' as const,
      }));

    if (notifications.length > 0) {
      const chunks = expo.chunkPushNotifications(notifications);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`✅ Notified ${notifications.length} drivers about packed order ${orderId}`);
    }
  } catch (error) {
    console.error('❌ Failed to notify drivers:', error);
  }
}

/**
 * Notify customer about order status change
 */
export async function notifyCustomerOrderStatus(
  orderId: string,
  status: string
): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;

    const statusMessages: Record<string, { title: string; body: string }> = {
      confirmed: {
        title: '✅ Order Confirmed',
        body: 'Your order has been confirmed and is being prepared.',
      },
      picking: {
        title: '📦 Order Being Picked',
        body: 'Your items are being collected from the store.',
      },
      packed: {
        title: '📦 Order Packed',
        body: 'Your order is packed and waiting for a driver.',
      },
      delivering: {
        title: '🚚 Out for Delivery',
        body: 'Your order is on the way!',
      },
      delivered: {
        title: '✅ Order Delivered',
        body: 'Your order has been delivered. Enjoy!',
      },
      cancelled: {
        title: '❌ Order Cancelled',
        body: 'Your order has been cancelled.',
      },
    };

    const message = statusMessages[status];
    if (!message) return;

    await sendPushNotification(order.userId, {
      ...message,
      data: { orderId, status, type: 'order_status', screen: 'OrderTracking' },
      priority: 'high',
    });
  } catch (error) {
    console.error('❌ Failed to notify customer:', error);
  }
}

/**
 * Notify about new chat message
 */
export async function notifyChatMessage(
  orderId: string,
  senderId: string,
  messageContent: string
): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;

    // Determine receiver (if sender is customer, notify driver and vice versa)
    const receiverId = senderId === order.userId ? order.driverId : order.userId;
    if (!receiverId) return;

    const [sender] = await db.select().from(users).where(eq(users.id, senderId));
    const senderName = sender?.name || sender?.username || 'Someone';

    await sendPushNotification(receiverId, {
      title: `💬 ${senderName}`,
      body: messageContent.substring(0, 100),
      data: { orderId, senderId, type: 'chat_message', screen: 'Chat' },
      priority: 'high',
    });
  } catch (error) {
    console.error('❌ Failed to notify chat message:', error);
  }
}
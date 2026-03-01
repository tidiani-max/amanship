// server/notifications.ts
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { db } from './db';
import { users, orders, storeStaff } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

const expo = new Expo();

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'high';
}

// ── Core: send to single user ─────────────────────────────────────────────────
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
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket) => {
          if (ticket.status === 'error') {
            console.error(`❌ Push error:`, ticket.message);
            if ((ticket as any).details?.error === 'DeviceNotRegistered') {
              db.update(users).set({ pushToken: null }).where(eq(users.id, userId)).catch(console.error);
            }
          }
        });
      } catch (err) {
        console.error('❌ Chunk send failed:', err);
      }
    }
  } catch (err) {
    console.error(`❌ sendPushNotification(${userId}):`, err);
  }
}

// ── Pickers: new order ────────────────────────────────────────────────────────
export async function notifyPickersNewOrder(storeId: string, orderId: string): Promise<void> {
  try {
    const pickerStaff = await db.select().from(storeStaff).where(
      and(eq(storeStaff.storeId, storeId), eq(storeStaff.role, 'picker'), eq(storeStaff.status, 'online'))
    );
    const notifications: ExpoPushMessage[] = [];
    for (const staff of pickerStaff) {
      const [user] = await db.select().from(users).where(eq(users.id, staff.userId));
      if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
        notifications.push({ to: user.pushToken, sound: 'default', title: '📦 New Order Available', body: 'A new order is ready for picking!', data: { orderId, type: 'new_order', screen: 'PickerDashboard' }, priority: 'high' });
      }
    }
    if (notifications.length > 0) {
      const chunks = expo.chunkPushNotifications(notifications);
      for (const chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
      console.log(`✅ Notified ${notifications.length} pickers about order ${orderId}`);
    }
  } catch (err) { console.error('❌ notifyPickersNewOrder:', err); }
}

// ── Drivers: packed order ─────────────────────────────────────────────────────
export async function notifyDriversPackedOrder(storeId: string, orderId: string): Promise<void> {
  try {
    const driverStaff = await db.select().from(storeStaff).where(
      and(eq(storeStaff.storeId, storeId), eq(storeStaff.role, 'driver'), eq(storeStaff.status, 'online'))
    );
    const notifications: ExpoPushMessage[] = [];
    for (const staff of driverStaff) {
      const [activeOrder] = await db.select().from(orders).where(and(eq(orders.driverId, staff.userId), eq(orders.status, 'delivering'))).limit(1);
      if (activeOrder) continue;
      const [user] = await db.select().from(users).where(eq(users.id, staff.userId));
      if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
        notifications.push({ to: user.pushToken, sound: 'default', title: '🚚 Order Ready for Delivery', body: 'A packed order is waiting for pickup!', data: { orderId, type: 'packed_order', screen: 'DriverDashboard' }, priority: 'high' });
      }
    }
    if (notifications.length > 0) {
      const chunks = expo.chunkPushNotifications(notifications);
      for (const chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
      console.log(`✅ Notified ${notifications.length} drivers about packed order ${orderId}`);
    }
  } catch (err) { console.error('❌ notifyDriversPackedOrder:', err); }
}

// ── Customer: order status ────────────────────────────────────────────────────
export async function notifyCustomerOrderStatus(orderId: string, status: string): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;

    const msgs: Record<string, { title: string; body: string }> = {
      confirmed:     { title: '✅ Order Confirmed',        body: 'Your order has been confirmed and is being prepared.' },
      picking:       { title: '📦 Order Being Picked',     body: 'Your items are being collected from the store.' },
      packed:        { title: '📦 Order Packed',           body: 'Your order is packed and waiting for a driver.' },
      delivering:    { title: '🚚 Out for Delivery',       body: 'Your order is on the way! Track your driver live.' },
      // ── NEW ──────────────────────────────────────────────────────────────
      driver_nearby: { title: '📍 Driver is Nearby!',      body: 'Your driver is close — get ready to receive your order!' },
      arrived:       { title: '🛵 Driver Has Arrived!',    body: 'Your driver is at your door. Please give your 4-digit PIN.' },
      // ─────────────────────────────────────────────────────────────────────
      delivered:     { title: '✅ Order Delivered',        body: 'Your order has been delivered. Enjoy!' },
      cancelled:     { title: '❌ Order Cancelled',        body: 'Your order has been cancelled.' },
    };

    const message = msgs[status];
    if (!message) return;

    await sendPushNotification(order.userId, {
      ...message,
      data: { orderId, status, type: 'order_status', screen: 'OrderTracking' },
      priority: 'high',
    });
  } catch (err) { console.error('❌ notifyCustomerOrderStatus:', err); }
}

// ── NEW: Customer — driver is within 500 m ────────────────────────────────────
export async function notifyCustomerDriverNearby(
  orderId: string,
  distanceMeters: number,
  etaMinutes: number
): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;
    if ((order as any).driverNearbyNotified) {
      console.log(`ℹ️ Nearby already sent for order ${orderId}`);
      return;
    }

    const distText = distanceMeters < 1000
      ? `${Math.round(distanceMeters)} m`
      : `${(distanceMeters / 1000).toFixed(1)} km`;
    const etaText = etaMinutes <= 1 ? 'less than a minute' : `about ${etaMinutes} min`;

    await sendPushNotification(order.userId, {
      title: '📍 Driver Nearby!',
      body: `Your driver is ${distText} away and will arrive in ${etaText}. Get ready!`,
      data: { orderId, type: 'driver_nearby', screen: 'OrderTracking', distanceMeters, etaMinutes },
      priority: 'high',
    });

    // Mark so we don't spam
    await db.update(orders).set({ driverNearbyNotified: true } as any).where(eq(orders.id, orderId));
    console.log(`📍 Nearby notification sent for order ${orderId}`);
  } catch (err) { console.error('❌ notifyCustomerDriverNearby:', err); }
}

// ── NEW: Customer — driver arrived at door ────────────────────────────────────
export async function notifyCustomerDriverArrived(orderId: string): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;

    await sendPushNotification(order.userId, {
      title: '🛵 Your Driver Has Arrived!',
      body: `Please open the door and give your driver the PIN: ${order.deliveryPin}`,
      data: { orderId, type: 'driver_arrived', screen: 'OrderTracking', deliveryPin: order.deliveryPin },
      priority: 'high',
    });
    console.log(`🛵 Arrived notification sent for order ${orderId}`);
  } catch (err) { console.error('❌ notifyCustomerDriverArrived:', err); }
}

// ── Chat message ──────────────────────────────────────────────────────────────
export async function notifyChatMessage(orderId: string, senderId: string, messageContent: string): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
    if (!order) return;
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
  } catch (err) { console.error('❌ notifyChatMessage:', err); }
}
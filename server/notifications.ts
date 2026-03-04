// server/notifications.ts
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { db } from './db';
import { users, orders, storeStaff, stores, products, addresses, orderItems } from '../shared/schema';
import { eq, and, gte, desc, inArray } from 'drizzle-orm';

const expo = new Expo();

// ── Haversine distance helper ──────────────────────────────────────────────────
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

// ─── Geo + category filtered customer lookup ──────────────────────────────────

async function getNearbyCustomersWhoOrderedCategory(
  storeId: string,
  categoryId: string,
  radiusKm = 5,
  maxRecipients = 50
): Promise<string[]> {
  try {
    const [store] = await db.select().from(stores).where(eq(stores.id, storeId));
    if (!store) return [];

    const storeLat = parseFloat(store.latitude as string);
    const storeLng = parseFloat(store.longitude as string);

    const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000);

    // Get customers who ordered from this store & category in last 60 days
    // Get customers who ordered from this store in last 60 days with push tokens
    const customersWithOrders = await db
      .selectDistinct({ userId: orders.userId, pushToken: users.pushToken })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(
        and(
          eq(orders.storeId, storeId),
          eq(orders.status, 'delivered'),
          gte(orders.createdAt, sixtyDaysAgo)
        )
      )
      .limit(200);

    // Filter by proximity using their default address
    const nearby: string[] = [];

    for (const customer of customersWithOrders) {
      if (!customer.pushToken || !Expo.isExpoPushToken(customer.pushToken)) continue;
      if (nearby.length >= maxRecipients) break;

      const [defaultAddr] = await db
        .select()
        .from(addresses)
        .where(and(eq(addresses.userId, customer.userId), eq(addresses.isDefault, true)))
        .limit(1);

      if (!defaultAddr) continue;

      const lat = parseFloat(defaultAddr.latitude as string);
      const lng = parseFloat(defaultAddr.longitude as string);

      if (distanceKm(storeLat, storeLng, lat, lng) <= radiusKm) {
        nearby.push(customer.userId);
      }
    }

    return nearby;
  } catch (err) {
    console.error('❌ getNearbyCustomersWhoOrderedCategory:', err);
    return [];
  }
}

// ─── Notify nearby customers: expiry discount ────────────────────────────────
export async function notifyNearbyCustomersExpiryDiscount(
  productId: string,
  storeId: string,
  discountPercent: number
): Promise<void> {
  try {
    const [product] = await db
      .select({ name: products.name, categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) return;

    const recipientIds = await getNearbyCustomersWhoOrderedCategory(
      storeId,
      product.categoryId
    );

    const messages: ExpoPushMessage[] = [];

    for (const userId of recipientIds) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) continue;

      messages.push({
        to: user.pushToken,
        sound: 'default',
        title: `🔥 ${product.name} Diskon ${discountPercent}%!`,
        body: `Stok terbatas, segera pesan sebelum kehabisan!`,
        data: { type: 'expiry_discount', productId, storeId },
        priority: 'high',
      });
    }

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
      console.log(`📢 Sent expiry discount notification to ${messages.length} customers`);
    }
  } catch (err) {
    console.error('❌ notifyNearbyCustomersExpiryDiscount:', err);
  }
}

// ─── Notify nearby customers: bundle deal ────────────────────────────────────
export async function notifyNearbyCustomersBundleDeal(
  bundle: { id: string; suggestedName: string; items: any[]; suggestedBundlePrice: number },
  storeId: string
): Promise<void> {
  try {
    // Use first item's category for filtering
    const firstItem = bundle.items?.[0];
    if (!firstItem) return;

    const [firstProduct] = await db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, firstItem.productId))
      .limit(1);

    const categoryId = firstProduct?.categoryId ?? '';

    const recipientIds = await getNearbyCustomersWhoOrderedCategory(storeId, categoryId);

    const itemNames = bundle.items.slice(0, 2).map((i: any) => i.productName).join(' + ');
    const price = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(bundle.suggestedBundlePrice);

    const messages: ExpoPushMessage[] = [];

    for (const userId of recipientIds) {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) continue;

      messages.push({
        to: user.pushToken,
        sound: 'default',
        title: `🎁 ${bundle.suggestedName}`,
        body: `${itemNames} hanya ${price}! Promo terbatas.`,
        data: { type: 'bundle_deal', bundleId: bundle.id, storeId },
        priority: 'high',
      });
    }

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
      console.log(`📢 Sent bundle deal notification to ${messages.length} customers`);
    }
  } catch (err) {
    console.error('❌ notifyNearbyCustomersBundleDeal:', err);
  }
}
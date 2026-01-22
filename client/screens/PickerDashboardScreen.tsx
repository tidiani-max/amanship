import React, { useState, useMemo } from "react";
import { 
  View, StyleSheet, ScrollView, RefreshControl, 
  Pressable, Switch, TextInput, Modal, Image, TouchableOpacity, ActivityIndicator, Alert 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/lib/image-url"; 
import { Spacing } from "@/constants/theme";
import { OrderReceipt } from "@/components/OrderReceipt";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN!;

interface Category {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  productId: string;
  stockCount: number;
  location?: string;
  categoryId?: string;
  product: {
    id: string;
    name: string;
    brand: string;
    price: number;
    originalPrice?: number;
    description?: string;
    image?: string; 
    category?: { name: string };
  };
}

function OrderCard({ 
  order, 
  onUpdateStatus,
  storeName,
  userId
}: { 
  order: any; 
  onUpdateStatus: (id: string, nextStatus: string) => void;
  storeName: string;
  userId: string;
}) {
  const { theme } = useTheme();
  
  const status = order?.status || "pending";
  const total = order?.total ? Number(order.total).toLocaleString() : "0";

  let buttonText = "Start Picking";
  let nextStatus = "picking";
  let icon: any = "package";

  if (status === "picking") {
    buttonText = "Mark as Packed";
    nextStatus = "packed";
    icon = "check-circle";
  } else if (status === "packed") {
    buttonText = "Waiting for Driver";
    nextStatus = ""; 
    icon = "truck";
  }

  const customerInfo = {
    name: order.customerName || "Customer",
    phone: order.customerPhone || undefined,
    email: order.customerEmail || undefined,
  };

  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="h3">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Status: <ThemedText type="caption" style={{ color: theme.primary, fontWeight: 'bold' }}>{status.toUpperCase()}</ThemedText>
          </ThemedText>
        </View>
        <ThemedText style={styles.orderPrice}>Rp {total}</ThemedText>
      </View>

      {Array.isArray(order.items) && order.items.length > 0 && (
        <View style={{ marginTop: 10 }}>
          {order.items.map((item: any, idx: number) => (
            <View key={idx} style={{ flexDirection: "row", marginBottom: 8, alignItems: "center" }}>
              <Image source={{ uri: getImageUrl(item.image) }} style={{ width: 40, height: 40, borderRadius: 6, marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <ThemedText type="body">{item.name}</ThemedText>
                <ThemedText type="caption">Qty: {item.quantity} · 📍 {item.location || "N/A"}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      )}

      <OrderReceipt
        order={{
          id: order.id,
          orderNumber: order.orderNumber || `ORD-${order.id.slice(0, 8)}`,
          total: order.total || 0,
          deliveryFee: order.deliveryFee || 10000,
          createdAt: order.createdAt || new Date().toISOString(),
          items: order.items || [],
        }}
        customer={customerInfo}
        storeName={storeName}
      />
      
      {nextStatus !== "" && (
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: status === "picking" ? "#2ecc71" : theme.primary }]}
          onPress={() => onUpdateStatus(order.id, nextStatus)}
        >
          <Feather name={icon} size={16} color="white" />
          <ThemedText style={styles.actionBtnText}>{buttonText}</ThemedText>
        </TouchableOpacity>
      )}
    </Card>
  );
}

function CustomAlertModal({ 
  visible, 
  title, 
  message, 
  onClose 
}: { 
  visible: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
}) {
  if (!visible) return null;
  
  return (
    <Modal transparent visible={visible} animationType="fade">
      <Pressable style={styles.alertOverlay} onPress={onClose}>
        <View style={styles.alertContainer}>
          <ThemedText type="h3" style={styles.alertTitle}>{title}</ThemedText>
          <ThemedText style={styles.alertMessage}>{message}</ThemedText>
          <TouchableOpacity style={styles.alertButton} onPress={onClose}>
            <ThemedText style={styles.alertButtonText}>Close</ThemedText>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

export default function PickerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();

  const [activeTab, setActiveTab] = useState<"orders" | "inventory">("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null);
  const [formImage, setFormImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/categories`);
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (Array.isArray(json.categories)) return json.categories;
      if (Array.isArray(json.data)) return json.data;
      return [];
    }
  });

  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = useQuery<InventoryItem[]>({
    queryKey: ["/api/picker/inventory", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/picker/inventory?userId=${user?.id || 'demo-picker'}`);
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ["/api/picker/dashboard", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/picker/dashboard?userId=${user?.id || 'demo-picker'}`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const ordersToDisplay = useMemo(() => {
    if (!dashboard?.orders) return [];
    const allOrders = [
      ...(dashboard.orders.pending || []),
      ...(dashboard.orders.active || []),
      ...(dashboard.orders.packed || []),
    ];
    return allOrders.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [dashboard]);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => 
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventory, searchQuery]);

  const onRefresh = async () => {
    await Promise.all([refetchInv(), refetchDash()]);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    
    if (!result.canceled && result.assets[0]) {
      setFormImage(result.assets[0].uri);
      setImageChanged(true);
    }
  };

  const openEditModal = (item?: InventoryItem) => {
    if (item) {
      setIsEditing(true);
      setSelectedInventoryId(item.id);
      setFormName(item.product.name);
      setFormBrand(item.product.brand || "");
      setFormDescription(item.product.description || "");
      setFormOriginalPrice(item.product.originalPrice?.toString() || "");
      setFormPrice(item.product.price.toString());
      setFormStock(item.stockCount.toString());
      setFormLocation(item.location ?? "");
      setFormCategoryId(item.categoryId || (item as any).product?.categoryId || null);
      setFormImage(item.product.image ?? null);
      setImageChanged(false);
    } else {
      setIsEditing(false);
      setSelectedInventoryId(null);
      setFormName("");
      setFormBrand("");
      setFormDescription("");
      setFormOriginalPrice("");
      setFormPrice("");
      setFormStock("");
      setFormLocation("");
      setFormCategoryId(null);
      setFormImage(null);
      setImageChanged(false);
    }
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
    if (!user || !user.id) {
      showAlert("Error", "You must be logged in to save products.");
      return;
    }

    if (!formCategoryId) {
      showAlert("Category Required", "Please select a category for this product.");
      return;
    }

    if (!formName.trim()) {
      showAlert("Name Required", "Please enter a product name.");
      return;
    }

    if (!formPrice.trim() || isNaN(Number(formPrice)) || Number(formPrice) <= 0) {
      showAlert("Invalid Price", "Please enter a valid price greater than 0.");
      return;
    }

    if (!formStock.trim() || isNaN(Number(formStock)) || Number(formStock) < 0) {
      showAlert("Invalid Stock", "Please enter a valid stock quantity (0 or more).");
      return;
    }

    if (formOriginalPrice.trim() && (isNaN(Number(formOriginalPrice)) || Number(formOriginalPrice) <= 0)) {
      showAlert("Invalid Original Price", "Original price must be a valid number greater than 0.");
      return;
    }

    if (formOriginalPrice.trim() && Number(formOriginalPrice) <= Number(formPrice)) {
      showAlert("Price Error", "Original price should be higher than the current price.");
      return;
    }

    const formData = new FormData();
    formData.append("userId", user.id); 
    formData.append("name", formName.trim());
    formData.append("brand", formBrand.trim() || "Generic");
    formData.append("description", formDescription.trim() || "");
    formData.append("price", formPrice.trim());
    formData.append("stock", formStock.trim());
    formData.append("location", formLocation.trim() || "");
    formData.append("categoryId", formCategoryId!);

    if (formOriginalPrice.trim()) {
      formData.append("originalPrice", formOriginalPrice.trim());
    }

    if (isEditing && selectedInventoryId) {
      formData.append("inventoryId", selectedInventoryId);
    }

    if (formImage && imageChanged) {
      const isNewImage = formImage.startsWith('file://') || formImage.startsWith('blob:');
      
      if (isNewImage) {
        try {
          if (formImage.startsWith('blob:')) {
            const response = await fetch(formImage);
            const blob = await response.blob();
            const filename = `image-${Date.now()}.jpg`;
            const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
            formData.append("image", file as any);
          } else {
            const filename = formImage.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            formData.append("image", {
              uri: formImage,
              name: filename,
              type: type,
            } as any);
          }
        } catch (error) {
          showAlert("Error", "Failed to process image");
          return;
        }
      }
    }

    try {
      const url = isEditing 
        ? `${BASE_URL}/api/picker/inventory/update` 
        : `${BASE_URL}/api/picker/inventory`;

      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setModalVisible(false);
        await queryClient.invalidateQueries({ queryKey: ["/api/picker/inventory"] });
        await queryClient.refetchQueries({ queryKey: ["/api/picker/inventory", user?.id] });
        showAlert("Success", isEditing ? "Product Updated!" : "Product Added!");
        
        setFormName("");
        setFormBrand("");
        setFormDescription("");
        setFormPrice("");
        setFormOriginalPrice("");
        setFormStock("");
        setFormLocation("");
        setFormCategoryId(null);
        setFormImage(null);
        setImageChanged(false);
      } else {
        showAlert("Error", result.error || "Save failed");
      }
    } catch (err) {
      showAlert("Error", "Server connection failed");
    }
  };

  const handleDeleteProduct = (id: string) => {
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const url = `${BASE_URL}/api/picker/inventory/${itemToDelete}?userId=${user?.id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const responseText = await res.text();
      
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/picker/inventory"] });
        await queryClient.refetchQueries({ queryKey: ["/api/picker/inventory", user?.id] });
        showAlert("Success", "Item removed from inventory");
      } else {
        const error = responseText ? JSON.parse(responseText) : { error: "Unknown error" };
        showAlert("Error", error.error || "Delete failed");
      }
    } catch (err) { 
      showAlert("Error", "Network error. Please try again."); 
    } finally {
      setDeleteModalVisible(false);
      setItemToDelete(null);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    if (!user?.id) return;

    const url = nextStatus === "picking"
      ? `${BASE_URL}/api/orders/${orderId}/take`
      : `${BASE_URL}/api/orders/${orderId}/pack`;

    const body = nextStatus === "picking"
      ? { userId: user.id, role: "picker" }
      : { userId: user.id };

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      showAlert("Error", err.error || "Update failed");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["/api/picker/dashboard", user?.id] });
  };

  return (
    <ThemedView style={styles.container}>
      {/* ✅ IMPROVED GRADIENT HEADER */}
      <LinearGradient
        colors={['#FFD700', '#FFA500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerContent}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>Store Operations</ThemedText>
            <View style={styles.storeInfo}>
              <Feather name="map-pin" size={14} color="rgba(0,0,0,0.7)" />
              <ThemedText style={styles.storeName}>
                {dashboard?.store?.name || "Loading..."}
              </ThemedText>
            </View>
          </View>
          
          {/* ✅ IMPROVED ICON BUTTONS WITH LABELS */}
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <View style={styles.iconCircle}>
                <Feather name="bell" size={22} color="#FFD700" />
              </View>
              <ThemedText style={styles.buttonLabel}>Alerts</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleLogout}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#ff4444' }]}>
                <Feather name="log-out" size={22} color="white" />
              </View>
              <ThemedText style={styles.buttonLabel}>Logout</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ IMPROVED TABS */}
        <View style={styles.tabContainer}>
          <Pressable 
            onPress={() => setActiveTab("orders")} 
            style={[styles.tab, activeTab === "orders" && styles.activeTab]}
          >
            <Feather name="package" size={18} color={activeTab === "orders" ? "#FFD700" : "rgba(0,0,0,0.5)"} />
            <ThemedText style={[styles.tabText, activeTab === "orders" && styles.activeTabText]}>
              Orders
            </ThemedText>
          </Pressable>
          
          <Pressable 
            onPress={() => setActiveTab("inventory")} 
            style={[styles.tab, activeTab === "inventory" && styles.activeTab]}
          >
            <Feather name="box" size={18} color={activeTab === "inventory" ? "#FFD700" : "rgba(0,0,0,0.5)"} />
            <ThemedText style={[styles.tabText, activeTab === "inventory" && styles.activeTabText]}>
              Inventory
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={invLoading || dashLoading} onRefresh={onRefresh} />}
      >
        {activeTab === "inventory" ? (
          <>
            <View style={styles.searchContainer}>
              <Feather name="search" size={18} color={theme.textSecondary} />
              <TextInput 
                placeholder="Find product..." 
                style={[styles.searchInput, { color: theme.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => openEditModal()}>
              <Feather name="plus" size={18} color="white" />
              <ThemedText style={styles.addBtnText}>Add Store Item</ThemedText>
            </TouchableOpacity>

            {invLoading ? (
              <ActivityIndicator size="large" color="#FFD700" />
            ) : filteredInventory.length > 0 ? (
              <Card style={styles.inventoryListCard}>
                {filteredInventory.map(item => (
                  <InventoryItemRow key={item.id} item={item} onEdit={openEditModal} onDelete={handleDeleteProduct}/>
                ))}
              </Card>
            ) : (
              <View style={styles.centeredContent}><ThemedText>No items found</ThemedText></View>
            )}
          </>
        ) : (
          <View>
            {dashLoading ? (
              <ActivityIndicator size="large" color="#FFD700" />
            ) : ordersToDisplay.length > 0 ? (
              ordersToDisplay.map((order: any) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onUpdateStatus={handleUpdateOrderStatus}
                  storeName={dashboard?.store?.name || "Store"}
                  userId={user?.id || ""}
                />
              ))
            ) : (
              <View style={styles.centeredContent}>
                <Feather name="package" size={50} color="#ccc" />
                <ThemedText style={{ marginTop: 10, color: theme.textSecondary }}>No active orders</ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals remain the same */}
      <Modal visible={modalVisible} animationType="slide">
        <ThemedView style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">{isEditing ? "Edit Item" : "New Product"}</ThemedText>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>Category *</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryArea}>
              {Array.isArray(categories) && categories.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  onPress={() => setFormCategoryId(cat.id)}
                  style={[styles.categoryChip, formCategoryId === cat.id && { backgroundColor: theme.primary }]}
                >
                  <ThemedText style={[styles.chipText, formCategoryId === cat.id && { color: "white" }]}>
                    {cat.name}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {formImage ? (
                <Image source={{ uri: formImage }} style={styles.fullImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Feather name="camera" size={40} color="#ccc" />
                  <ThemedText style={{ marginTop: 8, color: '#999' }}>Tap to add image</ThemedText>
                </View>
              )}
            </TouchableOpacity>

            <ThemedText style={styles.label}>Product Name *</ThemedText>
            <TextInput style={[styles.input, { color: theme.text }]} value={formName} onChangeText={setFormName} placeholder="Fresh Milk" />

            <ThemedText style={styles.label}>Brand</ThemedText>
            <TextInput style={[styles.input, { color: theme.text }]} value={formBrand} onChangeText={setFormBrand} placeholder="Brand name" />

            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput style={[styles.input, { color: theme.text, height: 60 }]} value={formDescription} onChangeText={setFormDescription} multiline placeholder="Details..." />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>Price (Rp) *</ThemedText>
                <TextInput style={[styles.input, { color: theme.text }]} value={formPrice} onChangeText={setFormPrice} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <ThemedText style={styles.label}>Old Price</ThemedText>
                <TextInput style={[styles.input, { color: theme.text }]} value={formOriginalPrice} onChangeText={setFormOriginalPrice} keyboardType="numeric" placeholder="Optional" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.label}>Stock *</ThemedText>
                <TextInput style={[styles.input, { color: theme.text }]} value={formStock} onChangeText={setFormStock} keyboardType="numeric" placeholder="0" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <ThemedText style={styles.label}>Location</ThemedText>
                <TextInput style={[styles.input, { color: theme.text }]} value={formLocation} onChangeText={setFormLocation} placeholder="Aisle 1" />
              </View>
            </View>

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveProduct}>
              <ThemedText style={styles.saveBtnText}>{isEditing ? "Update Item" : "Save Item"}</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        </ThemedView>
      </Modal>

      <CustomAlertModal
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />

      <Modal transparent visible={deleteModalVisible} animationType="fade">
        <Pressable style={styles.alertOverlay} onPress={() => setDeleteModalVisible(false)}>
          <View style={styles.alertContainer}>
            <ThemedText type="h3" style={styles.alertTitle}>Delete Item</ThemedText>
            <ThemedText style={styles.alertMessage}>Remove this item from your store inventory?</ThemedText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={[styles.alertButton, { backgroundColor: '#ddd', flex: 1 }]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <ThemedText style={[styles.alertButtonText, { color: '#333' }]}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.alertButton, { backgroundColor: '#e74c3c', flex: 1 }]}
                onPress={confirmDelete}
              >
                <ThemedText style={styles.alertButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function InventoryItemRow({ item, onEdit, onDelete }: { item: InventoryItem; onEdit: (item: InventoryItem) => void; onDelete: (id: string) => void; }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.inventoryRow, { borderBottomColor: theme.border }]}>
      <Image source={{ uri: getImageUrl(item.product.image) }} style={styles.inventoryImg} />
      <View style={styles.inventoryInfo}>
        <ThemedText type="body" style={{ fontWeight: '600' }}>
          {item.product.name}
        </ThemedText>
        <ThemedText type="caption">Stock: {item.stockCount} | Rp {item.product.price}</ThemedText>
      </View>
      <TouchableOpacity style={styles.iconBtn} onPress={() => onDelete(item.id)}>
        <Feather name="trash-2" size={18} color="#e74c3c" />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.editBtnSmall, { backgroundColor: theme.primary + "15" }]} onPress={() => onEdit(item)}>
        <Feather name="edit-2" size={16} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#000', marginBottom: 4 },
  storeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeName: { fontSize: 14, color: 'rgba(0,0,0,0.7)' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  headerButton: { alignItems: 'center' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  buttonLabel: { fontSize: 11, fontWeight: '600', color: '#000', marginTop: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#FFD700' },
  tabText: { fontSize: 15, color: 'rgba(0,0,0,0.5)', fontWeight: '500' },
  activeTabText: { color: '#000', fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
  searchInput: { flex: 1, height: 45, marginLeft: 10 },
  addBtn: { flexDirection: 'row', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFD700' },
  addBtnText: { color: '#000', fontWeight: 'bold', marginLeft: 8 },
  inventoryListCard: { paddingHorizontal: 10 },
  inventoryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  inventoryImg: { width: 45, height: 45, borderRadius: 8, backgroundColor: '#f0f0f0' },
  inventoryInfo: { flex: 1, marginLeft: 12 },
  iconBtn: { padding: 8, marginRight: 4 },
  editBtnSmall: { padding: 8, borderRadius: 8 },
  centeredContent: { alignItems: 'center', marginTop: 50 },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  categoryArea: { marginBottom: 15 },
  categoryChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  chipText: { fontSize: 13 },
  imagePicker: { height: 140, backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 15, overflow: 'hidden' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 8 },
  row: { flexDirection: 'row' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 25, marginBottom: 40 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  orderCard: { padding: 15, marginBottom: 15 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  orderPrice: { fontWeight: 'bold', fontSize: 16 },
  actionBtn: { flexDirection: 'row', padding: 12, borderRadius: 8, marginTop: 15, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertContainer: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '90%', maxWidth: 320, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  alertTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  alertMessage: { fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' },
  alertButton: { backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' },
  alertButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
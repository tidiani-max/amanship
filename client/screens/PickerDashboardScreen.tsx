import React, { useState, useMemo } from "react";
import { 
  View, StyleSheet, ScrollView, RefreshControl, 
  Pressable, Switch, Alert, TextInput, Modal, Image, TouchableOpacity, ActivityIndicator 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/lib/image-url"; 
import { Spacing } from "@/constants/theme";

// --- CONFIGURATION ---
const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN!;

// --- INTERFACES ---
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

/**
 * Clean Order Card Component (Picker Only)
 */
function OrderCard({ order, onUpdateStatus }: { order: any; onUpdateStatus: (id: string, nextStatus: string) => void }) {
  const { theme } = useTheme();
  
  const orderId = order?.id ? order.id.slice(0, 8) : "N/A";
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

  return (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <ThemedText type="h3">Order #{orderId}</ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Status: <ThemedText type="caption" style={{ color: theme.primary, fontWeight: 'bold' }}>{status.toUpperCase()}</ThemedText>
          </ThemedText>
        </View>
        <ThemedText style={styles.orderPrice}>Rp {total}</ThemedText>
      </View>
      
      {nextStatus !== "" && (
        <TouchableOpacity 
          style={[
            styles.actionBtn, 
            { backgroundColor: status === "picking" ? "#2ecc71" : theme.primary }
          ]}
          onPress={() => onUpdateStatus(order.id, nextStatus)}
        >
          <Feather name={icon} size={16} color="white" />
          <ThemedText style={styles.actionBtnText}>{buttonText}</ThemedText>
        </TouchableOpacity>
      )}
    </Card>
  );
}

export default function PickerDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // --- STATE ---
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

  // --- QUERIES ---
const { data: categories = [] } = useQuery<Category[]>({
  queryKey: ["/api/categories"],
  queryFn: async () => {
    const res = await fetch(`${BASE_URL}/api/categories`);
    const json = await res.json();

    // ✅ normalize backend response
    if (Array.isArray(json)) return json;
    if (Array.isArray(json.categories)) return json.categories;
    if (Array.isArray(json.data)) return json.data;

    console.warn("⚠️ Unexpected categories response:", json);
    return [];
  }
});


  const { data: inventory, isLoading: invLoading, refetch: refetchInv } = useQuery<InventoryItem[]>({
    queryKey: ["/api/picker/inventory", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/picker/inventory?userId=${user?.id || 'demo-picker'}`);
      return res.json();
    }
  });

  const { data: dashboard, isLoading: dashLoading, refetch: refetchDash } = useQuery({
    queryKey: ["/api/picker/dashboard", user?.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/picker/dashboard?userId=${user?.id || 'demo-picker'}`);
      return res.json();
    }
  });

  // --- MEMOS ---
  const ordersToDisplay = useMemo(() => {
  if (!dashboard?.orders) return [];
  return [
    ...(dashboard.orders.pending || []),
    ...(dashboard.orders.active || []),
    ...(dashboard.orders.packed || []), // ✅ REQUIRED
  ];
}, [dashboard]);


  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(item => 
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventory, searchQuery]);

  // --- HANDLERS ---
  const onRefresh = async () => {
    await Promise.all([refetchInv(), refetchDash()]);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setFormImage(result.assets[0].uri);
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
    }
    setModalVisible(true);
  };

  const handleSaveProduct = async () => {
  // 1. Check if user is null immediately
  if (!user || !user.id) {
    Alert.alert("Error", "You must be logged in to save products.");
    return;
  }

  // 2. Local validation for required fields
  if (!formName.trim() || !formPrice.trim() || !formStock.trim() || !formCategoryId) {
    Alert.alert("Missing Fields", "Please fill in all required fields (*) and select a category.");
    return;
  }

  const formData = new FormData();

  // We use ?? "" (nullish coalescing) to guarantee a string is passed
  formData.append("userId", user.id); 
  formData.append("name", formName);
  formData.append("brand", formBrand || "Generic");
  formData.append("description", formDescription || "");
  formData.append("price", formPrice);
  formData.append("originalPrice", formOriginalPrice || "");
  formData.append("stock", formStock);
  formData.append("location", formLocation || "");
  
  // Fixes the 'null is not assignable to string | Blob' error
  formData.append("categoryId", formCategoryId ?? "");

  if (isEditing && selectedInventoryId) {
    formData.append("inventoryId", selectedInventoryId);
  }

  if (formImage && formImage.startsWith('file://')) {
    // @ts-ignore - React Native FormData requires an object for files
    formData.append("image", { 
      uri: formImage, 
      name: "photo.jpg", 
      type: "image/jpeg" 
    });
  }

  try {
    const url = isEditing 
      ? `${BASE_URL}/api/picker/inventory/update` 
      : `${BASE_URL}/api/picker/inventory`;

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      setModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ["/api/picker/inventory"] });
      Alert.alert("Success", isEditing ? "Product Updated" : "Product Added");
    } else {
      const result = await response.json();
      Alert.alert("Error", result.error || "Save failed");
    }
  } catch (err) {
    Alert.alert("Error", "Server connection failed");
  }
};

  const handleDeleteProduct = async (id: string) => {
    Alert.alert("Delete Item", "Remove this from your store inventory?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            const res = await fetch(`${BASE_URL}/api/picker/inventory/${id}?userId=${user?.id}`, { method: 'DELETE' });
            if (res.ok) {
              queryClient.invalidateQueries({ queryKey: ["/api/picker/inventory"] });
              Alert.alert("Deleted", "Item removed.");
            }
          } catch (err) { Alert.alert("Error", "Action failed."); }
        }
      }
    ]);
  };

const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
  if (!user?.id) return;

  const url =
    nextStatus === "picking"
      ? `${BASE_URL}/api/orders/${orderId}/take`
      : `${BASE_URL}/api/orders/${orderId}/pack`;

  const body =
    nextStatus === "picking"
      ? { userId: user.id, role: "picker" }
      :{ userId: user.id };

  const response = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    Alert.alert("Error", err.error || "Update failed");
    return;
  }

  queryClient.invalidateQueries({ queryKey: ["/api/picker/dashboard"] });
};



  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="h2">Store Ops</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>
              📍 {dashboard?.store?.name || "Loading..."}
            </ThemedText>
          </View>
          <Switch value={true} />
        </View>

        <View style={styles.tabContainer}>
          <Pressable onPress={() => setActiveTab("orders")} style={[styles.tab, activeTab === "orders" && { borderBottomColor: theme.primary }]}>
            <ThemedText style={[styles.tabText, activeTab === "orders" ? { color: theme.primary, fontWeight: '700' } : { color: theme.textSecondary }]}>Orders</ThemedText>
          </Pressable>
          <Pressable onPress={() => setActiveTab("inventory")} style={[styles.tab, activeTab === "inventory" && { borderBottomColor: theme.primary }]}>
            <ThemedText style={[styles.tabText, activeTab === "inventory" ? { color: theme.primary, fontWeight: '700' } : { color: theme.textSecondary }]}>Inventory</ThemedText>
          </Pressable>
        </View>
      </View>

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

            <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={() => openEditModal()}>
              <Feather name="plus" size={18} color="white" />
              <ThemedText style={styles.addBtnText}>Add Store Item</ThemedText>
            </TouchableOpacity>

            {invLoading ? (
              <ActivityIndicator size="large" color={theme.primary} />
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
              <ActivityIndicator size="large" color={theme.primary} />
            ) : ordersToDisplay.length > 0 ? (
              ordersToDisplay.map((order: any) => (
                <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateOrderStatus} />
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

      <Modal visible={modalVisible} animationType="slide">
        <ThemedView style={[styles.modalContent, { paddingTop: insets.top + 20 }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">{isEditing ? "Edit Item" : "New Product"}</ThemedText>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.label}>Category</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryArea}>
              {Array.isArray(categories) && categories.map(cat => (
  <TouchableOpacity 
    key={cat.id} 
    onPress={() => setFormCategoryId(cat.id)}
    style={[
      styles.categoryChip,
      formCategoryId === cat.id && { backgroundColor: theme.primary }
    ]}
  >
    <ThemedText
      style={[
        styles.chipText,
        formCategoryId === cat.id && { color: "white" }
      ]}
    >
      {cat.name}
    </ThemedText>
  </TouchableOpacity>
))}

            </ScrollView>

            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {formImage ? <Image source={{ uri: formImage }} style={styles.fullImage} /> : <View style={styles.imagePlaceholder}><Feather name="camera" size={40} color="#ccc" /></View>}
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
    </ThemedView>
  );
}

function InventoryItemRow({ item, onEdit, onDelete }: { item: InventoryItem; onEdit: (item: InventoryItem) => void; onDelete: (id: string) => void; }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.inventoryRow, { borderBottomColor: theme.border }]}>
       <Image source={{ uri: getImageUrl(item.product.image) }} style={styles.inventoryImg} />
       <View style={styles.inventoryInfo}>
         {/* CHANGE: Changed type to "body" and added fontWeight: '600' */}
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
  headerContainer: { backgroundColor: 'white', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tabContainer: { flexDirection: 'row' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 16 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
  searchInput: { flex: 1, height: 45, marginLeft: 10 },
  addBtn: { flexDirection: 'row', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
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
  actionBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 }
});
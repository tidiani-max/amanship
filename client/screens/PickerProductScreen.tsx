import React, { useState } from 'react';
import { 
  View, Text, Image, TouchableOpacity, FlatList, 
  Modal, TextInput, StyleSheet, Alert, ActivityIndicator, ScrollView, RefreshControl 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from "@expo/vector-icons";
import { getImageUrl } from "../lib/image-url"; 
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// --- TYPES ---
interface Product {
  id?: string | number; 
  name: string;
  price: number;
  image?: string;
}

export default function PickerProductScreen() {
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  
  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImage, setFormImage] = useState<string | null | undefined>(null);

  // --- REAL-TIME DATA FETCHING ---
  const { 
    data: products = [], 
    isLoading, 
    refetch, 
    isRefetching 
  } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/products`);
      if (!response.ok) throw new Error("Could not load products.");
      return response.json();
    },
    refetchInterval: 5000, 
  });

  // --- PICK IMAGE HANDLER ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Updated to fix deprecation
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setFormImage(result.assets[0].uri);
    }
  };

  // --- SAVE MUTATION ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const baseUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/picker/inventory`;
      const url = isEditing ? `${baseUrl}/update` : baseUrl;
      const method = 'POST'; 

      const formData = new FormData();
      
      if (isEditing && selectedId) {
        formData.append("inventoryId", selectedId.toString());
      }
      
      // Note: Ensure "1" is a valid user ID in your database
      // Find this line and change "1" to "demo-picker"
formData.append("userId", "demo-picker"); 
formData.append("name", formName);
formData.append("price", formPrice);
formData.append("stock", "100"); // Let's set it to 100 to be safe
formData.append("brand", "Generic");
formData.append("categoryId", "1");

      // Binary upload logic (Web & Mobile)
      if (formImage && (formImage.startsWith('file://') || formImage.startsWith('blob:') || formImage.startsWith('data:'))) {
        try {
          const response = await fetch(formImage);
          const blob = await response.blob();
          formData.append("image", blob, "photo.jpg");
        } catch (e) {
          console.error("Blob conversion failed:", e);
        }
      }

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Save failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/picker/inventory"] });
      Alert.alert("Success", isEditing ? "Product Updated" : "Product Added");
      setModalVisible(false);
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message);
    }
  });

  const openModal = (product?: Product) => {
    if (product) {
      setIsEditing(true);
      setSelectedId(product.id ?? null);
      setFormName(product.name);
      setFormPrice(product.price.toString());
      setFormImage(product.image || null);
    } else {
      setIsEditing(false);
      setSelectedId(null);
      setFormName("");
      setFormPrice("");
      setFormImage(null);
    }
    setModalVisible(true);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Inventory</Text>
          <Text style={styles.subHeader}>Real-time Sync Active</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal()}>
          <Feather name="plus" size={20} color="black" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={products}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#FFD700" />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image 
              source={{ uri: getImageUrl(item.image) }} 
              style={styles.img} 
              key={item.image} // Force refresh image if path changes
            />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.price}>Rp {Number(item.price).toLocaleString('id-ID')}</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => openModal(item)}>
                <Feather name="edit-2" size={12} color="#666" style={{marginRight: 4}} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ marginTop: 50, alignItems: 'center' }}>
            <Feather name="box" size={50} color="#ccc" />
            <Text style={{ color: '#999', marginTop: 10 }}>No products found</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide">
        <ScrollView contentContainerStyle={styles.modalScroll}>
          <View style={styles.modalHeader}>
             <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="black" />
             </TouchableOpacity>
             <Text style={styles.modalTitle}>{isEditing ? "Edit Product" : "New Product"}</Text>
             <View style={{width: 24}} /> 
          </View>
          
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {formImage ? (
              <Image 
                source={{ 
                  uri: (formImage.startsWith('file://') || formImage.startsWith('blob:') || formImage.startsWith('data:')) 
                    ? formImage 
                    : getImageUrl(formImage) 
                }} 
                style={styles.previewImg} 
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Feather name="camera" size={40} color="#ccc" />
                <Text style={{color: '#999', marginTop: 8}}>Tap to upload photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Product Name</Text>
          <TextInput 
            style={styles.input} 
            value={formName} 
            onChangeText={setFormName} 
            placeholder="e.g. Indomie Goreng" 
          />

          <Text style={styles.label}>Price (Rp)</Text>
          <TextInput 
            style={styles.input} 
            value={formPrice} 
            onChangeText={setFormPrice} 
            keyboardType="numeric" 
            placeholder="e.g. 3500" 
          />

          <TouchableOpacity 
            onPress={() => saveMutation.mutate()} 
            style={[styles.saveBtn, { opacity: saveMutation.isPending ? 0.7 : 1 }]}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Save Product</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => setModalVisible(false)} 
            style={styles.cancelBtn}
          >
            <Text style={{color: '#666'}}>Discard Changes</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 },
  header: { fontSize: 24, fontWeight: 'bold' },
  subHeader: { color: '#666', fontSize: 12 },
  addButton: { flexDirection: 'row', backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, alignItems: 'center', elevation: 2 },
  addButtonText: { marginLeft: 5, fontWeight: 'bold' },
  card: { flexDirection: 'row', backgroundColor: 'white', padding: 12, borderRadius: 12, marginBottom: 12, alignItems: 'center', elevation: 2 },
  img: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#f0f0f0' },
  info: { flex: 1, marginLeft: 15 },
  name: { fontSize: 16, fontWeight: 'bold' },
  price: { color: '#666', marginBottom: 8, fontSize: 14 },
  editBtn: { flexDirection: 'row', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#f0f0f0', alignItems: 'center' },
  editBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
  modalScroll: { padding: 25, paddingBottom: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  imagePicker: { width: '100%', height: 220, backgroundColor: '#f0f0f0', borderRadius: 15, marginBottom: 25, overflow: 'hidden', borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  previewImg: { width: '100%', height: '100%' },
  label: { fontWeight: '600', marginBottom: 8, color: '#333' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 14, borderRadius: 10, marginBottom: 20 },
  saveBtn: { backgroundColor: '#000', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  cancelBtn: { padding: 15, alignItems: 'center', marginTop: 10 }
});
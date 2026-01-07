import React, { useState, useRef } from "react";
import { 
  View, StyleSheet, FlatList, TextInput, Pressable, 
  KeyboardAvoidingView, Platform, Linking, Image, Alert, ActivityIndicator 
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

export default function ChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const route = useRoute<ChatRouteProp>();
  const { orderId } = route.params;
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const { data: orderDetails } = useQuery({
    queryKey: ["order-chat-details", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}`);
      return res.json();
    },
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", orderId],
    queryFn: async () => {
      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/orders/${orderId}/messages`);
      return res.json();
    },
    refetchInterval: 3000,
  });

  const sendMessage = useMutation({
  mutationFn: async ({ content, type = "text" }: { content: string; type?: "text" | "image" }) => {
    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("senderId", user?.id || "");
    formData.append("type", type);
    
    if (type === "text") {
      formData.append("content", content);
    } else {
      if (Platform.OS === 'web') {
        // Fix for Web/Mac: Fetch the blob from the URI first
        const response = await fetch(content);
        const blob = await response.blob();
        formData.append("file", blob, "photo.jpg");
      } else {
        // For Mobile
        // @ts-ignore
        formData.append("file", { 
          uri: content, 
          name: 'photo.jpg', 
          type: 'image/jpeg' 
        });
      }
    }

    const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/messages`, {
      method: "POST",
      body: formData,
      // IMPORTANT: Do NOT set 'Content-Type' header manually when using FormData
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(errorText);
    }
    return res.json();
  },
  onSuccess: () => {
    setMessage("");
    queryClient.invalidateQueries({ queryKey: ["messages", orderId] });
  },
  onError: (error) => {
    console.error("Upload failed:", error);
    Alert.alert("Upload Error", "Server rejected the request. check terminal.");
  }
});

const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Needed", "Allow camera access in settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      // result.assets[0].uri is the correct way to get the path
      sendMessage.mutate({ content: result.assets[0].uri, type: "image" });
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      // We use the string "images" which is safe for all versions
      mediaTypes: "images" as any, 
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      sendMessage.mutate({ content: result.assets[0].uri, type: "image" });
    }
  };

  const handleCall = () => {
    const phone = user?.role === 'driver' ? orderDetails?.customerPhone : orderDetails?.driverPhone;
    if (phone) Linking.openURL(`tel:${phone}`);
    else Alert.alert("Error", "Phone number not found.");
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.backgroundDefault }]}>
        <View>
          <ThemedText type="h3">Order Support</ThemedText>
          <ThemedText style={{ color: theme.textSecondary, fontSize: 12 }}>ID: {orderId.slice(-6)}</ThemedText>
        </View>
        <Pressable onPress={handleCall} style={[styles.callCircle, { backgroundColor: theme.primary }]}>
          <Feather name="phone" size={20} color="white" />
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, isMe ? [styles.myBubble, {backgroundColor: theme.primary}] : styles.theirBubble]}>
              {item.type === "image" ? (
                <Image source={{ uri: item.content }} style={styles.imageMsg} />
              ) : (
                <ThemedText style={{ color: isMe ? "white" : theme.text }}>{item.content}</ThemedText>
              )}
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { backgroundColor: theme.backgroundDefault, borderTopColor: theme.border }]}>
        <Pressable onPress={handleCamera} style={styles.actionBtn}>
          <Feather name="camera" size={24} color={theme.primary} />
        </Pressable>
        <Pressable onPress={handleGallery} style={styles.actionBtn}>
          <Feather name="image" size={24} color={theme.textSecondary} />
        </Pressable>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundRoot, color: theme.text }]}
          placeholder="Message..."
          value={message}
          onChangeText={setMessage}
        />
        <Pressable 
          onPress={() => message.trim() && sendMessage.mutate({ content: message, type: "text" })}
          style={[styles.sendBtn, { backgroundColor: theme.primary }]}
        >
          {sendMessage.isPending ? <ActivityIndicator color="white" /> : <Feather name="send" size={18} color="white" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  callCircle: { 
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    // FIX: Using non-deprecated shadow styles
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 
  },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#E9E9EB', borderBottomLeftRadius: 2 },
  imageMsg: { width: 200, height: 200, borderRadius: 10 },
  inputRow: { flexDirection: 'row', padding: 12, alignItems: 'center', borderTopWidth: 1 },
  actionBtn: { padding: 8 },
  input: { flex: 1, marginHorizontal: 8, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 25, fontSize: 16 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }
});
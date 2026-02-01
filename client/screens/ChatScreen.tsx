import React, { useState, useRef } from "react";
import { 
  View, StyleSheet, FlatList, TextInput, Pressable, 
  KeyboardAvoidingView, Platform, Linking, Image, Alert, ActivityIndicator 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather, FontAwesome5 } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ChatRouteProp = RouteProp<RootStackParamList, "Chat">;

const BRAND_PURPLE = "#6338f2";

export default function ChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const route = useRoute<ChatRouteProp>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
          const response = await fetch(content);
          const blob = await response.blob();
          formData.append("file", blob, "photo.jpg");
        } else {
          // @ts-ignore
          formData.append("file", { uri: content, name: 'photo.jpg', type: 'image/jpeg' });
        }
      }

      const res = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN}/api/messages`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: async () => {
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["messages", orderId] });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const handleCall = () => {
    const phone = user?.role === 'driver' ? orderDetails?.customerPhone : orderDetails?.driverPhone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  const chatPartnerName = user?.role === 'driver' ? orderDetails?.customerName : orderDetails?.driverName;

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F8F9FE' }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* PROFESSIONAL HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="chevron-left" size={28} color="#1e293b" />
        </Pressable>
        
        <View style={styles.partnerInfo}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarText}>
              {chatPartnerName?.charAt(0) || "P"}
            </ThemedText>
          </View>
          <View>
            <ThemedText style={styles.partnerName}>{chatPartnerName || "Partner"}</ThemedText>
            <ThemedText style={styles.partnerStatus}>Active now</ThemedText>
          </View>
        </View>

        <Pressable onPress={handleCall} style={styles.callBtn}>
          <Feather name="phone" size={20} color={BRAND_PURPLE} />
        </Pressable>
      </View>

      {/* MESSAGES */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, isMe ? styles.myBubble : styles.theirBubble]}>
              {item.type === "image" ? (
                <Image
                  source={{ uri: item.content.startsWith("http") ? item.content : `${process.env.EXPO_PUBLIC_DOMAIN}${item.content}` }}
                  style={styles.imageMsg}
                />
              ) : (
                <ThemedText style={[styles.msgText, { color: isMe ? "white" : "#1e293b" }]}>
                  {item.content}
                </ThemedText>
              )}
            </View>
          );
        }}
      />

      {/* INPUT AREA */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.inputWrapper}>
          <Pressable onPress={() => {/* handleCamera */}} style={styles.attachBtn}>
            <Feather name="plus" size={22} color="#64748b" />
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Pressable 
            onPress={() => message.trim() && sendMessage.mutate({ content: message, type: "text" })}
            style={[styles.sendBtn, { backgroundColor: message.trim() ? BRAND_PURPLE : '#e2e8f0' }]}
            disabled={!message.trim()}
          >
            <Feather name="send" size={18} color="white" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: { padding: 4 },
  partnerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  avatar: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: BRAND_PURPLE + '20', 
    justifyContent: 'center', alignItems: 'center', marginRight: 10 
  },
  avatarText: { color: BRAND_PURPLE, fontWeight: 'bold', fontSize: 16 },
  partnerName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  partnerStatus: { fontSize: 11, color: '#10b981', fontWeight: '600' },
  callBtn: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center' 
  },
  messagesList: { padding: 20, paddingBottom: 40 },
  bubble: { 
    paddingHorizontal: 16, paddingVertical: 12, 
    borderRadius: 20, marginBottom: 12, maxWidth: '80%' 
  },
  myBubble: { 
    alignSelf: 'flex-end', backgroundColor: BRAND_PURPLE, 
    borderBottomRightRadius: 4, shadowColor: BRAND_PURPLE, 
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 2 
  },
  theirBubble: { 
    alignSelf: 'flex-start', backgroundColor: 'white', 
    borderBottomLeftRadius: 4, shadowColor: '#000', 
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 
  },
  msgText: { fontSize: 15, lineHeight: 20 },
  imageMsg: { width: 220, height: 220, borderRadius: 15 },
  inputContainer: { 
    backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9' 
  },
  inputWrapper: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#f8fafc', borderRadius: 25, 
    paddingHorizontal: 8, paddingVertical: 4 
  },
  attachBtn: { padding: 8 },
  input: { flex: 1, paddingHorizontal: 12, fontSize: 15, maxHeight: 100, color: '#1e293b' },
  sendBtn: { 
    width: 38, height: 38, borderRadius: 19, 
    justifyContent: 'center', alignItems: 'center', marginLeft: 4 
  }
});
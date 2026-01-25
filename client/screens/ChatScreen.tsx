import React, { useState, useRef } from "react";
import { 
  View, StyleSheet, FlatList, TextInput, Pressable, 
  KeyboardAvoidingView, Platform, Linking, Image, Alert, ActivityIndicator 
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
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
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      return res.json();
    },
    onSuccess: async () => {
      setMessage("");
      await queryClient.invalidateQueries({ queryKey: ["messages", orderId] });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
      // Fix for Android: disable editing UI to avoid the missing controls issue
      ...(Platform.OS === 'android' && { allowsEditing: false })
    });
    if (!result.canceled) {
      sendMessage.mutate({ content: result.assets[0].uri, type: "image" });
    }
  };

  const handleGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any, 
      allowsEditing: true,
      quality: 0.7,
      // Fix for Android: disable editing UI to avoid the missing controls issue
      ...(Platform.OS === 'android' && { allowsEditing: false })
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={{ flex: 1 }}>
        {/* Fixed Header with Safe Area */}
        <View style={[
          styles.header, 
          { 
            borderBottomColor: theme.border, 
            backgroundColor: theme.cardBackground,
            paddingTop: insets.top + 12,
          }
        ]}>
          <Pressable 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          
          {/* Fixed: Give proper width constraints for text container */}
          <View style={styles.headerTextContainer}>
            <ThemedText type="h3" numberOfLines={1}>Order Support</ThemedText>
            <ThemedText 
              style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}
              numberOfLines={1}
            >
              ID: {orderId.slice(-6)}
            </ThemedText>
          </View>
          
          <Pressable 
            onPress={handleCall} 
            style={[styles.callCircle, { backgroundColor: theme.primary }]}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <Feather name="phone" size={20} color="white" />
          </Pressable>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: insets.bottom + 8 }
          ]}
          onContentSizeChange={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }}
          renderItem={({ item }) => {
            const isMe = item.senderId === user?.id;
            return (
              <View style={[
                styles.bubble, 
                isMe ? [styles.myBubble, { backgroundColor: theme.primary }] : [styles.theirBubble, { backgroundColor: theme.backgroundDefault }]
              ]}>
                {item.type === "image" && item.content ? (
                  <Image
                    source={{ 
                      uri: item.content.startsWith("http")
                        ? item.content
                        : `${process.env.EXPO_PUBLIC_DOMAIN}${item.content}` 
                    }}
                    style={styles.imageMsg}
                    resizeMode="cover"
                  />
                ) : (
                  <ThemedText style={{ color: isMe ? "white" : theme.text }}>
                    {item.content}
                  </ThemedText>
                )}
              </View>
            );
          }}
        />

        {/* Input Row with Safe Area */}
        <View style={[
          styles.inputRow, 
          { 
            backgroundColor: theme.cardBackground, 
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 8,
          }
        ]}>
          <Pressable 
            onPress={handleCamera} 
            style={styles.actionBtn}
            android_ripple={{ color: theme.primary + '20', borderless: true, radius: 24 }}
          >
            <Feather name="camera" size={22} color={theme.primary} />
          </Pressable>
          <Pressable 
            onPress={handleGallery} 
            style={styles.actionBtn}
            android_ripple={{ color: theme.textSecondary + '20', borderless: true, radius: 24 }}
          >
            <Feather name="image" size={22} color={theme.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <TextInput
              style={[
                styles.input, 
                { 
                  backgroundColor: theme.backgroundRoot, 
                  color: theme.text,
                  borderColor: theme.border
                }
              ]}
              placeholder="Message..."
              placeholderTextColor={theme.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
            />
          </View>
          <Pressable 
            onPress={() => message.trim() && sendMessage.mutate({ content: message, type: "text" })}
            style={[
              styles.sendBtn, 
              { 
                backgroundColor: message.trim() ? theme.primary : theme.textSecondary + '40',
                opacity: message.trim() ? 1 : 0.5
              }
            ]}
            disabled={!message.trim() || sendMessage.isPending}
            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {sendMessage.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Feather name="send" size={18} color="white" />
            )}
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
    paddingBottom: 16,
    minHeight: 80,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1000,
  },
  backButton: {
    padding: 4,
  },
  // Fixed: Proper container for header text with flex and margin
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    minHeight: 44,
  },
  callCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    flexShrink: 0,
  },
  messagesList: {
    padding: 16,
    paddingTop: 16,
    flexGrow: 1
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  myBubble: { 
    alignSelf: 'flex-end', 
    borderBottomRightRadius: 4 
  },
  theirBubble: { 
    alignSelf: 'flex-start', 
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  imageMsg: { 
    width: 220, 
    height: 220, 
    borderRadius: 12 
  },
  inputRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 12,
    paddingTop: 12,
    alignItems: 'flex-end', 
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  actionBtn: { 
    padding: 10,
    marginBottom: 4
  },
  input: { 
    marginHorizontal: 8,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    borderRadius: 22,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    lineHeight: 20
  },
  sendBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2
  }
});
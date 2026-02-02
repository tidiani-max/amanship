import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useCart } from '@/context/CartContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
}

interface GroceryChatBotProps {
  visible: boolean;
  onClose: () => void;
  availableProducts: Array<{
    id: string;
    name: string;
    brand: string;
    price: number;
    category: string;
  }>;
}

export function GroceryChatBot({ visible, onClose, availableProducts }: GroceryChatBotProps) {
  const { theme } = useTheme();
  const { addToCart } = useCart();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "👋 Hi! I'm your AI grocery assistant. Tell me what you want to cook, and I'll help you find ingredients!\n\nTry saying:\n• \"I want to make pasta carbonara\"\n• \"I need ingredients for chicken curry\"\n• \"What can I make with eggs and rice?\"",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, visible]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build product catalog for AI
      const productCatalog = availableProducts
        .map((p) => `${p.name} (${p.brand}) - ${p.category} - ID: ${p.id}`)
        .join('\n');

      // ✅ FIXED: Call YOUR backend API instead of Anthropic directly
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_DOMAIN}/api/chatbot/grocery-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userMessage: userMessage.content,
            productCatalog: productCatalog,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.content || 'Sorry, I had trouble understanding that.';

      // Parse products from response
      let productsToAdd: Array<{ id: string; name: string; quantity: number }> = [];
      const match = aiResponse.match(/PRODUCTS_TO_ADD:\s*(\[.*\])/s);
      
      if (match) {
        try {
          productsToAdd = JSON.parse(match[1]);
        } catch (e) {
          console.error('Failed to parse products:', e);
        }
      }

      // Clean response (remove PRODUCTS_TO_ADD section)
      const cleanResponse = aiResponse.split('PRODUCTS_TO_ADD:')[0].trim();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanResponse,
        products: productsToAdd,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '❌ Sorry, I encountered an error. Please try again!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProducts = (products: Array<{ id: string; name: string; quantity: number }>) => {
    products.forEach((item) => {
      const product = availableProducts.find((p) => p.id === item.id);
      if (product) {
        addToCart(product as any, item.quantity);
      }
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View 
          style={[
            styles.header, 
            { 
              backgroundColor: theme.cardBackground,
              paddingTop: insets.top + 16,
            }
          ]}
        >
          <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.headerIcon}>
            <Feather name="message-circle" size={20} color="white" />
          </LinearGradient>
          <ThemedText style={styles.headerTitle}>AI Grocery Assistant</ThemedText>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}
            >
              <ThemedText
                style={[
                  styles.messageText,
                  msg.role === 'user' && { color: 'white' },
                ]}
              >
                {msg.content}
              </ThemedText>

              {/* Add to Cart Button */}
              {msg.products && msg.products.length > 0 && (
                <Pressable
                  style={styles.addToCartBtn}
                  onPress={() => handleAddProducts(msg.products!)}
                >
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.addToCartGradient}
                  >
                    <Feather name="shopping-cart" size={16} color="white" />
                    <ThemedText style={styles.addToCartText}>
                      Add {msg.products.length} items to cart
                    </ThemedText>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          ))}

          {loading && (
            <View style={styles.loadingBubble}>
              <ActivityIndicator color="#6366f1" />
              <ThemedText style={styles.loadingText}>AI is thinking...</ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Input - Fixed to bottom with safe area */}
        <View 
          style={[
            styles.inputContainer, 
            { 
              backgroundColor: theme.cardBackground,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
            }
          ]}
        >
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundDefault }]}
            placeholder="What do you want to cook?"
            placeholderTextColor={theme.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={200}
          />
          <Pressable
            onPress={handleSend}
            disabled={loading || !input.trim()}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          >
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.sendBtnGradient}>
              <Feather name="send" size={18} color="white" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  addToCartBtn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  addToCartText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sendBtn: {
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
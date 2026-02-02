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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useCart } from '@/context/CartContext';
import { LinearGradient } from 'expo-linear-gradient';

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
      scrollRef.current?.scrollToEnd({ animated: true });
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
      // Build product catalog for Claude
      const productCatalog = availableProducts
        .map((p) => `${p.name} (${p.brand}) - ${p.category} - ID: ${p.id}`)
        .join('\n');

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `You are a helpful grocery shopping assistant. The user wants to cook something.

Available products in store:
${productCatalog}

User request: "${userMessage.content}"

Your task:
1. Understand what they want to cook
2. Find matching products from the available list
3. Respond in a friendly, helpful way
4. At the end, provide a JSON list of products to add to cart

Format your response like this:
[Your friendly message here]

PRODUCTS_TO_ADD:
[{"id": "product-id", "name": "Product Name", "quantity": 1}]

Rules:
- Only suggest products that exist in the available list
- Be realistic about quantities (e.g., 1 milk, 2 eggs means 2 cartons)
- If a product isn't available, suggest alternatives
- Keep quantities reasonable for one recipe`,
            },
          ],
        }),
      });

      const data = await response.json();
      const aiResponse = data.content?.[0]?.text || 'Sorry, I had trouble understanding that.';

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

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
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

      {/* Input */}
      <View style={[styles.inputContainer, { backgroundColor: theme.cardBackground }]}>
        <TextInput
          style={[styles.input, { color: theme.text }]}
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
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    padding: 4,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
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
    fontSize: 14,
    lineHeight: 20,
  },
  addToCartBtn: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addToCartText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does 15-minute delivery work?",
    answer: "We have multiple dark stores located across the city. When you place an order, it's prepared at the nearest store and delivered by our riders within 15 minutes.",
  },
  {
    question: "What if my order is late?",
    answer: "If your order arrives after the estimated time, contact our support team and we'll make it right with a voucher for your next order.",
  },
  {
    question: "Can I cancel my order?",
    answer: "You can cancel your order within 2 minutes of placing it. After that, our team has already started preparing your items.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept GoPay, OVO, ShopeePay, DANA, BCA Virtual Account, and Credit/Debit cards through Midtrans.",
  },
  {
    question: "What if an item is out of stock?",
    answer: "We'll notify you immediately and suggest similar alternatives. You can approve the replacement or skip the item.",
  },
];

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contactSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Need Help?
        </ThemedText>
        <View style={styles.contactOptions}>
          <Pressable style={[styles.contactOption, { backgroundColor: theme.primary + "20" }]}>
            <View style={[styles.contactIcon, { backgroundColor: theme.primary }]}>
              <Feather name="message-circle" size={20} color={theme.buttonText} />
            </View>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Live Chat
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Available 24/7
            </ThemedText>
          </Pressable>
          
          <Pressable style={[styles.contactOption, { backgroundColor: theme.secondary + "20" }]}>
            <View style={[styles.contactIcon, { backgroundColor: theme.secondary }]}>
              <Feather name="phone" size={20} color="#FFFFFF" />
            </View>
            <ThemedText type="body" style={{ fontWeight: "500" }}>
              Call Us
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              021-1500-888
            </ThemedText>
          </Pressable>
        </View>
      </View>
      
      <View style={styles.faqSection}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Frequently Asked Questions
        </ThemedText>
        
        {faqs.map((faq, index) => (
          <Card key={index} style={styles.faqCard}>
            <Pressable
              style={styles.faqHeader}
              onPress={() => handleToggle(index)}
            >
              <ThemedText type="body" style={[styles.faqQuestion, { flex: 1 }]}>
                {faq.question}
              </ThemedText>
              <Feather
                name={expandedIndex === index ? "chevron-up" : "chevron-down"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
            {expandedIndex === index ? (
              <View style={styles.faqAnswer}>
                <ThemedText type="body" style={{ color: theme.textSecondary }}>
                  {faq.answer}
                </ThemedText>
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  contactSection: {
    marginBottom: Spacing.xxl,
  },
  contactOptions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  contactOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  faqSection: {},
  faqCard: {
    marginBottom: Spacing.md,
    padding: 0,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  faqQuestion: {
    fontWeight: "500",
  },
  faqAnswer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: 0,
  },
});

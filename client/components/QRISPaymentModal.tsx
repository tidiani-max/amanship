import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface QRISPaymentModalProps {
  visible: boolean;
  orderTotal: number;
  onConfirmPayment: () => void;
  onCancel: () => void;
}

export default function QRISPaymentModal({
  visible,
  orderTotal,
  onConfirmPayment,
  onCancel,
}: QRISPaymentModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirmPayment = () => {
    Alert.alert(
      'Confirm Payment Received',
      `Did the customer pay Rp ${orderTotal.toLocaleString('id-ID')} via QRIS?`,
      [
        {
          text: 'Not Yet',
          style: 'cancel',
        },
        {
          text: 'Yes, Paid',
          onPress: () => {
            setIsConfirming(true);
            onConfirmPayment();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Feather name="smartphone" size={24} color="#4f46e5" />
            </View>
            <ThemedText style={styles.title}>QRIS Payment</ThemedText>
            <ThemedText style={styles.subtitle}>
              Show this QR code to customer
            </ThemedText>
          </View>

          {/* Amount Display */}
          <View style={styles.amountContainer}>
            <ThemedText style={styles.amountLabel}>Total Amount</ThemedText>
            <ThemedText style={styles.amount}>
              Rp {orderTotal.toLocaleString('id-ID')}
            </ThemedText>
          </View>

          {/* QR Code */}
          <View style={styles.qrContainer}>
            <Image
              source={require('@/assets/qris-code.png')} 
              style={styles.qrCode}
              resizeMode="contain"
            />
            <ThemedText style={styles.qrInstruction}>
              Customer can scan with any payment app:
            </ThemedText>
            <View style={styles.appLogos}>
              <ThemedText style={styles.appName}>GoPay</ThemedText>
              <ThemedText style={styles.appName}>OVO</ThemedText>
              <ThemedText style={styles.appName}>DANA</ThemedText>
              <ThemedText style={styles.appName}>ShopeePay</ThemedText>
              <ThemedText style={styles.appName}>Bank Apps</ThemedText>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.steps}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>1</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>
                Customer opens their payment app
              </ThemedText>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>2</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>
                Customer scans this QR code
              </ThemedText>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>3</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>
                Wait for payment confirmation
              </ThemedText>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <ThemedText style={styles.stepNumberText}>4</ThemedText>
              </View>
              <ThemedText style={styles.stepText}>
                Tap "Confirm Payment" below
              </ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleConfirmPayment}
              disabled={isConfirming}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.confirmButton}
              >
                {isConfirming ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={20} color="#fff" />
                    <ThemedText style={styles.confirmButtonText}>
                      Confirm Payment Received
                    </ThemedText>
                  </>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={onCancel} style={styles.cancelButton}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  amountContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#4f46e5',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  qrCode: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  qrInstruction: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
  },
  appLogos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  appName: {
    fontSize: 10,
    color: '#4f46e5',
    fontWeight: '700',
    backgroundColor: '#ede9fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  steps: {
    marginBottom: 24,
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 8,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  cancelButton: {
    alignItems: 'center',
    padding: 12,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700',
  },
});
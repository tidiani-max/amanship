import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";

interface ReceiptProps {
  order: {
    id: string;
    orderNumber: string;
    total: number;
    deliveryFee: number;
    createdAt: string;
    items: Array<{
      name: string;
      quantity: number;
      image?: string;
    }>;
  };
  customer: {
    name?: string;
    phone?: string;
    email?: string;
  };
  storeName: string;
}

export function OrderReceipt({ order, customer, storeName }: ReceiptProps) {
  const generateHTML = () => {
    const itemsHTML = order.items
      .map(
        (item, index) => `
        <tr>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee;">${index + 1}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; font-weight: 600;">${item.name}</td>
          <td style="padding: 12px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        </tr>
      `
      )
      .join("");

    const subtotal = order.total - order.deliveryFee;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 40px 20px;
              background: white;
            }
            .receipt {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border: 2px solid #000;
              padding: 30px;
            }
            .header {
              text-align: center;
              border-bottom: 3px double #000;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .logo {
              font-size: 32px;
              font-weight: 900;
              color: #2563eb;
              letter-spacing: 2px;
              margin-bottom: 8px;
            }
            .tagline {
              font-size: 13px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 14px;
            }
            .info-label {
              color: #666;
              font-weight: 500;
            }
            .info-value {
              font-weight: 600;
              text-align: right;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th {
              background: #f5f5f5;
              padding: 12px 8px;
              text-align: left;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              border-bottom: 2px solid #000;
            }
            td {
              font-size: 14px;
            }
            .totals {
              margin-top: 25px;
              border-top: 2px solid #000;
              padding-top: 15px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 15px;
            }
            .total-row.grand {
              font-size: 20px;
              font-weight: 900;
              color: #2563eb;
              border-top: 3px double #000;
              margin-top: 10px;
              padding-top: 15px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 3px double #000;
              font-size: 12px;
              color: #666;
            }
            .footer-message {
              font-weight: 600;
              color: #2563eb;
              margin-bottom: 8px;
            }
            @media print {
              body { padding: 0; }
              .receipt { border: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Header -->
            <div class="header">
              <div class="logo">AMANMART</div>
              <div class="tagline">Quick Delivery • Fresh Products</div>
            </div>

            <!-- Order Info -->
            <div class="section">
              <div class="section-title">Order Information</div>
              <div class="info-row">
                <span class="info-label">Order Number:</span>
                <span class="info-value">#${order.orderNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Order ID:</span>
                <span class="info-value">${order.id.slice(0, 12).toUpperCase()}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${new Date(order.createdAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Store:</span>
                <span class="info-value">${storeName}</span>
              </div>
            </div>

            <!-- Customer Info -->
            <div class="section">
              <div class="section-title">Customer Details</div>
              ${
                customer.name
                  ? `<div class="info-row">
                <span class="info-label">Name:</span>
                <span class="info-value">${customer.name}</span>
              </div>`
                  : ""
              }
              ${
                customer.phone
                  ? `<div class="info-row">
                <span class="info-label">Phone:</span>
                <span class="info-value">${customer.phone}</span>
              </div>`
                  : ""
              }
              ${
                customer.email
                  ? `<div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${customer.email}</span>
              </div>`
                  : ""
              }
            </div>

            <!-- Items -->
            <div class="section">
              <div class="section-title">Order Items</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40px;">#</th>
                    <th>Product</th>
                    <th style="width: 80px; text-align: center;">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </div>

            <!-- Totals -->
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>Rp ${subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div class="total-row">
                <span>Delivery Fee:</span>
                <span>Rp ${order.deliveryFee.toLocaleString("id-ID")}</span>
              </div>
              <div class="total-row grand">
                <span>TOTAL:</span>
                <span>Rp ${order.total.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <div class="footer-message">Thank you for your order!</div>
              <div>AmanMart - Your trusted quick delivery service</div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    try {
      const html = generateHTML();

      if (Platform.OS === "web") {
        // Web: Open in new window for printing
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
      } else {
        // Mobile: Generate PDF and share
        const { uri } = await Print.printToFileAsync({ html });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            UTI: ".pdf",
            mimeType: "application/pdf",
          });
        } else {
          alert("Sharing is not available on this device");
        }
      }
    } catch (error) {
      console.error("Print error:", error);
      alert("Failed to print receipt");
    }
  };

  return (
    <Button onPress={handlePrint} variant="outline" style={styles.button}>
      🖨️ Print Receipt
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: 12,
  },
});
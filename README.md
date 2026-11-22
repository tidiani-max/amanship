<div align="center">
  <h1>🛵 Amanship</h1>
  <p>
    <strong>AI-Powered Quick-Commerce & Grocery Delivery Platform</strong>
  </p>
  <p>
    End-to-end rapid grocery & daily-essentials delivery ecosystem featuring an <strong>AI Shopping Assistant (<em>Belanja</em>)</strong>, <strong>Computer-Vision Product Expiry Prediction</strong>, <strong>Real-Time Driver & Picker Logistics</strong>, and <strong>Xendit / QRIS Payments</strong>.
  </p>

  <p>
    <img src="https://img.shields.io/badge/Frontend-React_Native_%7C_Expo_%7C_TypeScript-3178C6?style=for-the-badge&logo=expo&logoColor=white" alt="Frontend" />
    <img src="https://img.shields.io/badge/Backend-Node.js_%7C_Express_%7C_TypeScript-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Backend" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL_%7C_Drizzle_ORM-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="Database" />
    <img src="https://img.shields.io/badge/Payments-Xendit_%7C_QRIS-0066FF?style=for-the-badge" alt="Payments" />
    <img src="https://img.shields.io/badge/AI-Computer_Vision_%7C_Voice_%26_Chat-FF6F00?style=for-the-badge" alt="AI" />
  </p>
</div>

---

## 📖 Overview

**Amanship** is a full-stack quick-commerce and grocery delivery platform designed for fast urban fulfillment. Beyond standard ordering and delivery tracking, Amanship integrates applied AI across the entire retail lifecycle—helping customers shop effortlessly via a conversational *belanja* assistant and voice ordering, helping store pickers fulfill orders with voice guidance, and predicting product expiration dates using computer vision to reduce perishable waste.

---

## ✨ Key Features

### 🛒 Customer Experience
- 🤖 **AI Shopping Assistant (*Belanja* Chatbot)** — Conversational grocery assistant that helps users discover items, build carts, and get product recommendations (`GroceryChatBot`)
- 🎙️ **Voice Ordering** — Hands-free grocery ordering and confirmation workflow (`VoiceOrderModal`, `VoiceConfirmScreen`)
- 💳 **Xendit & QRIS Payments** — Seamless digital checkout supporting instant QRIS codes, payment verification, and automated receipts (`QRISPaymentModal`, `OrderReceipt`)
- 📍 **Pin-Drop Delivery & Live Map Tracking** — Interactive map pin confirmation (`ConfirmPinMapScreen`) and real-time courier location tracking (`LiveDriverMap`, `OrderTrackingScreen`)
- 🌐 **Multi-Language Support** — Built-in localization and auto-translation (`LanguageContext`, `auto-translate`)

### 🧠 AI & Store Intelligence
- 📸 **Computer-Vision Expiry Prediction Engine** — Automated shelf-life and expiration-date prediction (`expiryEngine.ts`) paired with batch/product tracking (`productTracking.ts`) and scheduled freshness alerts (`scheduledJobs.ts`)
- 🎧 **Voice Picking Assistant** — Guided warehouse/store item picking for faster order preparation (`VoicePickingAssistant`)

### 🏪 Multi-Role Operations Dashboards
- **Customer App:** Browse categories, apply vouchers, track live orders, and chat with support
- **Store Owner & Admin Dashboards:** Manage catalog inventory, pricing, vouchers, store availability, and analytics (`AdminDashboardScreen`, `StoreOwnerDashboardScreen`, `OwnerDashboardScreen`)
- **Picker Dashboard:** Real-time order queue and voice-assisted item picking (`PickerDashboardScreen`)
- **Driver Dashboard:** Live GPS navigation, delivery status updates, and earnings tracking (`DriverDashboardScreen`, `StaffEarningsDashboard`)

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────────────────────┐
│                   Client Applications (Expo / React Native)          │
│   Customer App  •  Store Owner / Admin  •  Picker  •  Driver App     │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ REST API & Real-Time Updates
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Backend API Server (Node.js / Express)              │
│                                                                      │
│  ┌──────────────────────────┐    ┌────────────────────────────────┐  │
│  │ Core Commerce & Logistics│    │ AI & Automation Services       │  │
│  │ • Orders & Cart Engine   │    │ • Belanja AI Chatbot           │  │
│  │ • Live Driver GPS & Maps │    │ • CV Product Expiry Engine     │  │
│  │ • Xendit / QRIS Webhooks │    │ • Scheduled Freshness Jobs     │  │
│  │ • Auth, Cache & Security │    │ • Push & In-App Notifications  │  │
│  └──────────────────────────┘    └───────────────┬────────────────┘  │
└──────────────────────────────────────────────────┼───────────────────┘
                                                   │
                        ┌──────────────────────────┴──────────┐
                        ▼                                     ▼
             ┌─────────────────────┐               ┌─────────────────────┐
             │     PostgreSQL      │               │  External Services  │
             │   (Drizzle ORM)     │               │  Xendit • GrabMaps  │
             └─────────────────────┘               └─────────────────────┘

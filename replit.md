# KilatGo - 15-Minute Grocery Delivery App

## Overview
KilatGo is a 15-minute grocery delivery app for the Indonesian market featuring voice ordering, real-time tracking, and a clean Indonesian-friendly design inspired by GoJek and Tokopedia.

## Current State: MVP Frontend Prototype

### Features Implemented
- **Home Screen**: Category browsing, Today's Deals, Popular Items
- **Voice Order Modal**: Web Speech API for voice-to-text ordering (64px FAB)
- **Product Browsing**: Categories with products, add to cart functionality
- **Shopping Cart**: Item management, quantity controls, checkout flow
- **Mocked Payment**: GoPay, OVO, ShopeePay, DANA, BCA VA, Credit Card
- **Order Tracking**: Animated mocked rider location with status updates
- **Account Screen**: User profile placeholder

### Design System
- **Primary Colors**: Lightning Yellow (#FFD700), Fresh Blue (#4A90E2)
- **Style**: Indonesian-friendly, flat design, minimal shadows, rounded corners (12-20px)
- **Navigation**: 4-tab structure (Home, Orders, Voice FAB, Account)

## Technical Stack
- **Frontend**: React Native / Expo (Mobile-first)
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM (not yet connected)
- **UI Framework**: React Navigation 7+, iOS 26 Liquid Glass design

## Key Files
- `client/constants/theme.ts` - Design system colors and spacing
- `client/navigation/MainTabNavigator.tsx` - Tab navigation structure
- `client/screens/HomeScreen.tsx` - Main home screen
- `client/screens/VoiceOrderModal.tsx` - Voice ordering interface
- `client/screens/CartScreen.tsx` - Shopping cart and checkout
- `client/screens/OrderTrackingScreen.tsx` - Mocked rider tracking
- `client/data/mockData.ts` - Product, category, and promotion data
- `design_guidelines.md` - Full design guidelines

## Important Notes
- Currently using in-memory/mock data for prototype demonstration
- Voice ordering uses Web Speech API (web platform only)
- Rider tracking is simulated with static updates
- Payment flow is mocked (no real Midtrans integration yet)

## Project Structure
```
client/           # Expo/React Native mobile app
  screens/        # Screen components
  components/     # Reusable UI components
  navigation/     # Navigation structure
  data/           # Mock data
  constants/      # Theme and design tokens
server/           # Express backend
  routes.ts       # API routes
shared/           # Shared types between client/server
```

## Development
- Run: `npm run all:dev`
- Expo on port 8081, Express on port 5000
- Scan QR code in Replit URL bar menu for Expo Go testing

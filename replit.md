# ZendO - 15-Minute Grocery Delivery App

## Overview
ZendO is a 15-minute grocery delivery app for the Indonesian market featuring voice ordering, real-time tracking, store management, and a clean Indonesian-friendly design inspired by GoJek and Tokopedia.

## Current State: MVP with Full Backend Integration

### Features Implemented
- **Home Screen**: Category browsing, Today's Deals, Popular Items with location-aware store display
- **Voice Order Modal**: Web Speech API for voice-to-text ordering (64px FAB)
- **Voice Confirm Screen**: Review parsed voice items, add to cart (never auto-places orders)
- **Product Browsing**: Categories with products, add to cart functionality
- **Shopping Cart**: Item management, quantity controls, checkout flow
- **Checkout**: COD payment option when eligible, real API integration
- **Order Tracking**: Rider tracking with store assignment
- **Account Screen**: User profile with logout, admin dashboard access
- **Admin Dashboard**: Read-only store/staff/order metrics
- **Phone OTP Authentication**: Real OTP verification flow with 6-digit codes
- **Apple Sign-In**: Native Apple authentication (iOS only)

### Backend Features
- **Store Management**: Stores with location, COD eligibility, active status
- **Staff System**: Pickers and drivers with online/offline status
- **Store Inventory**: Products linked to stores with stock tracking
- **Order Assignment**: Nearest available store with picker/driver assignment
- **Location Services**: Haversine distance calculation for store availability
- **COD Validation**: Cash on delivery based on store settings

### Design System
- **Primary Colors**: Lightning Yellow (#FFD700), Fresh Blue (#4A90E2)
- **Style**: Indonesian-friendly, flat design, minimal shadows, rounded corners (12-20px)
- **Navigation**: 4-tab structure (Home, Orders, Voice FAB, Account)

## Technical Stack
- **Frontend**: React Native / Expo (Mobile-first)
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI Framework**: React Navigation 7+, iOS 26 Liquid Glass design

## Key Files
- `client/constants/theme.ts` - Design system colors and spacing
- `client/navigation/MainTabNavigator.tsx` - Tab navigation structure
- `client/screens/HomeScreen.tsx` - Main home screen with location banner
- `client/screens/VoiceOrderModal.tsx` - Voice ordering interface
- `client/screens/VoiceConfirmScreen.tsx` - Voice order confirmation
- `client/screens/CheckoutScreen.tsx` - Checkout with COD support
- `client/screens/AdminDashboardScreen.tsx` - Admin metrics dashboard
- `client/context/LocationContext.tsx` - Location permissions and store availability
- `server/routes.ts` - API routes including order creation and admin metrics
- `server/storeAvailability.ts` - Store availability service
- `server/storage.ts` - Database operations
- `shared/schema.ts` - Database schema (users, stores, storeStaff, storeInventory, orders)
- `design_guidelines.md` - Full design guidelines

## API Endpoints
- `GET /api/categories` - List categories
- `GET /api/products` - List products
- `GET /api/stores` - List all stores
- `GET /api/stores/available?lat=&lng=` - Check nearest available store
- `GET /api/stores/:id/staff` - Get store staff
- `POST /api/orders` - Create order with store/staff assignment
- `GET /api/admin/metrics` - Admin dashboard metrics
- `POST /api/staff/toggle-status` - Toggle staff online/offline
- `POST /api/auth/otp/send` - Send OTP to phone number
- `POST /api/auth/otp/verify` - Verify OTP and login/register
- `POST /api/auth/apple` - Apple Sign-In authentication

## Project Structure
```
client/           # Expo/React Native mobile app
  screens/        # Screen components
  components/     # Reusable UI components
  navigation/     # Navigation structure
  context/        # React contexts (LocationContext)
  constants/      # Theme and design tokens
server/           # Express backend
  routes.ts       # API routes
  storage.ts      # Database operations
  storeAvailability.ts # Store availability logic
shared/           # Shared types between client/server
  schema.ts       # Drizzle ORM database schema
```

## Development
- Run: `npm run all:dev`
- Expo on port 8081, Express on port 5000
- Scan QR code in Replit URL bar menu for Expo Go testing

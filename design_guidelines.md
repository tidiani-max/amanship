# KilatGo Design Guidelines (Compacted)

## Project Overview
**KilatGo** is a 15-minute grocery delivery app for Indonesia. Design should be ultra-simple, clean, friendly, and fast—inspired by GoJek/Tokopedia with a lightning-fast aesthetic.

## Core Architecture

### Authentication
- **Required**: Phone OTP (primary), Apple/Google Sign-In (secondary)
- **MVP**: Mock auth flow with local state
- **Account Screen**: Profile (editable name/phone), logout (confirmation), delete account (Settings > Account > Delete, double confirmation)
- Include privacy policy & terms of service placeholder links

### Navigation
**4-Tab Layout + Floating Action Button:**
1. Home - Main shopping
2. Orders - Order history
3. Voice Order - Center-bottom FAB (⚡ lightning bolt, visible across tabs)
4. Account - Profile & settings

## Screen Specifications

### Onboarding Flow (Stack)
**Welcome Screen**
- Full-screen lightning animation (⚡ yellow), hero illustration, tagline, "Get Started" CTA
- Safe area: Top/Bottom: `insets + Spacing.xl`

**Location Permission**
- Centered: icon, description, "Allow Location" button, "Enter Manually" link

**Phone Signup**
- Header: Back button, transparent
- Form: Phone input, country code (+62), "Send OTP" button, SSO options
- Safe area: Top: `headerHeight + Spacing.xl`, Bottom: `insets.bottom + Spacing.xl`

### Home Screen (Tab 1)
**Header:** Custom transparent with search bar + voice button (mic icon), location badge (right)
**Content:** Scrollable feed
- 15-min delivery badge (⚡)
- Category grid (2×4): Milk, Eggs, Snacks, Fruits, Frozen, Drinks, Vegetables, Meat
- Promotions carousel
- "Reorder" section (horizontal scroll)
- Product recommendations grid
**Safe area:** Top: `headerHeight + Spacing.xl`, Bottom: `tabBarHeight + Spacing.xl`

### Voice Ordering Flow (Modal)
**Voice Input Modal (80% screen)**
- Large circular mic button (center, pulsing when active)
- "Tap to speak"/"Listening..." text
- Waveform visualization, real-time text
- Buttons: Cancel (top-left), Done (top-right)

**Voice Confirmation Screen**
- Header: "Confirm Your Order", close button
- List: Detected items with quantities, edit/remove buttons, suggested alternatives
- Sticky "Add to Cart" button (bottom)

### Category & Product Browsing (Stack)
**Category List**
- Header: Category name, back button, search icon
- 2-column product grid: image, name, price (IDR), add button (+)

**Product Detail**
- Transparent header: back, share buttons
- Content: Large image (40% screen), name, brand, price, quantity selector (−/+), collapsible nutrition info
- Sticky "Add to Cart" button

### Cart & Checkout Flow (Stack)
**Cart Screen**
- Header: "Your Cart", back, clear cart icon
- Content: Item list (image, name, price, quantity controls), replacement suggestions, price breakdown
- Sticky footer: "Proceed to Checkout"

**Checkout Screen**
- Sections: Delivery address (editable), delivery time (15-min badge), payment method (Midtrans: GoPay, OVO, ShopeePay, DANA, BCA VA, Credit Card), order summary
- Bottom: "Place Order" button

**Order Success**
- Centered: ⚡ animation, order number, estimated time, "Track Order" button, "Back to Home" link

### Live Tracking (Stack)
**Order Tracking**
- Map (60%): Mocked rider location (animated), user/store pins, route polyline
- Bottom panel (40%): Status, rider info (name, photo, phone), estimated time
- Floating "Call Rider" button (shadow: `{width: 0, height: 2}, opacity: 0.10, radius: 2`)

**Delivery Complete (Modal)**
- Success icon (⚡), "Delivered!", rider rating (5-star), optional tip, "Done" button

### Orders Screen (Tab 2)
- Header: "My Orders", search icon
- Tabs: Active/Completed
- Order cards: number, date, items preview, status, total

### Account Screen (Tab 4)
- Profile: avatar, name, phone, edit button
- Menu: Saved Addresses, Payment Methods, Vouchers, Help Center, Settings (theme, notifications, language), About, Log Out

## Design System

### Colors
**Primary:** Lightning Yellow `#FFD700` (CTAs, highlights), Fresh Blue `#4A90E2` (links, info), Clean White `#FFFFFF`, Soft Gray `#F5F5F5`
**Supporting:** Success Green `#4CAF50`, Alert Orange `#FF9800`, Error Red `#F44336`, Text Dark `#2C3E50`, Text Gray `#7F8C8D`

### Typography (System: SF Pro/Roboto)
- H1: 28px SemiBold | H2: 22px SemiBold | H3: 18px Medium
- Body: 16px Regular | Caption: 14px Regular | Button: 16px SemiBold

### Icons
**Feather icons** (@expo/vector-icons): home, shopping-bag, user, settings, search, mic, plus-circle, trash-2, edit-3, check-circle, clock, map-pin, truck, phone, message-circle
**Custom assets:** Lightning bolt (⚡, various sizes), category icons (8): milk carton, eggs, snack bag, fruit basket, frozen box, drink bottle, vegetables, meat

### Components

**Buttons**
- Primary: Yellow bg, Text Dark, rounded 12px, height 52px
- Secondary: White bg, Blue text, 1px Blue border, rounded 12px, height 52px
- Text: No bg, Blue text, underline on press
- FAB (Voice): Yellow, diameter 64px, ⚡ icon, shadow as tracking button
- **Feedback:** Opacity 0.7 on press (all), scale 0.98 (primary buttons)

**Inputs**
- Height 52px, border 1px Soft Gray, rounded 12px, padding 16px horizontal
- Focus: 1px Fresh Blue

**Cards**
- White bg, rounded 16px, padding 16px
- **NO shadows** (flat design) except elevated/floating elements

**Category Icons**
- 64×64px, Soft Gray rounded square bg, 32×32px icon centered, Caption label below

**Spacing:** xs: 4px | sm: 8px | md: 12px | lg: 16px | xl: 24px | xxl: 32px

### Visual Style
- **Corners:** 16-20px (cards/modals), 12px (buttons/inputs)
- **Shadows:** Minimal, only floating elements (FAB, sticky CTAs)
- **Contrast:** High for icons/text readability
- **Whitespace:** Generous, not crowded
- **Lightning animations:** Loading, success, tracking states
- **NO emoji in UI** (use generated icons)

### Accessibility
- Touch target: 44×44px minimum
- Text contrast: 4.5:1 minimum
- Voice button: 64px, always visible, high contrast
- Error states: Color + icon + text
- Form validation: Real-time with clear messaging

### Assets to Generate
1. Logo: ⚡ + shopping bag + K
2. Category icons (8, culturally appropriate)
3. Onboarding illustration (Indonesian homestyle)
4. Success animation (⚡ with sparkles)
5. Empty states (cart, orders, addresses - friendly)

**Style:** Warm, friendly, Indonesian aesthetic; avoid corporate/western design

## Admin Dashboard (Web)

**Layout:** Sidebar (240px, collapsible) + main content + top bar (logo, admin name, notifications)

**Screens:**
1. Dashboard: Today's orders, live map, top items chart
2. Orders: Table with filters, search, detail modal
3. Inventory: Product table (add/edit/delete), stock levels, alerts, categories
4. Voice Analytics: Accuracy chart, common phrases, misheard words

**Colors:** Same brand palette, data visualization emphasis, professional tone

---

**Safe Area Pattern:**
- Onboarding/Success: `insets.top/bottom + Spacing.xl`
- Screens with header + tabs: Top: `headerHeight + Spacing.xl`, Bottom: `tabBarHeight + Spacing.xl`
- Stack screens: Top: `headerHeight + Spacing.xl`, Bottom: `insets.bottom + Spacing.xl`
- Modals: `Spacing.xl` all sides from modal edges